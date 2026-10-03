-- User-authored, entertainment-only diagnoses embedded in posts.
begin;

create table public.user_diagnoses (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null,
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 160),
  outcomes jsonb not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create table public.post_diagnosis_links (
  post_id uuid primary key references public.posts(id) on delete cascade,
  diagnosis_id uuid not null references public.user_diagnoses(id) on delete cascade,
  result_index smallint check (result_index is null or result_index between 0 and 5),
  created_at timestamptz not null default now()
);
create index post_diagnosis_links_diagnosis_idx on public.post_diagnosis_links(diagnosis_id);

alter table public.user_diagnoses enable row level security;
alter table public.post_diagnosis_links enable row level security;
revoke all on public.user_diagnoses,public.post_diagnosis_links from anon,authenticated;

create or replace function public.validate_user_diagnosis(
  diagnosis_title text,
  diagnosis_description text,
  diagnosis_outcomes jsonb,
  diagnosis_questions jsonb
)
returns void language plpgsql immutable set search_path=''
as $$
declare
 outcome_count integer;
 question_record record;
 option_record record;
 option_count integer;
 result_number integer;
begin
 if char_length(btrim(coalesce(diagnosis_title,''))) not between 1 and 60
   or char_length(coalesce(diagnosis_description,''))>160
   or jsonb_typeof(diagnosis_outcomes) is distinct from 'array'
   or jsonb_typeof(diagnosis_questions) is distinct from 'array' then
  raise exception 'Invalid diagnosis' using errcode='22023';
 end if;
 outcome_count:=jsonb_array_length(diagnosis_outcomes);
 if outcome_count not between 2 and 6 or jsonb_array_length(diagnosis_questions) not between 1 and 10 then
  raise exception 'Invalid diagnosis' using errcode='22023';
 end if;
 if exists(
  select 1 from jsonb_array_elements(diagnosis_outcomes) as entries(item)
  where jsonb_typeof(item) is distinct from 'object'
    or jsonb_typeof(item->'title') is distinct from 'string'
    or char_length(btrim(coalesce(item->>'title',''))) not between 1 and 40
    or (item ? 'description' and jsonb_typeof(item->'description') is distinct from 'string')
    or char_length(coalesce(item->>'description',''))>160
 ) then
  raise exception 'Invalid diagnosis outcome' using errcode='22023';
 end if;
 for question_record in select value from jsonb_array_elements(diagnosis_questions) loop
  if jsonb_typeof(question_record.value) is distinct from 'object'
    or jsonb_typeof(question_record.value->'prompt') is distinct from 'string'
    or char_length(btrim(coalesce(question_record.value->>'prompt',''))) not between 1 and 120
    or jsonb_typeof(question_record.value->'options') is distinct from 'array' then
   raise exception 'Invalid diagnosis question' using errcode='22023';
  end if;
  option_count:=jsonb_array_length(question_record.value->'options');
  if option_count not between 2 and 6 then
   raise exception 'Invalid diagnosis question' using errcode='22023';
  end if;
  for option_record in select value from jsonb_array_elements(question_record.value->'options') loop
   if jsonb_typeof(option_record.value) is distinct from 'object'
     or jsonb_typeof(option_record.value->'text') is distinct from 'string'
     or char_length(btrim(coalesce(option_record.value->>'text',''))) not between 1 and 60
     or coalesce(option_record.value->>'result_index','') !~ '^[0-5]$' then
    raise exception 'Invalid diagnosis answer' using errcode='22023';
   end if;
   result_number:=(option_record.value->>'result_index')::integer;
   if result_number>=outcome_count then
    raise exception 'Invalid diagnosis result index' using errcode='22023';
   end if;
  end loop;
 end loop;
end;
$$;

create or replace function public.create_post_with_diagnosis(
  post_id uuid,
  post_body text,
  diagnosis_id uuid,
  diagnosis_title text,
  diagnosis_description text,
  diagnosis_outcomes jsonb,
  diagnosis_questions jsonb,
  expected_user_id text
)
returns setof public.posts language plpgsql security definer set search_path=''
as $$
declare
 caller text:=public.user_id();
 author_name text;
 author_handle text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 post_body:=btrim(post_body);
 diagnosis_title:=btrim(diagnosis_title);
 diagnosis_description:=btrim(coalesce(diagnosis_description,''));
 if post_id is null or diagnosis_id is null or char_length(coalesce(post_body,'')) not between 1 and 70 then
  raise exception 'Invalid post' using errcode='22023';
 end if;
 perform public.validate_user_diagnosis(diagnosis_title,diagnosis_description,diagnosis_outcomes,diagnosis_questions);
 select coalesce(nullif(p.name,''),'ユーザー'),coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(post_id,caller,post_body,author_name,'@'||author_handle,left(author_name,1),true,0);
 insert into public.user_diagnoses(id,creator_id,title,description,outcomes,questions)
 values(diagnosis_id,caller,diagnosis_title,diagnosis_description,diagnosis_outcomes,diagnosis_questions);
 insert into public.post_diagnosis_links(post_id,diagnosis_id) values(post_id,diagnosis_id);
 return query select p.* from public.posts p where p.id=post_id;
