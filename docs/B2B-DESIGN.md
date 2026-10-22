# Walkies B2B: design (draft for owner review)

Status: **draft v2 (20 Oct 2026)**. Decisions marked *Decided* were answered by the owner; everything else is a *proposal* or an **open question**. Legal statements are marked *verify* until a lawyer confirms them. "Walkies" is a working name only (name check in progress).

## Decided

| Topic | Decision |
|---|---|
| Admin and joining | A company admin (HR / wellbeing lead) runs a dashboard. Employees join with a **verified work-email domain**; a unique invite link is a backup. SSO is later. |
| Tenancy | **Hard company boundary**, plus **open cross-company leaderboards** showing company/team totals only (never individuals). |
| Visibility of steps | **Opt-in.** By default a person sees only their own steps. Colleagues and the employer see team and company aggregates. People can opt in to appear on named leaderboards. |
| Privacy standard | **Strictest from day one**: GDPR as the baseline plus the Australian Privacy Act 1988 and APPs. Step data is treated as sensitive health information. |
| Hosting | **Supabase and Vercel, Sydney region**, on free/cheap tiers until real employee data. Plain portable Postgres and logic in database functions so a later move to AWS is easy. |
| Branding | Per-company logo, colours and name are **stored as data**, not code. |
| Employee app | **Expo (React Native) phone app** reads steps from Apple Health and Android Health Connect (decided 19 Oct 2026, branch `b2b/mobile-health`). The HR dashboard stays a web app on Vercel. |
| Cheating | Ignore hand-typed steps, count only the phone and trusted wearables, cap 60,000 steps/day, flag over 40,000. Bowls are capped per company purchase. |
| Funding and start | Self-funded. Starting from scratch: no client companies, no shelter partner yet. Reference product: Treely. |

## 1. Infrastructure

- *Decided*: new Supabase project (Sydney, `ap-southeast-2`) and new Vercel project, separate from B2C (`zzkpdkarrgsvibkxeuor`). Nothing here touches the consumer app.
- Web dashboard starts from the B2C app shell (`app/index.html`, `sw.js`, test harness), not from the old team commit. Use `2cb250a` only as reference when porting team features.
- Hosting stages (prices *verify*):

| Stage | Setup | Rough cost | Move on when |
|---|---|---|---|
| Prototype | Supabase free + Vercel hobby, fake data only | $0 | First real employee data |
| Pilots | Supabase Pro + Vercel Pro, backups, admin MFA | ~A$50-100/month | 10+ paying companies or an enterprise security review |
| Growth | Supabase Team, monitoring, pen test, SOC 2 prep | several hundred A$/month | Data residency outside AU, enterprise demand, scale |
| Scale | Postgres on AWS (RDS/Aurora), Cognito, S3, CloudFront | usage based | Planned move, a few weeks |

## 2. Data model (proposal)

Every tenant table carries `company_id`. All access goes through SECURITY DEFINER functions (as in B2C) that derive the caller's company from `auth.uid()`; tables keep RLS on with no direct policies.

- `companies` (name, slug, status, retention_days, created_at)
- `company_branding` (company_id, logo_url, primary_colour, accent_colour, display_name)
- `company_domains` (company_id, domain, verified_at). A domain belongs to one company. Verification by DNS TXT record or emailed code to an address on the domain.
- `company_admins` (company_id, user_id, role: owner/admin)
- `shelter_staff` (shelter_id, user_id, role: uploader/manager). Shelter users never see company or employee data.
- `shelter_posts` (shelter_id, dog_id, kind: photo/delivery/update, caption, kg, receipt, status: pending/approved/rejected, approved_by, created_at); files in a private Supabase Storage bucket.
- `members` (user_id, company_id, display_name, team_id, joined_at, left_at, `show_named` bool default **false**). One company per user.
- `teams` (company_id, name, office/department). Admin-managed, one team per member.
- `step_days` (user_id, day, steps, source, flagged). Only trusted sources count; manual entries are stored but never counted.
- `competitions`, `competition_sides`, `competition_entries`: B2C campaigns generalised. A side is a team, office or company. `scope`: `internal` or `cross_company`.
- `dogs`, `shelters`, `bowl_ledger` (company_id, dog_id, bowls, kg, cost, delivered_at, proof_id) and `impact_proof` (photo, receipt, shelter confirmation).
- `consent_log` (user_id, kind, version, granted_at, withdrawn_at).
- `audit_log` (actor, company_id, action, target, at) for every admin action.

