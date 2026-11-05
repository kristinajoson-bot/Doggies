-- Bowls run in 2-week rounds per company, starting on the day the company (HR) signed up.
-- Leaderboards stay calendar-monthly so companies on different rounds can be compared.
alter table public.companies add column if not exists round_start date;
update public.companies set round_start = (created_at at time zone 'Australia/Sydney')::date where round_start is null;
alter table public.companies alter column round_start set default (now() at time zone 'Australia/Sydney')::date;
alter table public.companies alter column round_start set not null;

create or replace function public.round_days() returns int language sql immutable as $$ select 14 $$;

-- The caller's current round: first and last day.
create or replace function public.my_round(p_today date) returns table (round_from date, round_to date)
language sql stable security definer set search_path = public as $$
  select c.round_start + public.round_days() * floor(greatest(p_today - c.round_start, 0) / public.round_days()::numeric)::int,
         c.round_start + public.round_days() * (floor(greatest(p_today - c.round_start, 0) / public.round_days()::numeric)::int + 1) - 1
  from public.members m join public.companies c on c.id = m.company_id
  where m.user_id = auth.uid() and m.left_at is null
$$;
revoke execute on function public.my_round(date) from public, anon;
grant execute on function public.my_round(date) to authenticated;

-- All-time bowls: milestones counted per round, using the caller's company rounds.
create or replace function public.my_all_time() returns table (bowls int, steps bigint)
language sql stable security definer set search_path = public as $$
  with c as (
    select co.round_start as rs from public.members m join public.companies co on co.id = m.company_id
    where m.user_id = auth.uid() and m.left_at is null
  ), r as (
    select floor((s.day - c.rs) / public.round_days()::numeric) as n, sum(s.steps)::bigint as t
    from public.step_days s, c where s.user_id = auth.uid() group by 1
  )
  select coalesce(sum(public.milestone_count(t)), 0)::int, coalesce(sum(t), 0)::bigint from r
$$;
revoke execute on function public.my_all_time() from public, anon;
grant execute on function public.my_all_time() to authenticated;
