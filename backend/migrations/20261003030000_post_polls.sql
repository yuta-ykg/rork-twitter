-- Polls and quizzes attached to regular posts. Answers stay hidden until a response is submitted.
begin;

create table public.post_polls (
  post_id uuid primary key references public.posts(id) on delete cascade,
  kind text not null check (kind in ('poll','quiz')),
  allows_multiple boolean not null default false,
  explanation text,
  created_at timestamptz not null default now(),
  check (explanation is null or char_length(explanation) <= 280)
);

create table public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.post_polls(post_id) on delete cascade,
  position smallint not null check (position between 0 and 5),
  body text not null check (char_length(body) between 1 and 60),
  result_kind text check (result_kind in ('correct','close','incorrect')),
  feedback text check (feedback is null or char_length(feedback) <= 60),
  unique(post_id,position),
  unique(id,post_id)
);

create table public.post_poll_responses (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.post_polls(post_id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique(post_id,user_id),
  unique(id,post_id)
);

create table public.post_poll_response_options (
  response_id uuid not null,
  post_id uuid not null,
  option_id uuid not null,
  primary key(response_id,option_id),
  foreign key(response_id,post_id) references public.post_poll_responses(id,post_id) on delete cascade,
  foreign key(option_id,post_id) references public.post_poll_options(id,post_id) on delete cascade
);

create index post_poll_responses_post_idx on public.post_poll_responses(post_id,created_at);
create index post_poll_response_options_option_idx on public.post_poll_response_options(option_id);

alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_responses enable row level security;
alter table public.post_poll_response_options enable row level security;
revoke all on public.post_polls,public.post_poll_options,public.post_poll_responses,public.post_poll_response_options from anon,authenticated;

create or replace function public.get_post_polls(requested_post_ids uuid[],expected_user_id text default null)
returns table(
  post_id uuid,
  poll_kind text,
  allows_multiple boolean,
  explanation text,
  response_count bigint,
  has_responded boolean,
  options jsonb
)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is distinct from expected_user_id and not (caller is null and expected_user_id is null) then
  raise exception 'Login required' using errcode='42501';
 end if;
 if requested_post_ids is null or cardinality(requested_post_ids)=0 then return; end if;
 return query
 select poll.post_id,poll.kind,poll.allows_multiple,
  case when poll.kind='quiz' and (p.user_id::text=caller or exists(
    select 1 from public.post_poll_responses mine where mine.post_id=poll.post_id and mine.user_id=caller
  )) then poll.explanation else null end,
  (select count(*) from public.post_poll_responses total where total.post_id=poll.post_id),
  caller is not null and exists(
    select 1 from public.post_poll_responses mine where mine.post_id=poll.post_id and mine.user_id=caller
  ),
  (select jsonb_agg(jsonb_build_object(
    'id',option.id,
    'text',option.body,
    'position',option.position,
    'result',case when poll.kind='quiz' and (p.user_id::text=caller or exists(
      select 1 from public.post_poll_responses mine where mine.post_id=poll.post_id and mine.user_id=caller
    )) then option.result_kind else null end,
    'feedback',case when poll.kind='quiz' and (p.user_id::text=caller or exists(
      select 1 from public.post_poll_responses mine where mine.post_id=poll.post_id and mine.user_id=caller
    )) then option.feedback else null end,
    'vote_count',case when p.user_id::text=caller or exists(
      select 1 from public.post_poll_responses mine where mine.post_id=poll.post_id and mine.user_id=caller
    ) then (select count(*) from public.post_poll_response_options chosen where chosen.option_id=option.id) else null end,
    'selected',caller is not null and exists(
      select 1 from public.post_poll_responses mine
      join public.post_poll_response_options chosen on chosen.response_id=mine.id and chosen.post_id=mine.post_id
      where mine.post_id=poll.post_id and mine.user_id=caller and chosen.option_id=option.id
    )
  ) order by option.position) from public.post_poll_options option where option.post_id=poll.post_id)
 from public.post_polls poll
 join public.posts p on p.id=poll.post_id
 where poll.post_id=any(requested_post_ids) and public.can_view_account(caller,p.user_id::text)
 order by poll.post_id;
end;
$$;

create or replace function public.create_post_with_poll(
  post_id uuid,
  post_body text,
  poll_kind text,
  poll_allows_multiple boolean,
  poll_explanation text,
  poll_options jsonb,
  expected_user_id text
)
returns setof public.posts language plpgsql security definer set search_path=''
as $$
declare
 caller text:=public.user_id();
 author_name text;
 author_handle text;
 option_record record;
 option_text text;
 option_result text;
 option_feedback text;
 correct_count integer;
 option_count integer;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 post_body:=btrim(post_body);
 poll_explanation:=nullif(btrim(poll_explanation),'');
 if post_id is null or post_body is null or char_length(post_body) not between 1 and 70 then
  raise exception 'Invalid post' using errcode='22023';
 end if;
 if poll_kind is null or poll_kind not in ('poll','quiz') or jsonb_typeof(poll_options) is distinct from 'array' then
  raise exception 'Invalid poll' using errcode='22023';
 end if;
 option_count:=jsonb_array_length(poll_options);
 if option_count not between 2 and 6 or (poll_explanation is not null and char_length(poll_explanation)>280) then
  raise exception 'Invalid poll' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(poll_options) as entries(item)
   where jsonb_typeof(item)<>'object'
   or char_length(btrim(coalesce(item->>'text',''))) not between 1 and 60
   or (item->>'feedback' is not null and char_length(btrim(item->>'feedback'))>60)) then
  raise exception 'Invalid poll option' using errcode='22023';
 end if;
 if (select count(distinct lower(btrim(item->>'text'))) from jsonb_array_elements(poll_options) as entries(item)) <> option_count then
  raise exception 'Duplicate poll option' using errcode='22023';
 end if;
 correct_count:=(select count(*) from jsonb_array_elements(poll_options) as entries(item) where item->>'result'='correct');
 if poll_kind='quiz' and correct_count<1 then raise exception 'Quiz needs a correct answer' using errcode='22023'; end if;
 if poll_kind='quiz' and exists(select 1 from jsonb_array_elements(poll_options) as entries(item)
   where coalesce(item->>'result','') not in ('correct','close','incorrect')) then
  raise exception 'Invalid quiz result' using errcode='22023';
 end if;

 select coalesce(nullif(p.name,''),'ユーザー'),coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(post_id,caller,post_body,author_name,'@'||author_handle,left(author_name,1),true,0);
 insert into public.post_polls(post_id,kind,allows_multiple,explanation)
 values(post_id,poll_kind,coalesce(poll_allows_multiple,false) or correct_count>1,
   case when poll_kind='quiz' then poll_explanation else null end);
 for option_record in select value,ordinality from jsonb_array_elements(poll_options) with ordinality loop
  option_text:=btrim(option_record.value->>'text');
  option_result:=case when poll_kind='quiz' then option_record.value->>'result' else null end;
  option_feedback:=case when poll_kind='quiz' then nullif(btrim(option_record.value->>'feedback'),'') else null end;
  insert into public.post_poll_options(post_id,position,body,result_kind,feedback)
  values(post_id,option_record.ordinality-1,option_text,option_result,option_feedback);
 end loop;
 return query select p.* from public.posts p where p.id=post_id;