end;
$$;

create or replace function public.get_post_diagnoses(requested_post_ids uuid[],expected_user_id text default null)
returns table(post_id uuid,diagnosis jsonb)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is distinct from expected_user_id and not (caller is null and expected_user_id is null) then
  raise exception 'Login required' using errcode='42501';
 end if;
 if requested_post_ids is null or cardinality(requested_post_ids)=0 then return; end if;
 return query
 select link.post_id,jsonb_build_object(
  'id',diagnosis.id,
  'creator_id',diagnosis.creator_id,
  'title',diagnosis.title,
  'description',diagnosis.description,
  'outcomes',diagnosis.outcomes,
  'questions',diagnosis.questions,
  'result_index',link.result_index,
  'result',case when link.result_index is null then null else diagnosis.outcomes->link.result_index end
 )
 from public.post_diagnosis_links link
 join public.user_diagnoses diagnosis on diagnosis.id=link.diagnosis_id
 join public.posts p on p.id=link.post_id
 where link.post_id=any(requested_post_ids) and public.can_view_account(caller,p.user_id::text)
 order by link.post_id;
end;
$$;

create or replace function public.create_diagnosis_result_post(
  post_id uuid,
  post_body text,
  diagnosis_id uuid,
  result_index smallint,
  expected_user_id text
)
returns setof public.posts language plpgsql security definer set search_path=''
as $$
declare
 caller text:=public.user_id();
 author_name text;
 author_handle text;
 diagnosis_creator text;
 outcomes jsonb;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 post_body:=btrim(post_body);
 if post_id is null or diagnosis_id is null or result_index is null
   or char_length(coalesce(post_body,'')) not between 1 and 70 then
  raise exception 'Invalid diagnosis result post' using errcode='22023';
 end if;
 select d.creator_id,d.outcomes into diagnosis_creator,outcomes
 from public.user_diagnoses d where d.id=diagnosis_id for key share;
 if not found then raise exception 'Diagnosis not found' using errcode='P0002'; end if;
 if not public.can_view_account(caller,diagnosis_creator) then
  raise exception 'Diagnosis unavailable' using errcode='42501';
 end if;
 if result_index<0 or result_index>=jsonb_array_length(outcomes) then
  raise exception 'Invalid diagnosis result' using errcode='22023';
 end if;
 select coalesce(nullif(p.name,''),'ユーザー'),coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(post_id,caller,post_body,author_name,'@'||author_handle,left(author_name,1),true,0);
 insert into public.post_diagnosis_links(post_id,diagnosis_id,result_index)
 values(post_id,diagnosis_id,result_index);
 return query select p.* from public.posts p where p.id=post_id;
end;
$$;

create or replace function public.cleanup_unreferenced_user_diagnosis()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 delete from public.user_diagnoses diagnosis
 where diagnosis.id=old.diagnosis_id
   and not exists(select 1 from public.post_diagnosis_links link where link.diagnosis_id=old.diagnosis_id);
 return old;
end;
$$;
drop trigger if exists cleanup_unreferenced_user_diagnosis_after_link_delete on public.post_diagnosis_links;
create trigger cleanup_unreferenced_user_diagnosis_after_link_delete after delete on public.post_diagnosis_links
for each row execute function public.cleanup_unreferenced_user_diagnosis();

revoke all on function public.validate_user_diagnosis(text,text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.create_post_with_diagnosis(uuid,text,uuid,text,text,jsonb,jsonb,text) from public;
revoke all on function public.get_post_diagnoses(uuid[],text) from public;
revoke all on function public.create_diagnosis_result_post(uuid,text,uuid,smallint,text) from public;
revoke all on function public.cleanup_unreferenced_user_diagnosis() from public,anon,authenticated;
grant execute on function public.create_post_with_diagnosis(uuid,text,uuid,text,text,jsonb,jsonb,text) to anon,authenticated;
grant execute on function public.get_post_diagnoses(uuid[],text) to anon,authenticated;
grant execute on function public.create_diagnosis_result_post(uuid,text,uuid,smallint,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
