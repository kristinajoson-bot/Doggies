# Walkies B2B (the corporate version): project brief

This is the hand-off for the **B2B** project session. The owner decided that the consumer app (B2C, see `docs/B2C.md`) would not carry company/team features, and that a separate corporate version would be built. Nothing for B2B has been built as its own product yet. This file collects what already exists, where to find it, and the decisions that are still open. Statements marked *suggestion* are mine, not decisions.

## Where the earlier team work lives (git)

The consumer app used to have workplaces and teams. It was removed in commit `ce96e1a` ("Remove teams; add pack wars ..."). Useful refs on branch `claude/hopeful-johnson-59a7hr`:

- `2cb250a`: last commit with the full team model (up to 3 teams per person, one **home team**, team renaming, team-vs-team tug of wars, team leaderboard, team detail page). Start from here to see the working code.
- `0a82622`: last commit **with company-size tiers** (Pack up to 250 staff, Big Dog 251 to 1,000, Top Dog 1,000+; walkers were "Pup"). The tiers were removed in `abd509c`.
- `25f8be4`, `35ed1ae`: multi-team and home-team changes.

Use `git show <sha>:app/index.html` or check out a branch from `2cb250a`.

## What the team features were

- **Workplaces / teams**: a person created a team (name, industry, size bracket) and got a join code; workmates joined with the code or an invite link. Up to 3 teams per person. The team creator was the **captain**; a captain had to accept a team challenge on behalf of the team.
- **Home team rule** (decided with the owner): a person can belong to up to 3 teams but exactly one is the **home team** (`team_members.competing = true`). Only the home team counts for the leaderboard, team totals and tug of wars. Switching is only allowed in the first 3 days of a month (Sydney time) and only if the current home team has no pending or active team challenge. Reasoning: one team gives identity and loyalty, stops double counting steps, and gives clean unique-walker counts for sponsors and corporate scale.
- **Team tug of war**: team against team, scored by steps per member, started from zero (baselines). Max 3 challenges at a time.
- **World Cup (team tournaments)**: knockout cups between teams, steps per walker per round (`tournaments`, `tournament_entries` in `supabase/rivals.sql`). It was hidden in the consumer app and was to return as a campaign.
- **Team leaderboard**: teams ranked by steps per member, grouped by size tier; tapping a team showed its people, their steps and dog bowls.
- **Team goal**: a team "goal" of 250 kg of food (`TEAM_GOAL_KG`) unlocking an office dog visit.
- Invite flows: invite workmates (share, email), industries list, team size brackets.

## What is still in the shared database (unused by B2C)

Tables: `workplaces` (captain_id, join_code, industry, size_bracket), `team_members` (`competing`, unique index `one_home_team`), `tournaments`, `tournament_entries`, `duels` rows with `kind = 'team'`, `profiles.workplace_id` (the home team).
Functions: `join_workplace`, `create_workplace`, `my_teams`, `my_home_team`, `set_home_team`, `leave_team`, `rename_team_id`, `team_mates_of`, `team_detail`, `leaderboard`, `side_stats`, `duel_options`, `team_challenges`, tournament functions (`create_tournament`, `join_tournament`, `start_tournament_now`, `advance_tournament`, `list_tournaments`, `tournament_view`, `tournament_info`). SQL history is in `supabase/schema.sql`, `rivals.sql`, `links.sql`, `teams.sql`. Some of these were redefined live, so read the live definitions rather than trusting the files.

*Suggestion*: give B2B its **own Supabase project and Vercel project** so corporate data, privacy settings and schema changes never share a database with the consumer app, and so the B2C schema can drop the old team objects.

## What B2C has that B2B can reuse

- Campaign system with admin controls (cities today; for B2B the "sides" could be offices, departments or companies), including the 8-side World Cup with groups, semi-finals and a final, computed from steps per walker.
- Pack wars (invite a few named people), tug of war links, flip-banner Challenges page, race view, leaderboard bands, dog impact screens, privacy settings, install/PWA shell.
- A tested front-end harness (`tests/`).

## Open decisions for B2B (not made yet)

- Who buys and who administers: company-level admin (HR / wellbeing lead) with a dashboard? Employee invites by email domain, join code, link or SSO?
- Tenancy: the consumer database is open (everyone sees everyone). Corporate needs a company boundary on every table and RLS or function check. Should colleagues see each other's steps? (The consumer rule "everyone sees everyone" is a **consumer** rule.)
- Privacy and consent in an employment setting (Australian Privacy Act, employer visibility of health-related data, opt-in versus default, data retention, leaving the company).
- Competition format: team vs team within and across companies; whether the tier idea (by company size) returns; how campaigns map to company events; whether the home-team rule stays.
- Money: sponsorship and what companies pay for or donate (the consumer "sponsor a bowl" tile was removed; no pricing exists).
- Branding: company logos, custom dogs/shelters per company, reporting for sponsors (unique walker counts, total bowls, kg).

## Suggested first steps

1. Decide tenancy and consent (above) before writing code.
2. Create the new Supabase and Vercel projects; start from the B2C app shell, not from the old team commit, and port the team features deliberately (use `2cb250a` as reference).
3. Build the company admin area first (it is the buyer's view), then employee onboarding, then competitions.
4. Reuse the test harness and add company-boundary tests.

## Working notes

Same stack and gotchas as B2C: see `docs/B2C.md` (especially the Supabase `execute_sql` quirks and the single-file front-end rules) and `tests/README.md`.
