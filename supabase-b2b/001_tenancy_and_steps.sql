-- FurSteps B2B: companies, members, teams, daily steps and consent.
-- Hard company boundary: tables have RLS on and no policies, so the API can't
-- read them directly. Every read and write goes through the functions below,
-- which work out the caller's company from auth.uid().

create table public.companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) between 1 and 80),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  logo_url       text,
  brand_colour   text check (brand_colour ~ '^#[0-9A-Fa-f]{6}$'),
  status         text not null default 'active' check (status in ('active', 'paused', 'closed')),
  retention_days int  not null default 400 check (retention_days between 30 and 1100),
  created_at     timestamptz not null default now()
);

create table public.company_domains (
  domain      text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  company_id  uuid not null references public.companies(id) on delete cascade,
  verified_at timestamptz
);

create table public.company_admins (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  primary key (company_id, user_id)
);

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 60),
  unique (company_id, name)
);

-- One company per user.
create table public.members (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  team_id      uuid references public.teams(id) on delete set null,
  display_name text not null default 'Walker' check (length(trim(display_name)) between 1 and 40),
  show_named   boolean not null default false,
  joined_at    timestamptz not null default now(),
  left_at      timestamptz
);
create index members_company_idx on public.members (company_id) where left_at is null;
create index members_team_idx on public.members (team_id) where left_at is null;

create table public.step_days (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  steps      int  not null check (steps between 0 and 60000),
  flagged    boolean not null default false,
  source     text not null default 'unknown' check (source in ('apple_health', 'health_connect', 'unknown')),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.consent_log (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('steps', 'named_leaderboard', 'privacy_policy')),
  version      text not null,
  granted_at   timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index consent_log_user_idx on public.consent_log (user_id, kind);

alter table public.companies       enable row level security;
alter table public.company_domains enable row level security;
alter table public.company_admins  enable row level security;
alter table public.teams           enable row level security;
alter table public.members         enable row level security;
alter table public.step_days       enable row level security;
alter table public.consent_log     enable row level security;

revoke all on public.companies, public.company_domains, public.company_admins, public.teams,
  public.members, public.step_days, public.consent_log from anon, authenticated;

-- Smallest group whose totals anyone but its own members may see.
create or replace function public.min_group_size() returns int
language sql immutable as $$ select 5 $$;

create or replace function public.my_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.members where user_id = auth.uid() and left_at is null
$$;

create or replace function public.has_step_consent(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consent_log
    where user_id = p_user and kind = 'steps' and withdrawn_at is null
  )
$$;

-- Join by verified work-email domain.
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
  if v_company is null then raise exception 'Your workplace is not on FurSteps yet'; end if;
  insert into public.members (user_id, company_id) values (auth.uid(), v_company)
  on conflict (user_id) do update
    set company_id = excluded.company_id, left_at = null, joined_at = now()
    where public.members.company_id = excluded.company_id;
  if not found then raise exception 'You already belong to another company'; end if;
  return v_company;
end $$;

create or replace function public.give_consent(p_kind text, p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.consent_log (user_id, kind, version) values (auth.uid(), p_kind, left(p_version, 20));
  if p_kind = 'named_leaderboard' then
    update public.members set show_named = true where user_id = auth.uid();
  end if;
end $$;

-- Withdrawing step consent also deletes the person's step history.
create or replace function public.withdraw_consent(p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  update public.consent_log set withdrawn_at = now()
  where user_id = auth.uid() and kind = p_kind and withdrawn_at is null;
  if p_kind = 'steps' then
    delete from public.step_days where user_id = auth.uid();
  elsif p_kind = 'named_leaderboard' then
    update public.members set show_named = false where user_id = auth.uid();
  end if;
end $$;

-- Phone app upload: [{"day":"2026-10-31","steps":8123,"flagged":false}, ...].
-- Only the last 7 days (plus one ahead for time zones) can be written.
create or replace function public.sync_steps(p_days jsonb, p_source text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public.has_step_consent(auth.uid()) then raise exception 'Step consent is needed first'; end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 8 then raise exception 'Send up to 8 days'; end if;
  insert into public.step_days (user_id, day, steps, flagged, source)
  select auth.uid(), (d->>'day')::date, least(greatest((d->>'steps')::int, 0), 60000),
         coalesce((d->>'flagged')::boolean, false) or (d->>'steps')::int > 40000, p_source
  from jsonb_array_elements(p_days) d
  where (d->>'day')::date between current_date - 7 and current_date + 1
  on conflict (user_id, day) do update
    set steps = excluded.steps, flagged = excluded.flagged, source = excluded.source, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.my_steps(p_from date, p_to date)
returns table (day date, steps int, flagged boolean)
language sql stable security definer set search_path = public as $$
  select day, steps, flagged from public.step_days
  where user_id = auth.uid() and day between p_from and p_to order by day
$$;

-- Team totals inside the caller's company. Totals are hidden for teams with
-- fewer than 5 walkers unless every member opted in to named visibility.
create or replace function public.team_totals(p_from date, p_to date)
returns table (team_id uuid, team_name text, walkers int, total_steps bigint, steps_per_walker int)
language sql stable security definer set search_path = public as $$
  with mine as (select public.my_company_id() as cid),
  roster as (
    select m.user_id, m.team_id, m.show_named
    from public.members m, mine
    where m.company_id = mine.cid and m.left_at is null and m.team_id is not null
  ),
  totals as (
    select r.team_id, count(*)::int as walkers, bool_and(r.show_named) as all_named,
           coalesce(sum(s.total), 0)::bigint as total_steps
    from roster r
    left join (select user_id, sum(steps) as total from public.step_days
               where day between p_from and p_to group by user_id) s on s.user_id = r.user_id
    group by r.team_id
  )
  select t.id, t.name, x.walkers,
         case when x.walkers >= public.min_group_size() or x.all_named then x.total_steps end,
         case when x.walkers >= public.min_group_size() or x.all_named then (x.total_steps / x.walkers)::int end
  from totals x join public.teams t on t.id = x.team_id
  order by 5 desc nulls last
$$;

-- Leave the company: detach from it and delete step history. Deleting the auth user removes everything else.
create or replace function public.leave_company() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  update public.members set left_at = now(), team_id = null, show_named = false where user_id = auth.uid();
  delete from public.step_days where user_id = auth.uid();
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.join_company_by_email(), public.give_consent(text, text),
  public.withdraw_consent(text), public.sync_steps(jsonb, text), public.my_steps(date, date),
  public.team_totals(date, date), public.leave_company() to authenticated;
