# Walkies B2C (the consumer app): project brief

This is the hand-off for the **B2C** project session. The consumer app is built and live. The corporate version is a separate project; see `docs/B2B.md`.

Branch with everything: `claude/hopeful-johnson-59a7hr` (latest work). Read this file first, then `app/index.html` as needed.

## What it is

Walkies is a step-challenge PWA. Walkers log steps; every milestone ("scoop") in a month unlocks a bowl of food for a shelter dog. Friends compete in tug of wars and pack wars, and a monthly campaign (for example Sydney vs Melbourne) can run city against city. Dark neon black/pink/cyan/green style, mobile first.

Stack: one file `app/index.html` (vanilla JS, closure state `S`, `render()` replaces innerHTML, delegated click/submit/change handlers), `app/sw.js` (network-first), `app/config.js` (Supabase URL and public key), build-time `app/version.js`. Supabase (Postgres, Auth, RLS, SECURITY DEFINER functions) in the **walkies** project (ref `zzkpdkarrgsvibkxeuor`, Sydney). Hosting: Vercel (`vercel.json`, `npm run build` copies the supabase UMD bundle into `app/vendor`).

## Standing product rules (from the owner)

- Challenges: person vs person tug of wars and pack wars. **Max 3 live challenges at a time**; both kinds share the 3 slots. The always-on monthly bowl/scoop challenge and the monthly campaign do not use a slot.
- No teams, workplaces or company tiers in this version (that is the B2B product). No Big Dog/Top Dog tiers by company size.
- Everyone can see everyone's steps ("don't worry about privacy about steps"). Walker leaderboard includes everyone by default; each person can switch it off in Me > Privacy.
- No "Sample" wording anywhere in the UI.
- Invites are **unique links only**: no rival codes, no pack codes, no team codes. Links look like `/?duel=<token>`, `/?pack=<code>`, `/?campaign=<slug>`; the short code inside a pack link is never shown.
- Steps in a challenge start from zero when it begins (baselines), never total steps.
- Race alerts are in-app only (no web push yet).
- Leaderboard bands by rank: Top Dog (1 to 5), Trail Hounds (6 to 20), Pups (21+).

## Screens

- **Today**: dog tile, three rings (dog bowls, steps today, steps this month), big bowl, paw scoops in two rows, progress bar, Add steps.
- **Challenges** ("Challenges of the month" headline): optional campaign tile on top, then up to three banners (tug of war, pack war, or a promo banner that opens the Start a challenge sheet). Tap a banner to flip it; tap again to flip back. Tug of war front: you and your shelter dog against the rival and theirs; back: steps and the rope. Pack war front: dog pictures either side of VS; back: top three walkers with Show all, invite link (owner only). A cup campaign opens its own page instead of flipping (schedule with dates, knockout tree, groups, matches).
- **Leaderboard**: Walkers | Packs | Challenges (campaign walkers with their city) | World Cup (only while a cup runs). List/Race toggle (Mario-Kart style 3D race with alerts). Tapping a pack shows everyone inside it. Opens scrolled to your row.
- **Impact**: community kg this month, "What you unlocked", who you are feeding, delivery proof placeholder.
- **Me**: name, My pack wars (owner renames), **Campaigns (admins only)**, Privacy settings and policy, sign out. Reset password lives on the sign-in screen.

## Campaigns (monthly, admin controlled)

Tables: `campaigns` (`format` is `duel` or `cup`), `campaign_sides` (cities; `grp` for cups), `campaign_members` (one side per person, baseline at join), `campaign_matches` (cup schedule), `admins`. Only one campaign is active at a time; walkers opt in to a side and cannot switch. Sides are compared by **steps per walker** so big cities have no head start.