### Visibility rules (enforced in functions)

| Viewer | Sees |
|---|---|
| Self | Own steps and bowls, always |
| Colleague | Team/company aggregates; named rows only for people with `show_named = true` |
| Company admin | Aggregates only, with the **small-group rule** below. Roster (name, email, team, joined) but no individual step data |
| Other companies | Company-level totals on cross-company boards only, with the same small-group rule |

### Small-group rule (decided 20 Oct 2026: small companies are included)

Companies of any size can join and compete. Step totals for a group of fewer than 5 walkers could reveal one person's steps by subtraction, so:

| Group size | What is shown |
|---|---|
| 5 or more walkers | Step totals and steps per walker |
| Under 5, every member has opted in to "show my group's totals" | Step totals and steps per walker |
| Under 5, anyone has not opted in | Bowls and dogs fed only, no step numbers |

A small company appears on cross-company boards ranked by steps per walker once all its walkers have opted in; until then it appears with bowls only. The opt-in is part of the consent screen, logged in `consent_log`, and withdrawable.

## 3. Privacy and consent (proposal, needs legal review)

- Step counts are treated as **health information** (sensitive information under the APPs, *verify*) and as **health data / special category data** under GDPR Article 9 (*verify*): explicit, separate, withdrawable consent; never a condition of employment.
- Onboarding shows what the employer sees (aggregates only) and what colleagues see (nothing named unless opted in). Consent versions are logged.
- Collect the minimum: daily step totals and source only, no GPS, no heart rate.
- **Under-18s blocked** at sign-up (date-of-birth check or attestation).
- Leaving a company: `left_at` set, personal data detached from the company; the person may keep their account, and their steps stop counting for the company.
- Retention: per-company `retention_days` for individual step rows (proposal: 13 months), aggregates kept for reporting. Delete-my-account and download-my-data are **in scope from day one**.
- **Company cancels**: individual data deleted within 30 days (proposal), aggregate impact report kept, deletion confirmed in writing.
- Employer cannot browse or export individual step data.
- Sub-processors listed in the privacy policy (Supabase, Vercel, email provider, Apple/Google health APIs). Some are offshore, which the policy must disclose (APP 8, *verify*).
- Breaches: follow the Notifiable Data Breaches scheme and GDPR 72-hour notice (*verify*); a written incident plan before pilots.
- Contracts per customer: order form, customer agreement, **data processing agreement**.
- **Open question**: privacy contact, policy text, and lawyer review before any real employee data.

## 4. Security (from day one)

- Company-boundary tests in CI: a user in company A can never read company B, run on every change.
- MFA required for company admins and for our own accounts (GitHub, Supabase, Vercel, Apple, Atlassian).
- Encryption in transit and at rest (Supabase default), secrets only in the hosting provider's secret store.
- Audit log of admin actions; least-privilege service keys; no service key in the phone app.
- Daily backups with a tested restore before pilots (Supabase Pro).
- Later: annual pen test, privacy impact assessment, security questionnaire pack, ISO 27001 / SOC 2 when an enterprise buyer asks.

## 5. Employee phone app and step sync

- Expo (React Native) app, code in `mobile/` on branch `b2b/mobile-health`. Reads daily steps from Apple HealthKit and Android Health Connect.
- Apple and Google restrict how health data can be used (no advertising, clear purpose, privacy policy): *verify* current store rules before submission.
- Anti-cheat as in the decided table: trusted sources only, daily cap, flags reviewed by us, not by the employer.
- **Inclusion**: people who cannot walk (wheelchair users, injury) need an alternative activity, for example active minutes or wheelchair pushes from Apple Health. **Open question**: which alternatives at launch.
- Not done yet: Supabase sync, sign-in and consent screens, background refresh, final bundle id (depends on the name).

