-- Walkies database. Safe to run again.
-- Security model: everyone can only read and write their own rows. Team and league
-- numbers come from SECURITY DEFINER functions that return totals, never individuals.

create table if not exists public.challenge (
  id        int primary key default 1 check (id = 1),
  name      text not null,
  starts_on date not null,
  ends_on   date not null
);
insert into public.challenge (id, name, starts_on, ends_on)
values (1, 'Founders Cup', current_date - 3, current_date + 7)
on conflict (id) do nothing;

create table if not exists public.workplaces (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 60),
  industry     text not null default 'Other',
  size_bracket text not null default 'Pup' check (size_bracket in ('Pup', 'Pack', 'Big Dog', 'Top Dog')),
  join_code    text not null unique,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Walker' check (char_length(display_name) between 1 and 40),
  buddy_name   text not null default 'Biscuit' check (char_length(buddy_name) between 1 and 24),
  workplace_id uuid references public.workplaces(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.step_days (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  steps      int  not null check (steps between 0 and 60000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create or replace function public.milestone_count(total bigint) returns int
language sql immutable as $$
  select count(*)::int
  from unnest(array[5000,15000,30000,45000,65000,85000,100000,120000,135000,150000]) m
  where m <= total
$$;

-- Only recent days can be written (a day ahead allows for time zones), so history can't be rewritten.
create or replace function public.check_step_day() returns trigger
language plpgsql as $$
begin
  if new.day > current_date + 1 or new.day < current_date - 7 then
    raise exception 'That day is outside the allowed window';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists step_days_check on public.step_days;
create trigger step_days_check before insert or update on public.step_days
  for each row execute function public.check_step_day();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Walker'), 40))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security
alter table public.challenge  enable row level security;
alter table public.workplaces enable row level security;
alter table public.profiles   enable row level security;
alter table public.step_days  enable row level security;

drop policy if exists challenge_read on public.challenge;
create policy challenge_read on public.challenge for select to authenticated using (true);

drop policy if exists workplaces_read on public.workplaces;
create policy workplaces_read on public.workplaces for select to authenticated
  using (id in (select workplace_id from public.profiles where user_id = auth.uid()));

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists steps_read on public.step_days;
create policy steps_read on public.step_days for select to authenticated using (user_id = auth.uid());
drop policy if exists steps_write on public.step_days;
create policy steps_write on public.step_days for insert to authenticated with check (user_id = auth.uid());
drop policy if exists steps_update on public.step_days;
create policy steps_update on public.step_days for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- People may only change their names. Workplace membership goes through the functions below.
revoke update on public.profiles from authenticated;
grant update (display_name, buddy_name) on public.profiles to authenticated;

-- Workplace actions
create or replace function public.create_workplace(p_name text, p_industry text, p_bracket text)
returns public.workplaces language plpgsql security definer set search_path = public as $$
declare w public.workplaces;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.workplaces (name, industry, size_bracket, join_code, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_industry), ''), 'Other'),
          case when p_bracket in ('Pup','Pack','Big Dog','Top Dog') then p_bracket else 'Pup' end,
          upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)), auth.uid())
  returning * into w;
  update public.profiles set workplace_id = w.id where user_id = auth.uid();
  return w;
end $$;

create or replace function public.join_workplace(p_code text)
returns public.workplaces language plpgsql security definer set search_path = public as $$
declare w public.workplaces;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into w from public.workplaces where join_code = upper(trim(p_code));
  if not found then raise exception 'We could not find that code'; end if;
  update public.profiles set workplace_id = w.id where user_id = auth.uid();
  return w;
end $$;

create or replace function public.leave_workplace() returns void
language sql security definer set search_path = public as $$
  update public.profiles set workplace_id = null where user_id = auth.uid()
$$;

-- League: steps per member (everyone who joined counts, so small teams can't win by having one walker).
create or replace function public.leaderboard(p_bracket text default null)
returns table (workplace_id uuid, name text, industry text, size_bracket text, members int,
               total_steps bigint, steps_per_member bigint, bowls int, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with c as (select starts_on, ends_on from public.challenge limit 1),
  ut as (
    select p.user_id, p.workplace_id, coalesce(sum(s.steps), 0)::bigint as t
    from public.profiles p
    left join public.step_days s on s.user_id = p.user_id
      and s.day between (select starts_on from c) and (select ends_on from c)
    where p.workplace_id is not null
    group by p.user_id, p.workplace_id
  )
  select w.id, w.name, w.industry, w.size_bracket, count(*)::int,
         sum(ut.t)::bigint, (sum(ut.t) / count(*))::bigint, sum(public.milestone_count(ut.t))::int,
         w.id is not distinct from (select workplace_id from public.profiles where user_id = auth.uid())
  from ut join public.workplaces w on w.id = ut.workplace_id
  where p_bracket is null or w.size_bracket = p_bracket
  group by w.id
  order by 7 desc, 2
$$;

-- Impact numbers for the signed-in person, their team and the whole community.
create or replace function public.impact()
returns table (challenge_name text, starts_on date, ends_on date,
               my_steps bigint, my_bowls int,
               team_name text, team_join_code text, team_members int, team_bowls int,
               community_walkers int, community_bowls int)
language sql stable security definer set search_path = public as $$
  with c as (select * from public.challenge limit 1),
  ut as (
    select p.user_id, p.workplace_id, coalesce(sum(s.steps), 0)::bigint as t
    from public.profiles p
    left join public.step_days s on s.user_id = p.user_id
      and s.day between (select starts_on from c) and (select ends_on from c)
    group by p.user_id, p.workplace_id
  ),
  me as (select workplace_id from public.profiles where user_id = auth.uid())
  select c.name, c.starts_on, c.ends_on,
    coalesce((select t from ut where user_id = auth.uid()), 0),
    public.milestone_count(coalesce((select t from ut where user_id = auth.uid()), 0)),
    (select w.name from public.workplaces w join me on w.id = me.workplace_id),
    (select w.join_code from public.workplaces w join me on w.id = me.workplace_id),
    coalesce((select count(*)::int from ut where workplace_id = (select workplace_id from me)), 0),
    coalesce((select sum(public.milestone_count(t))::int from ut where workplace_id = (select workplace_id from me)), 0),
    (select count(*)::int from ut),
    coalesce((select sum(public.milestone_count(t))::int from ut), 0)
  from c
$$;

alter function public.milestone_count(bigint) set search_path = '';
alter function public.check_step_day() set search_path = '';

-- Lock functions down to signed-in users.
revoke execute on function public.create_workplace(text, text, text) from public, anon;
revoke execute on function public.join_workplace(text) from public, anon;
revoke execute on function public.leave_workplace() from public, anon;
revoke execute on function public.leaderboard(text) from public, anon;
revoke execute on function public.impact() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.create_workplace(text, text, text) to authenticated;
grant execute on function public.join_workplace(text) to authenticated;
grant execute on function public.leave_workplace() to authenticated;
grant execute on function public.leaderboard(text) to authenticated;
grant execute on function public.impact() to authenticated;
