-- Packs: small teams walkers make themselves, inside their own company only.
-- Join with a 6-character code. Packs are ranked by steps per walker this month.
-- Privacy: a pack's step numbers show only when it has 5+ walkers or every
-- member opted in to the named leaderboard; otherwise only bowls show.
-- Inside a pack, only members who opted in appear by name.

create table public.packs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 40),
  code       text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index packs_company_idx on public.packs (company_id);

create table public.pack_members (
  pack_id   uuid not null references public.packs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pack_id, user_id)
);
create index pack_members_user_idx on public.pack_members (user_id);

alter table public.packs enable row level security;
alter table public.pack_members enable row level security;
revoke all on public.packs, public.pack_members from anon, authenticated;

create or replace function public.max_packs_per_walker() returns int language sql immutable as $$ select 5 $$;
create or replace function public.max_pack_size() returns int language sql immutable as $$ select 50 $$;

-- Readable codes without 0/O/1/I.
create or replace function public.new_pack_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.packs where code = c);
  end loop;
  return c;
end $$;

create or replace function public.check_pack_name(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if length(trim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'Pack name must be 1 to 40 characters'; end if;
  return trim(p_name);
end $$;

create or replace function public.create_pack(p_name text)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_company_id();
  nm text := public.check_pack_name(p_name);
  pid uuid; pc text;
begin
  if cid is null then raise exception 'Join your workplace first'; end if;
  if (select count(*) from public.pack_members where user_id = auth.uid()) >= public.max_packs_per_walker() then
    raise exception 'You can be in up to % packs', public.max_packs_per_walker();
  end if;
  pc := public.new_pack_code();
  insert into public.packs (company_id, name, code, created_by) values (cid, nm, pc, auth.uid()) returning packs.id into pid;
  insert into public.pack_members (pack_id, user_id) values (pid, auth.uid());
  return query select pid, pc;
end $$;

create or replace function public.join_pack(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_company_id();
  p public.packs;
begin
  if cid is null then raise exception 'Join your workplace first'; end if;
  select * into p from public.packs where code = upper(trim(coalesce(p_code, ''))) and company_id = cid;
  if p.id is null then raise exception 'No pack with that code at your workplace'; end if;
  if exists (select 1 from public.pack_members where pack_id = p.id and user_id = auth.uid()) then return p.id; end if;
  if (select count(*) from public.pack_members where user_id = auth.uid()) >= public.max_packs_per_walker() then
    raise exception 'You can be in up to % packs', public.max_packs_per_walker();
  end if;
  if (select count(*) from public.pack_members where pack_id = p.id) >= public.max_pack_size() then raise exception 'That pack is full'; end if;
  insert into public.pack_members (pack_id, user_id) values (p.id, auth.uid());
  return p.id;
end $$;

-- Leaving the last member out deletes the pack.
create or replace function public.leave_pack(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.pack_members where pack_id = p_id and user_id = auth.uid();
  delete from public.packs k where k.id = p_id and not exists (select 1 from public.pack_members m where m.pack_id = k.id);
end $$;

create or replace function public.rename_pack(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare nm text := public.check_pack_name(p_name);
begin
  update public.packs set name = nm where id = p_id and created_by = auth.uid();
  if not found then raise exception 'Only the person who made the pack can rename it'; end if;
end $$;

-- Every pack in the caller's company, ranked. Numbers follow the privacy rule above.
create or replace function public.pack_board(p_from date, p_to date)
returns table (id uuid, name text, code text, walkers int, steps_per_walker int, bowls int, is_mine boolean, is_owner boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.check_month(p_from, p_to);
  return query
  with per as (
    select pm.pack_id, m.user_id, m.show_named, coalesce(sum(s.steps), 0)::bigint as t
    from public.pack_members pm
    join public.packs k on k.id = pm.pack_id and k.company_id = public.my_company_id()
    join public.members m on m.user_id = pm.user_id and m.left_at is null and m.company_id = k.company_id
    left join public.step_days s on s.user_id = m.user_id and s.day between p_from and p_to
    group by pm.pack_id, m.user_id, m.show_named
  ),
  agg as (
    select per.pack_id, count(*)::int as n, bool_and(per.show_named) as all_named, sum(per.t)::bigint as total,
           sum(public.milestone_count(per.t))::int as b, bool_or(per.user_id = auth.uid()) as mine
    from per group by per.pack_id
  )
  select k.id, k.name, case when a.mine then k.code end, a.n,
         case when a.n >= public.min_group_size() or a.all_named then (a.total / a.n)::int end,
         a.b, a.mine, k.created_by = auth.uid()
  from agg a join public.packs k on k.id = a.pack_id
  order by (a.total::numeric / a.n) desc, k.name
  limit 200;
end $$;

-- People in one of the caller's packs. Only opted-in members appear by name.
create or replace function public.pack_people(p_id uuid, p_from date, p_to date)
returns table (display_name text, dog_id uuid, steps bigint, bowls int, is_me boolean, hidden int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.check_month(p_from, p_to);
  if not exists (select 1 from public.pack_members where pack_id = p_id and user_id = auth.uid()) then
    raise exception 'You are not in that pack';
  end if;
  return query
  with per as (
    select m.user_id, m.display_name, m.dog_id, m.show_named, coalesce(sum(s.steps), 0)::bigint as t
    from public.pack_members pm
    join public.members m on m.user_id = pm.user_id and m.left_at is null and m.company_id = public.my_company_id()
    left join public.step_days s on s.user_id = m.user_id and s.day between p_from and p_to
    where pm.pack_id = p_id
    group by m.user_id, m.display_name, m.dog_id, m.show_named
  )
  select p.display_name, p.dog_id, p.t, public.milestone_count(p.t), p.user_id = auth.uid(),
         (select count(*)::int from per where not per.show_named)
  from per p where p.show_named
  order by 3 desc, 1;
end $$;

revoke execute on function public.max_packs_per_walker(), public.max_pack_size(), public.new_pack_code(), public.check_pack_name(text),
  public.create_pack(text), public.join_pack(text), public.leave_pack(uuid), public.rename_pack(uuid, text),
  public.pack_board(date, date), public.pack_people(uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.create_pack(text), public.join_pack(text), public.leave_pack(uuid), public.rename_pack(uuid, text),
  public.pack_board(date, date), public.pack_people(uuid, date, date) to authenticated;
