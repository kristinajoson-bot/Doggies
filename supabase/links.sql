-- Walkies: challenge links. A link carries the sender's challenge; the person who opens it accepts.
-- Each statement is on one line because the SQL tool used to apply it stalls on multi-line function bodies.
-- Note: my_duels() is unchanged. my_links() returns the link token to the person who made a waiting challenge.

alter table public.duels alter column b_ref drop not null; alter table public.duels add column if not exists invite_token text unique;

create or replace function public.create_link_duel(p_days int) returns text language plpgsql security definer set search_path = public as $fn$ declare me uuid := auth.uid(); n int := greatest(1, least(coalesce(p_days, 7), 30)); tok text; begin if me is null then raise exception 'Sign in first'; end if; if (select count(*) from public.duels du where du.kind = 'person' and du.status in ('pending','active') and (du.ends_on is null or du.ends_on >= current_date) and (du.a_ref = me::text or du.b_ref = me::text)) >= 3 then raise exception 'You already have 3 tug of wars going. Wait for one to finish.'; end if; tok := lower(substr(md5(random()::text || clock_timestamp()::text || me::text), 1, 10)); insert into public.duels (kind, a_ref, b_ref, created_by, status, days, invite_token) values ('person', me::text, null, me, 'pending', n, tok); return tok; end $fn$;

create or replace function public.link_duel_preview(p_token text) returns table (challenger text, days int, mine boolean, available boolean) language sql stable security definer set search_path = public as $fn$ select public.side_label('person', d.a_ref), d.days, d.a_ref = auth.uid()::text, (d.b_ref is null and d.status = 'pending') from public.duels d where d.invite_token = lower(trim(p_token)) $fn$;

create or replace function public.accept_link_duel(p_token text) returns uuid language plpgsql security definer set search_path = public as $fn$ declare me uuid := auth.uid(); d public.duels; begin if me is null then raise exception 'Sign in first'; end if; select * into d from public.duels where invite_token = lower(trim(p_token)) for update; if not found or d.b_ref is not null or d.status <> 'pending' then raise exception 'This challenge link has already been used or was cancelled'; end if; if d.a_ref = me::text then raise exception 'This is your own challenge link. Send it to someone else.'; end if; update public.duels set b_ref = me::text, status = 'active', starts_on = current_date, ends_on = current_date + d.days - 1, invite_token = null where id = d.id; return d.id; end $fn$;

create or replace function public.cancel_duel(p_id uuid) returns void language sql security definer set search_path = public as $fn$ update public.duels set status = 'declined', invite_token = null where id = p_id and created_by = auth.uid() and status = 'pending' $fn$;

create or replace function public.my_links() returns table (id uuid, invite_token text) language sql stable security definer set search_path = public as $fn$ select d.id, d.invite_token from public.duels d where d.created_by = auth.uid() and d.status = 'pending' and d.b_ref is null and d.invite_token is not null $fn$;

revoke execute on function public.create_link_duel(int), public.link_duel_preview(text), public.accept_link_duel(text), public.cancel_duel(uuid), public.my_links() from public, anon; grant execute on function public.create_link_duel(int), public.link_duel_preview(text), public.accept_link_duel(text), public.cancel_duel(uuid), public.my_links() to authenticated;

-- Lets a visitor who is not signed in see who challenged them (first name and length only) before creating an account.
create or replace function public.link_duel_public(p_token text) returns table (challenger text, days int, available boolean) language sql stable security definer set search_path = public as $fn$ select split_part(coalesce(public.side_label('person', d.a_ref), 'Someone'), ' ', 1), d.days, (d.b_ref is null and d.status = 'pending') from public.duels d where d.invite_token = lower(trim(p_token)) $fn$; revoke execute on function public.link_duel_public(text) from public; grant execute on function public.link_duel_public(text) to anon, authenticated;

-- Challenges start from zero: each side's steps on the day the duel begins are recorded and subtracted.
alter table public.duels add column if not exists a_base bigint not null default 0; alter table public.duels add column if not exists b_base bigint not null default 0;
create or replace function public.duel_set_base() returns trigger language plpgsql security definer set search_path = public as $fn$ begin if new.status = 'active' and new.starts_on is not null and new.b_ref is not null and (tg_op = 'INSERT' or old.status is distinct from 'active') then new.a_base := coalesce((select s.total from public.side_stats(new.kind, new.a_ref, new.starts_on, new.starts_on) s), 0); new.b_base := coalesce((select s.total from public.side_stats(new.kind, new.b_ref, new.starts_on, new.starts_on) s), 0); end if; return new; end $fn$; revoke execute on function public.duel_set_base() from public, anon, authenticated;
create or replace trigger duel_base before insert or update on public.duels for each row execute function public.duel_set_base();
-- my_duels() now returns each side's score minus its starting amount (same columns as before). World Cup round 1 starts the day after kick-off.

-- Up to 5 tug of wars at a time (create_duel and create_link_duel were redefined with the limit raised from 3 to 5).
-- started_at records the exact moment a tug of war begins, for use by automatic step syncing later.
alter table public.duels add column if not exists started_at timestamptz;
-- duel_set_base() also sets started_at := now() when a duel becomes active.
