-- FURSB-79 (Kristina agreed 2026-11-15): no daily step cap and no "unusual day" flag.
-- Steps typed in by hand are still ignored on the phone (trusted sources only).
-- The flagged column stays for old app builds but is no longer set.

alter table public.step_days drop constraint if exists step_days_steps_check;
alter table public.step_days add constraint step_days_steps_check check (steps >= 0);

create or replace function public.sync_steps(p_days jsonb, p_source text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public.has_step_consent(auth.uid()) then raise exception 'Step consent is needed first'; end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 8 then raise exception 'Send up to 8 days'; end if;
  insert into public.step_days (user_id, day, steps, flagged, source)
  select auth.uid(), (d->>'day')::date, greatest((d->>'steps')::int, 0), false, p_source
  from jsonb_array_elements(p_days) d
  where (d->>'day')::date between current_date - 7 and current_date + 1
  on conflict (user_id, day) do update
    set steps = excluded.steps, flagged = false, source = excluded.source, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;
