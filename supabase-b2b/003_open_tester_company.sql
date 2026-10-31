-- Beta testers: anyone whose email domain isn't a client company joins the one
-- company marked open_join. Turn it off (or delete the company) before launch.
alter table public.companies add column if not exists open_join boolean not null default false;
create unique index if not exists companies_one_open_join on public.companies (open_join) where open_join;

insert into public.companies (name, slug, open_join)
values ('FurSteps Testers', 'fursteps-testers', true)
on conflict (slug) do update set open_join = true;

create or replace function public.join_company_by_email() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email  text;
  v_domain text;
  v_company uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select email into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirm your email first'; end if;
  v_domain := lower(split_part(v_email, '@', 2));
  select d.company_id into v_company
  from public.company_domains d join public.companies c on c.id = d.company_id
  where d.domain = v_domain and d.verified_at is not null and c.status = 'active';
  if v_company is null then
    select id into v_company from public.companies where open_join and status = 'active';
  end if;
  if v_company is null then raise exception 'Your workplace is not on FurSteps yet'; end if;
  insert into public.members (user_id, company_id) values (auth.uid(), v_company)
  on conflict (user_id) do update
    set company_id = excluded.company_id, left_at = null, joined_at = now()
    where public.members.company_id = excluded.company_id;
  if not found then raise exception 'You already belong to another company'; end if;
  return v_company;
end $$;
