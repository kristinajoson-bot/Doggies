-- Join a pack straight from the company's pack list, no code needed.
-- Packs never cross the company boundary, so any walker at the same company may join.
create or replace function public.join_pack_by_id(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_company_id();
  p public.packs;
begin
  if cid is null then raise exception 'Join your workplace first'; end if;
  select * into p from public.packs where id = p_id and company_id = cid;
  if p.id is null then raise exception 'That pack is not at your workplace'; end if;
  if exists (select 1 from public.pack_members where pack_id = p.id and user_id = auth.uid()) then return p.id; end if;
  if (select count(*) from public.pack_members where user_id = auth.uid()) >= public.max_packs_per_walker() then
    raise exception 'You can be in up to % packs', public.max_packs_per_walker();
  end if;
  if (select count(*) from public.pack_members where pack_id = p.id) >= public.max_pack_size() then raise exception 'That pack is full'; end if;
  insert into public.pack_members (pack_id, user_id) values (p.id, auth.uid());
  return p.id;
end $$;
revoke execute on function public.join_pack_by_id(uuid) from public, anon;
grant execute on function public.join_pack_by_id(uuid) to authenticated;