end;
$$;

create or replace function public.submit_post_poll_response(target_post_id uuid,option_ids uuid[],expected_user_id text)
returns table(
  post_id uuid,
  poll_kind text,
  allows_multiple boolean,
  explanation text,
  response_count bigint,
  has_responded boolean,
  options jsonb
)
language plpgsql security definer set search_path=''
as $$
declare
 caller text:=public.user_id();
 author_id text;
 multiple boolean;
 response_id uuid:=gen_random_uuid();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if target_post_id is null or coalesce(cardinality(option_ids),0) not between 1 and 6
   or (select count(distinct choice) from unnest(option_ids) as choices(choice)) <> cardinality(option_ids) then
  raise exception 'Invalid poll response' using errcode='22023';
 end if;
 select poll.allows_multiple,p.user_id::text into multiple,author_id
 from public.post_polls poll join public.posts p on p.id=poll.post_id
 where poll.post_id=target_post_id for update of poll;
 if not found then raise exception 'Poll not found' using errcode='P0002'; end if;
 if public.is_blocked_pair(caller,author_id) then raise exception 'Blocked account' using errcode='42501'; end if;
 if not multiple and cardinality(option_ids)<>1 then raise exception 'Choose one option' using errcode='22023'; end if;
 if (select count(*) from public.post_poll_options option where option.post_id=target_post_id and option.id=any(option_ids)) <> cardinality(option_ids) then
  raise exception 'Invalid poll option' using errcode='22023';
 end if;
 insert into public.post_poll_responses(id,post_id,user_id) values(response_id,target_post_id,caller);
 insert into public.post_poll_response_options(response_id,post_id,option_id)
 select response_id,target_post_id,choice from unnest(option_ids) as choices(choice);
 return query select * from public.get_post_polls(array[target_post_id],caller);
end;
$$;

create or replace function public.cleanup_post_poll_responses()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 delete from public.post_poll_responses response where response.user_id=old.id::text;
 return old;
end;
$$;
drop trigger if exists cleanup_post_poll_responses_on_profile_delete on public.profiles;
create trigger cleanup_post_poll_responses_on_profile_delete before delete on public.profiles
for each row execute function public.cleanup_post_poll_responses();

revoke all on function public.get_post_polls(uuid[],text) from public;
revoke all on function public.create_post_with_poll(uuid,text,text,boolean,text,jsonb,text) from public;
revoke all on function public.submit_post_poll_response(uuid,uuid[],text) from public;
revoke all on function public.cleanup_post_poll_responses() from public,anon,authenticated;
grant execute on function public.get_post_polls(uuid[],text) to anon,authenticated;
grant execute on function public.create_post_with_poll(uuid,text,text,boolean,text,jsonb,text) to anon,authenticated;
grant execute on function public.submit_post_poll_response(uuid,uuid[],text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
