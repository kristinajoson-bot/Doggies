-- What the phone app needs on launch to pick the right screen.
create or replace function public.my_status()
returns table (company_name text, has_step_consent boolean)
language sql stable security definer set search_path = public as $$
  select c.name, public.has_step_consent(auth.uid())
  from public.members m join public.companies c on c.id = m.company_id
  where m.user_id = auth.uid() and m.left_at is null
$$;
revoke execute on function public.my_status() from public, anon;
grant execute on function public.my_status() to authenticated;
