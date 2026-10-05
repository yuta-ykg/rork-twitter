-- Discoverable, playable user-authored diagnoses for the diagnosis library and search page.
begin;

create or replace function public.search_user_diagnoses(
  search_query text default null,
  expected_user_id text default null,
  result_limit integer default 24
)
returns table(post_id uuid, diagnosis jsonb)
language plpgsql stable security definer set search_path=''
as $$
declare
 caller text:=public.user_id();
 term text:=btrim(coalesce(search_query,''));
begin
 if caller is distinct from expected_user_id and not (caller is null and expected_user_id is null) then
  raise exception 'Login required' using errcode='42501';
 end if;
 if char_length(term)>100 then
  raise exception 'Search query is too long' using errcode='22023';
 end if;
 return query
 with visible_diagnoses as (
  select distinct on (d.id)
   d.id,d.creator_id,d.title,d.description,d.outcomes,d.questions,d.created_at,link.post_id
  from public.user_diagnoses d
  join public.post_diagnosis_links link on link.diagnosis_id=d.id
  join public.posts p on p.id=link.post_id
  where public.can_view_account(caller,p.user_id::text)
    and (term='' or strpos(lower(concat_ws(' ',d.title,d.description,d.outcomes::text,d.questions::text)),lower(term))>0)
  order by d.id,link.created_at desc,link.post_id
 )
 select visible.post_id,jsonb_build_object(
  'id',visible.id,
  'creator_id',visible.creator_id,
  'title',visible.title,
  'description',visible.description,
  'outcomes',visible.outcomes,
  'questions',visible.questions,
  'result_index',null,
  'result',null
 )
 from visible_diagnoses visible
 order by visible.created_at desc,visible.id
 limit least(greatest(coalesce(result_limit,24),1),50);
end;
$$;

revoke all on function public.search_user_diagnoses(text,text,integer) from public;
grant execute on function public.search_user_diagnoses(text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