## 6. Company admin area (first build)

1. Company sign-up and domain verification.
2. Roster: employees who joined, remove a person, invite link (regenerate/revoke).
3. Teams/offices: create, rename, assign (members self-select, admin can override).
4. Dashboard: active walkers, participation %, total steps, bowls and kg unlocked, team ranking. Aggregates only, minimum group size applied.
5. Competitions: create internal competitions; opt into cross-company ones.
6. Branding (logo, colours, name) and an impact report export (unique walkers, bowls, kg, proof photos).

## 7. Competitions (proposal)

- Reuse the B2C campaign engine: sides compared by **steps per walker**, baselines at join, admin-controlled on/off. Sides become teams/offices (internal) or companies (cross-company).
- Cross-company boards rank companies by steps per participating walker with the minimum size rule. Company size tiers (Pack / Big Dog / Top Dog): **open question**.
- Industry leagues (dealer vs dealer, brand vs brand): only companies that opt in themselves; using brand names such as BMW or Audi may need permission (*verify*).
- Person-vs-person challenges stay inside a company and only between people who opted in to named visibility: **open question**.

## 8. Proof of impact

- Every bowl is a row in `bowl_ledger` with a fixed cost, paid by us from the company's subscription, never "every step feeds a dog".
- Proof per delivery: shelter confirmation, receipt or photo, linked in the company's impact report.
- Claims must be truthful and specific to avoid misleading conduct under the Australian Consumer Law; state charitable fundraising rules may apply if we use a charity's name (*verify*).
- **Open question**: shelter partner, cost per bowl, and how food is bought and delivered.

### Shelter portal (proposal, 22 Oct 2026)

A phone-friendly page on the same Vercel web app (no new provider) where shelter staff sign in with an emailed link and post:
- a photo or short update for a dog;
- a delivery: date, kg received, receipt photo, linked to the bowls it covers in `bowl_ledger`.

Flow: shelter posts → status **pending** → we approve (or reject) → it appears in each sponsoring company's impact feed and report. Nothing reaches companies without our approval.

Rules: photos resized on upload and location data (EXIF GPS) stripped; no identifiable people in photos unless they signed a photo consent (*verify*); shelter staff accounts need MFA for managers; shelter agreement says who owns the photos and that we may show them to clients and on social media (*verify*).

Storage cost: Supabase Free includes 1 GB, Pro 100 GB, then US$0.0213/GB/month ([source](https://supabase.com/docs/guides/storage/pricing)). At ~300 KB per resized photo, 100 GB is about 300,000 photos, so cost is negligible.

**Pilot shortcut**: with one shelter, they can send photos by email and we upload them through the same approval screen; build the shelter login when the second shelter signs.

## 9. Money (open)

No pricing exists. Competitor prices are roughly $1 to $15 per employee per month (indicative, unverified). The numbers below must exist before the first pitch:

| Number | Value |
|---|---|
| Price per employee per month (or annual tier) | **missing** |
| Cost per bowl (food + delivery) | **missing** |
| Bowls per employee per month | **missing** |
| Hosting and support cost per employee | **missing** |
| Gross margin | **missing** |
| Sales cycle and churn | **missing** |

Nothing is built for payments until pricing is decided.

## 10. Open questions for the owner

1. Pricing model, price, and whether payments are in the first release.
2. Shelter partner and cost per bowl.
3. ~~Minimum group size~~ Decided: small-group rule (section 2).
4. One company per user (proposal: yes)?
5. Cross-company competitions need both admins' approval (proposal: yes)?
6. Company size tiers back for cross-company boards?
7. Privacy contact and lawyer review date.
8. Admins can invite other admins on day one?
9. Alternative activities for people who cannot walk.
10. Product name (affects domain, trademark and app id).

## 11. Proposed build order

1. Owner review of this doc, then create the Supabase and Vercel projects.
2. Schema + functions for companies, domains, admins, members, teams, with company-boundary tests.
3. Company admin UI.
4. Employee onboarding and consent (phone app sign-in, consent screens).
5. Steps sync, bowls, dogs and the bowl ledger.
6. Internal then cross-company competitions.
