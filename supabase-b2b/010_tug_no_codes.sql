-- Tug of War without codes: pick a colleague from a list, they Accept or Decline.
-- Only colleagues who opted in to the named leaderboard can be picked, and the
-- duel only starts when they accept (they then see each other's duel steps).

-- Colleagues you can challenge: same company, on the named leaderboard, not you,
-- not the App Store review login.
create or replace function public.tug_colleagues()
returns table (user_id uuid, display_name text, dog_id uuid)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.display_name, m.dog_id
  from public.members m join auth.users u on u.id = m.user_id
  where m.company_id = public.my_company_id() and m.left_at is null and m.show_named
    and m.user_id <> auth.uid() and u.email <> 'appreview@fursteps.com'
  order by m.display_name
  limit 500
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
    raise exception 'You can have up to % tugs of war going at once', public.max_open_duels();
  end if;
  if exists (select 1 from public.duels d where d.status in ('pending', 'active') and coalesce(d.ends_on, p_today) >= p_today
             and ((d.challenger = auth.uid() and d.opponent = p_opponent) or (d.challenger = p_opponent and d.opponent = auth.uid()))) then
    raise exception 'You already have a tug of war with them';
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
  if d.id is null or d.status <> 'pending' then raise exception 'That challenge is no longer open'; end if;
  if public.open_duel_count(auth.uid(), p_today) > public.max_open_duels() then
    raise exception 'You can have up to % tugs of war going at once', public.max_open_duels();
  end if;
  update public.duels set status = 'active', starts_on = p_today, ends_on = p_today + (days - 1) where id = d.id;
end $$;

create or replace function public.decline_duel(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.duels set status = 'cancelled' where id = p_id and opponent = auth.uid() and status = 'pending';
  if not found then raise exception 'That challenge is no longer open'; end if;
end $$;

-- Old code flow (builds 11 and earlier): a code can't steal a challenge aimed at someone else.
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
  if d.opponent is not null and d.opponent <> auth.uid() then raise exception 'Someone already took that challenge'; end if;
  if d.status = 'active' then return d.id; end if;
  if public.open_duel_count(auth.uid(), p_today) >= public.max_open_duels() then
    raise exception 'You can have up to % tugs of war going at once', public.max_open_duels();
  end if;
  update public.duels set opponent = auth.uid(), status = 'active', starts_on = p_today, ends_on = p_today + (days - 1)
  where duels.id = d.id;
  return d.id;
end $$;

revoke execute on function public.tug_colleagues(), public.challenge_colleague(uuid, int, date),
  public.accept_duel_by_id(uuid, date), public.decline_duel(uuid) from public, anon;
grant execute on function public.tug_colleagues(), public.challenge_colleague(uuid, int, date),
  public.accept_duel_by_id(uuid, date), public.decline_duel(uuid) to authenticated;
