-- Private, invite-only rooms for online Shogi matches.
begin;

create table public.shogi_rooms (
  id uuid primary key default gen_random_uuid(),
  room_key text not null unique check (room_key ~ '^[A-HJ-NP-Z2-9]{6}$'),
  sente_user_id text not null,
  gote_user_id text,
  game_state jsonb not null,
  revision integer not null default 0 check (revision >= 0),
  status text not null default 'waiting' check (status in ('waiting','playing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (gote_user_id is null or gote_user_id <> sente_user_id)
);
create index shogi_rooms_expiry_idx on public.shogi_rooms(expires_at);
alter table public.shogi_rooms enable row level security;
revoke all on public.shogi_rooms from public, anon, authenticated;

create function public.shogi_initial_state()
returns jsonb language plpgsql immutable security definer set search_path='' as $$
declare
 board jsonb:='[]'::jsonb; row_value jsonb; piece jsonb; kind text; side text;
 row_index integer; col_index integer;
 back_rank text[]:=array['L','N','S','G','K','G','S','N','L'];
begin
 for row_index in 0..8 loop
  row_value:='[]'::jsonb;
  for col_index in 0..8 loop
   kind:=null; side:=null;
   if row_index=0 or row_index=8 then
    kind:=back_rank[col_index+1]; side:=case when row_index=0 then 'gote' else 'sente' end;
   elsif row_index=2 or row_index=6 then
    kind:='P'; side:=case when row_index=2 then 'gote' else 'sente' end;
   elsif row_index=1 and col_index=1 then kind:='B'; side:='gote';
   elsif row_index=1 and col_index=7 then kind:='R'; side:='gote';
   elsif row_index=7 and col_index=1 then kind:='R'; side:='sente';
   elsif row_index=7 and col_index=7 then kind:='B'; side:='sente';
   end if;
   piece:=case when kind is null then 'null'::jsonb else jsonb_build_object('side',side,'kind',kind,'promoted',false) end;
   row_value:=row_value||jsonb_build_array(piece);
  end loop;
  board:=board||jsonb_build_array(row_value);
 end loop;
 return jsonb_build_object('board',board,'hands',jsonb_build_object('sente','[]'::jsonb,'gote','[]'::jsonb),'turn','sente');
end;
$$;

create function public.shogi_piece_can_move(move_board jsonb, source_row integer, source_col integer, target_row integer, target_col integer)
returns boolean language plpgsql immutable security definer set search_path='' as $$
declare
 piece jsonb; kind text; side text; promoted boolean; effective text;
 delta_row integer:=target_row-source_row; delta_col integer:=target_col-source_col;
 direction integer; shape_ok boolean:=false; slides boolean:=false;
 step_row integer; step_col integer;
begin
 if source_row not between 0 and 8 or source_col not between 0 and 8 or target_row not between 0 and 8 or target_col not between 0 and 8
  or (delta_row=0 and delta_col=0) then return false; end if;
 piece:=move_board->source_row->source_col;
 if piece is null or jsonb_typeof(piece)='null' then return false; end if;
 kind:=piece->>'kind'; side:=piece->>'side'; promoted:=coalesce((piece->>'promoted')::boolean,false);
 direction:=case when side='sente' then -1 else 1 end;
 effective:=case when promoted and kind in ('P','L','N','S') then 'G' else kind end;
 if effective='P' then shape_ok:=delta_row=direction and delta_col=0;
 elsif effective='L' then shape_ok:=delta_col=0 and delta_row*direction>0; slides:=shape_ok;
 elsif effective='N' then shape_ok:=delta_row=2*direction and abs(delta_col)=1;
 elsif effective='S' then shape_ok:=(delta_row=direction and abs(delta_col)<=1) or (delta_row=-direction and abs(delta_col)=1);
 elsif effective='G' then shape_ok:=(delta_row=direction and abs(delta_col)<=1) or (delta_row=0 and abs(delta_col)=1) or (delta_row=-direction and delta_col=0);
 elsif effective='K' then shape_ok:=abs(delta_row)<=1 and abs(delta_col)<=1;
 elsif effective='B' then
  shape_ok:=abs(delta_row)=abs(delta_col);
  slides:=shape_ok;
  if promoted and abs(delta_row)+abs(delta_col)=1 then shape_ok:=true; slides:=false; end if;
 elsif effective='R' then
  shape_ok:=(delta_row=0 or delta_col=0);
  slides:=shape_ok;
  if promoted and abs(delta_row)=1 and abs(delta_col)=1 then shape_ok:=true; slides:=false; end if;
 end if;
 if not shape_ok then return false; end if;
 if slides then
  step_row:=case when delta_row=0 then 0 else sign(delta_row) end;
  step_col:=case when delta_col=0 then 0 else sign(delta_col) end;
  source_row:=source_row+step_row; source_col:=source_col+step_col;
  while source_row<>target_row or source_col<>target_col loop
   if jsonb_typeof(move_board->source_row->source_col) is distinct from 'null' then return false; end if;
   source_row:=source_row+step_row; source_col:=source_col+step_col;
  end loop;
 end if;
 return true;
end;
$$;

create function public.shogi_is_in_check(check_board jsonb, checked_side text)
returns boolean language plpgsql immutable security definer set search_path='' as $$
declare
 king_row integer; king_col integer; row_index integer; col_index integer; piece jsonb;
begin
 king_row:=null; king_col:=null;
 for row_index in 0..8 loop for col_index in 0..8 loop
  piece:=check_board->row_index->col_index;
  if piece->>'side'=checked_side and piece->>'kind'='K' then king_row:=row_index; king_col:=col_index; end if;
 end loop; end loop;
 if king_row is null then return true; end if;
 for row_index in 0..8 loop for col_index in 0..8 loop
  piece:=check_board->row_index->col_index;
  if piece->>'side' is not null and piece->>'side'<>checked_side
    and public.shogi_piece_can_move(check_board,row_index,col_index,king_row,king_col) then return true; end if;
 end loop; end loop;
 return false;
end;
$$;

create function public.create_shogi_room(room_key text,expected_user_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller text:=public.user_id(); created public.shogi_rooms;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if room_key is null or room_key !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'Invalid room key' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles p where p.id::text=caller) then raise exception 'Profile required' using errcode='42501'; end if;
 delete from public.shogi_rooms where expires_at<=now();
 insert into public.shogi_rooms(room_key,sente_user_id,game_state) values(room_key,caller,public.shogi_initial_state()) returning * into created;
 return to_jsonb(created);
end;
$$;

create function public.join_shogi_room(target_room_key text,expected_user_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller text:=public.user_id(); selected public.shogi_rooms;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles p where p.id::text=caller) then raise exception 'Profile required' using errcode='42501'; end if;
 select * into selected from public.shogi_rooms r where r.room_key=upper(btrim(target_room_key)) and r.expires_at>now() for update;
 if not found then return null; end if;
 if caller=selected.sente_user_id then return to_jsonb(selected); end if;
 if selected.gote_user_id is null then
  update public.shogi_rooms set gote_user_id=caller,status='playing',updated_at=now() where id=selected.id returning * into selected;
 elsif selected.gote_user_id<>caller then
  raise exception 'Room is full' using errcode='55000';
 end if;
 return to_jsonb(selected);
end;
$$;

create function public.get_shogi_room(target_room_key text,expected_user_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.user_id(); selected public.shogi_rooms;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 select * into selected from public.shogi_rooms r where r.room_key=upper(btrim(target_room_key))
  and r.expires_at>now() and caller in (r.sente_user_id,r.gote_user_id);
 if not found then return null; end if;
 return to_jsonb(selected);
end;
$$;

create function public.submit_shogi_move(target_room_key text,expected_revision integer,move_action jsonb,next_state jsonb,expected_user_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 caller text:=public.user_id(); selected public.shogi_rooms; turn_side text; other_side text;
 current_board jsonb; current_hands jsonb; expected_board jsonb; expected_hands jsonb; expected_state jsonb;
 source_piece jsonb; target_piece jsonb; moved_piece jsonb; board_row jsonb; hand_row jsonb; piece jsonb;
 from_row integer; from_col integer; to_row integer; to_col integer; row_index integer;
 kind text; drop_kind text; promote boolean; old_promoted boolean; promotion_zone boolean; forced_promotion boolean;
 found_drop boolean:=false; hand_value text; new_hand jsonb:='[]'::jsonb; hand_ordinal integer;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 select * into selected from public.shogi_rooms r where r.room_key=upper(btrim(target_room_key)) and r.expires_at>now() for update;
 if not found or selected.status<>'playing' then raise exception 'Room is not active' using errcode='P0002'; end if;
 if expected_revision is distinct from selected.revision then raise exception 'Room changed' using errcode='40001'; end if;
 turn_side:=selected.game_state->>'turn';
 if (turn_side='sente' and caller<>selected.sente_user_id) or (turn_side='gote' and caller<>selected.gote_user_id) then
  raise exception 'Not your turn' using errcode='42501';
 end if;
 other_side:=case when turn_side='sente' then 'gote' else 'sente' end;
 current_board:=selected.game_state->'board'; current_hands:=selected.game_state->'hands';
 if jsonb_typeof(current_board)<>'array' or jsonb_array_length(current_board)<>9 or jsonb_typeof(move_action)<>'object'
   or jsonb_typeof(next_state)<>'object' or next_state->>'turn'<>other_side then raise exception 'Invalid move' using errcode='22023'; end if;
 expected_board:=current_board; expected_hands:=current_hands;
 to_row:=(move_action#>>'{to,row}')::integer; to_col:=(move_action#>>'{to,col}')::integer;
 if to_row not between 0 and 8 or to_col not between 0 and 8 then raise exception 'Invalid target' using errcode='22023'; end if;
 target_piece:=current_board->to_row->to_col;
 drop_kind:=move_action->>'drop';
 if drop_kind is not null then
  if drop_kind not in ('P','L','N','S','G','B','R') or jsonb_typeof(target_piece) is distinct from 'null' then raise exception 'Invalid drop' using errcode='22023'; end if;
  hand_row:=current_hands->turn_side;
  for hand_ordinal,hand_value in select ordinality::integer,value from jsonb_array_elements_text(hand_row) with ordinality loop
   if hand_value=drop_kind and not found_drop then found_drop:=true; else new_hand:=new_hand||jsonb_build_array(hand_value); end if;
  end loop;
  if not found_drop then raise exception 'Piece is not in hand' using errcode='22023'; end if;
  if (drop_kind in ('P','L') and ((turn_side='sente' and to_row=0) or (turn_side='gote' and to_row=8)))
    or (drop_kind='N' and ((turn_side='sente' and to_row<=1) or (turn_side='gote' and to_row>=7))) then raise exception 'Invalid drop rank' using errcode='22023'; end if;
  if drop_kind='P' then
   for row_index in 0..8 loop
    piece:=current_board->row_index->to_col;
    if piece->>'side'=turn_side and piece->>'kind'='P' and not coalesce((piece->>'promoted')::boolean,false) then raise exception 'Double pawn' using errcode='22023'; end if;
   end loop;
  end if;
  moved_piece:=jsonb_build_object('side',turn_side,'kind',drop_kind,'promoted',false);
  expected_board:=jsonb_set(current_board,array[to_row::text,to_col::text],moved_piece,false);
  expected_hands:=jsonb_set(current_hands,array[turn_side],new_hand,false);
 else
  from_row:=(move_action#>>'{from,row}')::integer; from_col:=(move_action#>>'{from,col}')::integer;
  if from_row not between 0 and 8 or from_col not between 0 and 8 then raise exception 'Invalid source' using errcode='22023'; end if;
  source_piece:=current_board->from_row->from_col;
  if jsonb_typeof(source_piece) is distinct from 'object' or source_piece->>'side'<>turn_side
    or target_piece->>'side'=turn_side or target_piece->>'kind'='K'
    or not public.shogi_piece_can_move(current_board,from_row,from_col,to_row,to_col) then raise exception 'Illegal move' using errcode='22023'; end if;
  kind:=source_piece->>'kind'; old_promoted:=coalesce((source_piece->>'promoted')::boolean,false);
  promote:=coalesce((move_action->>'promote')::boolean,false);
  promotion_zone:=(turn_side='sente' and (from_row<=2 or to_row<=2)) or (turn_side='gote' and (from_row>=6 or to_row>=6));
  if promote and (old_promoted or kind not in ('P','L','N','S','B','R') or not promotion_zone) then raise exception 'Invalid promotion' using errcode='22023'; end if;
  forced_promotion:=(kind in ('P','L') and ((turn_side='sente' and to_row=0) or (turn_side='gote' and to_row=8)))
    or (kind='N' and ((turn_side='sente' and to_row<=1) or (turn_side='gote' and to_row>=7)));
  if forced_promotion and not promote then raise exception 'Promotion required' using errcode='22023'; end if;
  moved_piece:=jsonb_set(source_piece,'{promoted}',to_jsonb(old_promoted or promote),true);
  expected_board:=jsonb_set(jsonb_set(current_board,array[from_row::text,from_col::text],'null'::jsonb,false),array[to_row::text,to_col::text],moved_piece,false);
  if jsonb_typeof(target_piece)='object' then
   if target_piece->>'side'=turn_side or target_piece->>'kind'='K' then raise exception 'Invalid capture' using errcode='22023'; end if;
   expected_hands:=jsonb_set(current_hands,array[turn_side],(current_hands->turn_side)||jsonb_build_array(target_piece->>'kind'),false);
  end if;
 end if;
 if public.shogi_is_in_check(expected_board,turn_side) then raise exception 'King remains in check' using errcode='22023'; end if;
 expected_state:=jsonb_build_object('board',expected_board,'hands',expected_hands,'turn',other_side);
 if next_state is distinct from expected_state then raise exception 'State does not match move' using errcode='22023'; end if;
 update public.shogi_rooms set game_state=expected_state,revision=revision+1,updated_at=now()
  where id=selected.id returning * into selected;
 return to_jsonb(selected);
end;
$$;

create function public.cleanup_shogi_rooms_for_deleted_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.shogi_rooms where sente_user_id=old.id::text or gote_user_id=old.id::text;
 return old;
end;
$$;
create trigger cleanup_shogi_rooms_after_profile_delete after delete on public.profiles
for each row execute function public.cleanup_shogi_rooms_for_deleted_profile();

revoke all on function public.shogi_initial_state() from public,anon,authenticated;
revoke all on function public.shogi_piece_can_move(jsonb,integer,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.shogi_is_in_check(jsonb,text) from public,anon,authenticated;
revoke all on function public.cleanup_shogi_rooms_for_deleted_profile() from public,anon,authenticated;
revoke all on function public.create_shogi_room(text,text) from public,anon,authenticated;
revoke all on function public.join_shogi_room(text,text) from public,anon,authenticated;
revoke all on function public.get_shogi_room(text,text) from public,anon,authenticated;
revoke all on function public.submit_shogi_move(text,integer,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_shogi_room(text,text) to authenticated;
grant execute on function public.join_shogi_room(text,text) to authenticated;
grant execute on function public.get_shogi_room(text,text) to authenticated;
grant execute on function public.submit_shogi_move(text,integer,jsonb,jsonb,text) to authenticated;
commit;