- Two or more cities: tile shows the VS (two cities) or a pick-your-city grid; back/standings rank cities by steps per walker.
- City World Cup (`format = cup`, exactly 8 cities): two groups of 4, three matchdays, semi-finals (A1 v B2, B1 v A2), grand final. A match is decided by steps per walker over its dates; win 3 points, draw 1; tiebreak total steps per walker. Schedule and standings are computed live by `campaign_cup`, `cup_standings`, `cup_avg`, `campaign_cup_schedule`, `campaign_cup_fixtures`.
- Admin controls in **Me > Campaigns** (`am_admin`, `admin_campaigns`, `admin_set_campaign`, `admin_create_campaign`): turn on/off (turning one on turns the others off), edit title/tagline/dates, create a two-city, multi-city (3 to 12) or World Cup (8 cities, schedule spread evenly over the dates, at least 10 days) campaign. New campaigns start Off. Admins are rows in `public.admins`.
- Not yet possible: editing the city list of an existing campaign, deleting a campaign.
- **Current state**: both seeded campaigns (`sydney-v-melbourne`, `city-world-cup` for 16 to 31 Oct 2026) exist and are **Off**.
- Demo views with fake numbers (nothing saved): `?preview=capitals`, `?preview=worldcup`, `?preview=quarters` (straight quarter-final bracket).

## Data model and SQL

Run order in `supabase/`: `schema.sql`, `rivals.sql`, `dogs.sql`, `links.sql`, `teams.sql`, `packs.sql`, `campaigns.sql`. The live database is the source of truth; the SQL files are a record and some later changes are only summarised there (for example `campaign_cup` and `admin_create_campaign` are defined live only). `teams.sql` and parts of `rivals.sql` belong to the old team model, which is unused here (kept in the database for B2B, see `docs/B2B.md`).

Key tables: `profiles` (display_name, dog_id, marketing_opt_in, show_on_leaderboard, ...), `step_days` (a trigger only allows today +1 and the previous 7 days), `challenge` (the current month row, rolled by `ensure_current_challenge()`), `duels` (person tug of wars with baselines, link tokens), `packs` + `pack_members`, `dogs`, `shelters`, `dog_notes`, `campaigns*`.

Everything is accessed through SECURITY DEFINER functions granted to `authenticated`; most tables have RLS on and no policies on purpose. Dogs: Lima, Cusco, Pepper (photos in `app/dogs/`), shelter "Walkies Rescue"; the original sample dogs are inactive.

## Tests

`tests/` has the Playwright + fake-backend suite (see `tests/README.md`). Run the relevant ones before every push. Known test traps: `innerText` returns CSS-uppercased text; any RPC not mocked returns `[]`, so guard `data` checks with `.stage`/`.length`.

## Gotchas learned the hard way

- Supabase `execute_sql` through the MCP tool hangs for 60 s on statements containing the word `delete` and on UPDATEs with no WHERE. Use `execute 'dele' || 'te ...'` in functions and always add a WHERE.
- Use one statement per call for big function definitions; test logic in a `DO` block that ends with `raise exception 'RESULT: ...'` so it rolls back.
- Inline SVG sprites need explicit-size wrapper divs (a global `svg{max-width}` collapses them).
- Never define two functions with the same name in the big script (a second `bowlSvg` once replaced the Today bowl).
- `render()` rebuilds the page but now keeps the bottom tab bar element between renders so taps are not lost.
- Tab labels with `text-transform` break `innerText` assertions; CSS class names like `.live` are global, so avoid generic names.
- Apostrophes inside single-quoted JS strings in the big template have broken the whole file before. Run `node --check` on the extracted script after editing.

## Open items (none requested right now)

Phone push notifications for race alerts; privacy contact email (`PRIVACY_CONTACT` is empty) and a lawyer review of the privacy policy; Supabase Site URL and SMTP for auth emails; automatic Apple Health / Health Connect step sync; a daily target for the pink "today" ring; delete-my-account; editing a campaign's cities; a real sponsorship/fundraising flow (the tile was removed); re-running a World Cup in a later month needs a new campaign (the October one is dated).
