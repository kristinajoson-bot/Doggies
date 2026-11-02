-- Tug of War: a 1-v-1 step duel between two colleagues in the same company.
-- The challenger makes a duel and shares a 6-character code; whoever enters
-- the code first becomes the opponent and the duel starts that day.
-- Privacy: by accepting, both walkers agree to show their steps for the duel
-- days to each other (the app says this before they accept). Nobody else sees it.

create table public.duels (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  challenger  uuid not null references auth.users(id) on delete cascade,
  opponent    uuid references auth.users(id) on delete cascade,
  code        text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  days        int  not null check (days between 3 and 14),
  starts_on   date,
  ends_on     date,
  status      text not null default 'pending' check (status in ('pending', 'active', 'cancelled')),
  created_at  timestamptz not null default now(),
  check (opponent is null or opponent <> challenger)
);
create index duels_challenger_idx on public.duels (challenger);
create index duels_opponent_idx on public.duels (opponent);
alter table public.duels enable row level security;
revoke all on public.duels from anon, authenticated;

create or replace function public.new_duel_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.duels where code = c) and not exists (select 1 from public.packs where code = c);
  end loop;
  return c;
end $$;

-- Open duels a walker can have at once (pending or still running).
create or replace function public.max_open_duels() returns int language sql immutable as $$ select 5 $$;

create or replace function public.open_duel_count(p_user uuid, p_today date) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.duels
  where (challenger = p_user or opponent = p_user)
    and (status = 'pending' or (status = 'active' and ends_on >= p_today))
$$;

create or replace function public.create_duel(p_days int, p_today date)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_company_id();
  did uuid; dc text;
begin
  if cid is null then raise exception 'Join your workplace first'; end if;
  if p_days is null or p_days not between 3 and 14 then raise exception 'A tug of war lasts 3 to 14 days'; end if;
  if public.open_duel_count(auth.uid(), p_today) >= public.max_open_duels() then
    raise exception 'You can have up to % tugs of war going at once', public.max_open_duels();
  end if;
  dc := public.new_duel_code();
  insert into public.duels (company_id, challenger, code, days) values (cid, auth.uid(), dc, p_days) returning duels.id into did;
  return query select did, dc;
end $$;

-- p_today is the phone's local date, so the duel starts on the walker's own "today".
create or replace function public.accept_duel(p_code text, p_today date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_company_id();
  d public.duels;
begin
  if cid is null then raise exception 'Join your workplace first'; end if;
  if p_today is null or abs(p_today - current_date) > 1 then raise exception 'Check the date on your phone'; end if;
  select * into d from public.duels where code = upper(trim(coalesce(p_code, ''))) and company_id = cid for update;
  if d.id is null or d.status = 'cancelled' then raise exception 'No tug of war with that code at your workplace'; end if;
  if d.challenger = auth.uid() then raise exception 'That is your own challenge. Send the code to a colleague'; end if;
  if d.status = 'active' then
    if d.opponent = auth.uid() then return d.id; end if;
    raise exception 'Someone already took that challenge';
  end if;
  if public.open_duel_count(auth.uid(), p_today) >= public.max_open_duels() then
    raise exception 'You can have up to % tugs of war going at once', public.max_open_duels();
  end if;
  update public.duels set opponent = auth.uid(), status = 'active', starts_on = p_today, ends_on = p_today + (days - 1)
  where duels.id = d.id;
  return d.id;
end $$;

-- Only the challenger can call off a duel nobody has accepted yet.
create or replace function public.cancel_duel(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.duels set status = 'cancelled' where id = p_id and challenger = auth.uid() and status = 'pending';
  if not found then raise exception 'Only a challenge nobody has accepted yet can be cancelled'; end if;
end $$;

-- The caller's duels from the last 30 days, newest first, with both step totals.
create or replace function public.my_duels(p_today date)
returns table (id uuid, code text, days int, starts_on date, ends_on date, status text, is_challenger boolean,
               opponent_name text, opponent_dog uuid, my_steps bigint, their_steps bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
  select d.id, case when d.status = 'pending' then d.code end, d.days, d.starts_on, d.ends_on,
    case when d.status = 'active' and d.ends_on < p_today then 'finished' else d.status end,
    d.challenger = auth.uid(),
    o.display_name, o.dog_id,
    coalesce((select sum(s.steps) from public.step_days s where s.user_id = auth.uid() and s.day between d.starts_on and d.ends_on), 0)::bigint,
    coalesce((select sum(s.steps) from public.step_days s where s.user_id = o.user_id and s.day between d.starts_on and d.ends_on), 0)::bigint
  from public.duels d
  left join public.members o on o.user_id = case when d.challenger = auth.uid() then d.opponent else d.challenger end
  where (d.challenger = auth.uid() or d.opponent = auth.uid())
    and d.status <> 'cancelled'
    and (d.status = 'pending' or d.ends_on >= p_today - 30)
  order by (d.status = 'active' and d.ends_on >= p_today) desc, d.created_at desc
  limit 20;
end $$;

revoke execute on function public.new_duel_code(), public.max_open_duels(), public.open_duel_count(uuid, date),
  public.create_duel(int, date), public.accept_duel(text, date), public.cancel_duel(uuid), public.my_duels(date)
  from public, anon, authenticated;
grant execute on function public.create_duel(int, date), public.accept_duel(text, date), public.cancel_duel(uuid), public.my_duels(date)
  to authenticated;
