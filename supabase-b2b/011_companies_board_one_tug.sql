-- Build 13 feedback:
-- 1) Leaderboard "Companies" view: your company vs the rest, totals only.
--    Another company's walkers are never named; steps per walker only show for 5+ walkers.
-- 2) Industry emoji per company, set by the company (HR admin), not each walker.
-- 3) Tug of War: one at a time; unanswered challenges expire after 3 days.

alter table public.companies add column if not exists industry text check (industry is null or length(trim(industry)) between 1 and 40);
alter table public.companies add column if not exists industry_emoji text check (industry_emoji is null or length(industry_emoji) between 1 and 8);
-- A company can stay off the cross-company board (decided in its contract).
alter table public.companies add column if not exists on_public_board boolean not null default true;

create or replace function public.company_board(p_from date, p_to date)
returns table (name text, industry_emoji text, walkers int, steps_per_walker int, bowls int, is_mine boolean)
language plpgsql stable security definer set search_path = public as $$
declare mine uuid := public.my_company_id();
begin
  perform public.check_month(p_from, p_to);
  return query
  with per as (
    select m.company_id, m.user_id, coalesce(sum(s.steps), 0)::bigint as t
    from public.members m left join public.step_days s on s.user_id = m.user_id and s.day between p_from and p_to
    where m.left_at is null group by m.company_id, m.user_id
  ),
  agg as (
    select per.company_id, count(*) filter (where per.t > 0)::int as n, sum(per.t)::bigint as total,
           sum(public.milestone_count(per.t))::int as b
    from per group by per.company_id
  )
  select c.name, c.industry_emoji, a.n,
         case when a.n >= public.min_group_size() then (a.total / a.n)::int end,
         a.b, c.id = mine
  from agg a join public.companies c on c.id = a.company_id
  where c.status = 'active' and (c.id = mine or (c.on_public_board and a.n > 0))
  order by case when a.n >= public.min_group_size() then a.total::numeric / a.n end desc nulls last, a.b desc, c.name
  limit 100;
end $$;

create or replace function public.max_open_duels() returns int language sql immutable as $$ select 1 $$;
create or replace function public.duel_invite_days() returns int language sql immutable as $$ select 3 $$;

create or replace function public.open_duel_count(p_user uuid, p_today date) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.duels
  where (challenger = p_user or opponent = p_user)
    and ((status = 'pending' and created_at > now() - make_interval(days => public.duel_invite_days()))
         or (status = 'active' and ends_on >= p_today))
$$;

create or replace function public.challenge_colleague(p_opponent uuid, p_days int, p_today date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_company_id();
  did uuid;
begin
  if cid is null then raise exception 'Join your workplace first'; end if;
  if p_days is null or p_days not between 3 and 14 then raise exception 'A tug of war lasts 3 to 14 days'; end if;
  if p_opponent is null or p_opponent = auth.uid() then raise exception 'Pick a colleague to challenge'; end if;
  if not exists (select 1 from public.members where user_id = p_opponent and company_id = cid and left_at is null and show_named) then
    raise exception 'That colleague can''t be challenged right now';
  end if;
  if public.open_duel_count(auth.uid(), p_today) >= public.max_open_duels() then
    raise exception 'You already have a tug of war going. Finish or cancel it first';
  end if;
  if public.open_duel_count(p_opponent, p_today) >= public.max_open_duels() then
    raise exception 'They''re already in a tug of war. Try again when it ends';
  end if;
  insert into public.duels (company_id, challenger, opponent, code, days)
  values (cid, auth.uid(), p_opponent, public.new_duel_code(), p_days) returning id into did;
  return did;
end $$;

create or replace function public.accept_duel_by_id(p_id uuid, p_today date) returns void
language plpgsql security definer set search_path = public as $$
declare d public.duels;
begin
  if p_today is null or abs(p_today - current_date) > 1 then raise exception 'Check the date on your phone'; end if;
  select * into d from public.duels where id = p_id and opponent = auth.uid() and company_id = public.my_company_id() for update;
  if d.id is null or d.status <> 'pending' or d.created_at <= now() - make_interval(days => public.duel_invite_days()) then
    raise exception 'That challenge is no longer open';
  end if;
  if public.open_duel_count(auth.uid(), p_today) > public.max_open_duels() then
    raise exception 'You already have a tug of war going';
  end if;
  update public.duels set status = 'active', starts_on = p_today, ends_on = p_today + (days - 1) where id = d.id;
end $$;

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
    and ((d.status = 'pending' and d.created_at > now() - make_interval(days => public.duel_invite_days())) or d.ends_on >= p_today - 30)
  order by (d.status = 'active' and d.ends_on >= p_today) desc, d.created_at desc
  limit 20;
end $$;

revoke execute on function public.company_board(date, date), public.duel_invite_days() from public, anon;
grant execute on function public.company_board(date, date) to authenticated;

-- Impact "All time": bowls are earned per calendar month, so add up each month.
create or replace function public.my_all_time() returns table (bowls int, steps bigint)
language sql stable security definer set search_path = public as $$
  with mon as (
    select date_trunc('month', s.day) as m, sum(s.steps)::bigint as t
    from public.step_days s where s.user_id = auth.uid() group by 1
  )
  select coalesce(sum(public.milestone_count(t)), 0)::int, coalesce(sum(t), 0)::bigint from mon
$$;
revoke execute on function public.my_all_time() from public, anon;
grant execute on function public.my_all_time() to authenticated;
