-- Walkies features for the FurSteps app: shelter dogs, monthly bowls, the opt-in
-- walker leaderboard inside your own company, and impact totals.
-- Bowls: one per milestone reached in a month (same 10 milestones as Walkies).

create table public.dogs (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name       text not null check (length(trim(name)) between 1 and 40),
  age        text,
  breed      text,
  story      text,
  shelter    text not null default 'Walkies Rescue',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.dogs enable row level security;
revoke all on public.dogs from anon, authenticated;

insert into public.dogs (slug, name) values ('lima', 'Lima'), ('cusco', 'Cusco'), ('pepper', 'Pepper');

alter table public.members add column dog_id uuid references public.dogs(id) on delete set null;

create or replace function public.milestone_count(total bigint) returns int
language sql immutable set search_path = '' as $$
  select count(*)::int from unnest(array[5000,15000,30000,45000,65000,85000,100000,120000,135000,150000]) m where m <= total
$$;

-- The phone sends its own month window so months follow the walker's time zone.
create or replace function public.check_month(p_from date, p_to date) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 31 then raise exception 'Bad month window'; end if;
end $$;

create or replace function public.list_dogs()
returns table (id uuid, slug text, name text, age text, breed text, story text, shelter text)
language sql stable security definer set search_path = public as $$
  select id, slug, name, age, breed, story, shelter from public.dogs where active order by name
$$;

-- Everything the Today, Impact and Me tabs need in one call.
create or replace function public.my_home(p_from date, p_to date, p_today date)
returns table (display_name text, dog_id uuid, on_board boolean, today_steps int, month_steps bigint, my_bowls int,
               company_name text, company_walkers int, company_bowls int, community_walkers int, community_bowls int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.check_month(p_from, p_to);
  return query
  with me as (select m.* from public.members m where m.user_id = auth.uid() and m.left_at is null),
  totals as (
    select m.user_id, m.company_id, coalesce(sum(s.steps), 0)::bigint as t
    from public.members m left join public.step_days s on s.user_id = m.user_id and s.day between p_from and p_to
    where m.left_at is null group by m.user_id, m.company_id
  )
  select me.display_name, me.dog_id, me.show_named,
    coalesce((select s.steps from public.step_days s where s.user_id = auth.uid() and s.day = p_today), 0),
    coalesce((select t from totals where user_id = auth.uid()), 0),
    public.milestone_count(coalesce((select t from totals where user_id = auth.uid()), 0)),
    (select c.name from public.companies c where c.id = me.company_id),
    (select count(*)::int from totals where company_id = me.company_id and t > 0),
    coalesce((select sum(public.milestone_count(t))::int from totals where company_id = me.company_id), 0),
    (select count(*)::int from totals where t > 0),
    coalesce((select sum(public.milestone_count(t))::int from totals), 0)
  from me;
end $$;

-- Opted-in walkers in the caller's own company only. Nobody appears without consent.
create or replace function public.walker_board(p_from date, p_to date)
returns table (display_name text, dog_id uuid, steps bigint, bowls int, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.check_month(p_from, p_to);
  return query
  select m.display_name, m.dog_id, coalesce(sum(s.steps), 0)::bigint, public.milestone_count(coalesce(sum(s.steps), 0)::bigint), m.user_id = auth.uid()
  from public.members m left join public.step_days s on s.user_id = m.user_id and s.day between p_from and p_to
  where m.company_id = public.my_company_id() and m.left_at is null and m.show_named
  group by m.user_id, m.display_name, m.dog_id
  order by 3 desc, 1 limit 100;
end $$;

create or replace function public.choose_dog(p_dog uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_dog is not null and not exists (select 1 from public.dogs where id = p_dog and active) then raise exception 'Unknown dog'; end if;
  update public.members set dog_id = p_dog where user_id = auth.uid() and left_at is null;
end $$;

create or replace function public.set_display_name(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(trim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'Name must be 1 to 40 characters'; end if;
  update public.members set display_name = trim(p_name) where user_id = auth.uid() and left_at is null;
end $$;

revoke execute on function public.milestone_count(bigint), public.check_month(date, date), public.list_dogs(),
  public.my_home(date, date, date), public.walker_board(date, date), public.choose_dog(uuid), public.set_display_name(text)
  from public, anon, authenticated;
grant execute on function public.list_dogs(), public.my_home(date, date, date), public.walker_board(date, date),
  public.choose_dog(uuid), public.set_display_name(text) to authenticated;
