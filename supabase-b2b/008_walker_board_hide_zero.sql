-- Leaderboard > Walkers: hide walkers with 0 steps this month (e.g. the Apple
-- reviewer test login). You always see yourself, even on 0.
CREATE OR REPLACE FUNCTION public.walker_board(p_from date, p_to date)
 RETURNS TABLE(display_name text, dog_id uuid, steps bigint, bowls integer, is_me boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  perform public.check_month(p_from, p_to);
  return query
  select m.display_name, m.dog_id, coalesce(sum(s.steps), 0)::bigint, public.milestone_count(coalesce(sum(s.steps), 0)::bigint), m.user_id = auth.uid()
  from public.members m left join public.step_days s on s.user_id = m.user_id and s.day between p_from and p_to
  where m.company_id = public.my_company_id() and m.left_at is null and m.show_named
  group by m.user_id, m.display_name, m.dog_id
  having coalesce(sum(s.steps), 0) > 0 or m.user_id = auth.uid()
  order by 3 desc, 1 limit 100;
end $function$;
