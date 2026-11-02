-- FurSteps: lets a walker leave a pack (and removes an empty pack).
-- Paste into Supabase > fursteps-b2b > SQL Editor and press Run.
create or replace function public.leave_pack(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.pack_members where pack_id = p_id and user_id = auth.uid();
  delete from public.packs k where k.id = p_id and not exists (select 1 from public.pack_members m where m.pack_id = k.id);
end $$;
revoke execute on function public.leave_pack(uuid) from public, anon, authenticated;
grant execute on function public.leave_pack(uuid) to authenticated;
