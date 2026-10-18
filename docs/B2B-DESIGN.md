# Walkies B2B: design (draft for owner review)

Status: **draft**. Decisions marked *Decided* were answered by the owner; everything else is a *proposal* or an **open question**. No code or infrastructure has been created yet.

## Decided

| Topic | Decision |
|---|---|
| Admin and joining | A company admin (HR / wellbeing lead) runs a dashboard. Employees join with a **verified work-email domain**; a unique invite link is a backup. SSO is later. |
| Tenancy | **Hard company boundary**, plus **open cross-company leaderboards** showing company/team totals only (never individuals). |
| Visibility of steps | **Opt-in.** By default a person sees only their own steps. Colleagues and the employer see team and company aggregates. People can opt in to appear on named leaderboards. |
| First deliverable | This design doc, before any code or infrastructure. |

## 1. Infrastructure (proposal)

- New Supabase project (Sydney, `ap-southeast-2`) and new Vercel project, separate from B2C (`zzkpdkarrgsvibkxeuor`). Nothing here touches the consumer app.
- Start from the B2C app shell (`app/index.html`, `sw.js`, test harness), not from the old team commit. Use `2cb250a` only as reference when porting team features.

## 2. Data model (proposal)

Every tenant table carries `company_id`. All access goes through SECURITY DEFINER functions (as in B2C) that derive the caller's company from `auth.uid()`; tables keep RLS on with no direct policies.

- `companies` (name, slug, logo, status, retention_days, created_at)
- `company_domains` (company_id, domain, verified_at). A domain belongs to one company. Verification by DNS TXT record or emailed code to an address on the domain.
- `company_admins` (company_id, user_id, role: owner/admin)
- `members` (user_id, company_id, display_name, team_id, joined_at, left_at, `show_named` bool default **false**). One company per user.
- `teams` (company_id, name, office/department). Admin-managed, so no captain/join-code model. Home-team rule is probably unnecessary: one team per member.
- `step_days` as in B2C (same date-window trigger), keyed by user.
- `competitions`, `competition_sides`, `competition_entries`: B2C campaigns generalised. A side is a team, office or company. `scope`: `internal` (within one company) or `cross_company`.
- `dogs`, `shelters`, bowl/milestone tables carried over from B2C.
- `consent_log` (user_id, kind, version, granted_at, withdrawn_at).

### Visibility rules (enforced in functions)

| Viewer | Sees |
|---|---|
| Self | Own steps and bowls, always |
| Colleague | Team/company aggregates; named rows only for people with `show_named = true` |
| Company admin | Aggregates only, with a **minimum group size (suggest 5)** so a team of 1-2 cannot expose an individual. Roster (name, email, team, joined) but no individual step data |
| Other companies | Company-level totals on cross-company boards only, subject to the same minimum size |

## 3. Privacy and consent (proposal, needs legal review)

- Step counts are treated as health-related information under the Privacy Act 1988 (Cth): collect with **explicit, separate, withdrawable consent**; not a condition of employment.
- Onboarding shows what the employer sees (aggregates only) and what colleagues see (nothing named unless opted in). Consent versions are logged.
- Leaving a company (admin removal or self-service): `left_at` set, personal data detached from the company; person keeps their account if they want, with steps no longer counting for the company.
- Retention: per-company `retention_days` for individual step rows, aggregates kept for reporting. Delete-my-account is **in scope from day one** (B2C lacks it).
- Employer cannot browse or export individual step data.
- **Open question**: privacy contact, policy text, and lawyer review before any real employee data.

## 4. Company admin area (first build)

1. Company sign-up and domain verification.
2. Roster: employees who joined, remove a person, invite link (regenerate/revoke).
3. Teams/offices: create, rename, assign (members can self-select within the company, admin can override).
4. Dashboard: active walkers, participation %, total steps, bowls and kg unlocked, team ranking. Aggregates only, minimum group size applied.
5. Competitions: create internal competitions; opt into cross-company ones.
6. Branding: logo, name; reporting export (unique walkers, bowls, kg) for sponsors.

Then employee onboarding (join by domain, consent screen, pick team, pick dog), then competitions.

## 5. Competitions (proposal)

- Reuse the B2C campaign engine: sides compared by **steps per walker**, baselines at join, admin-controlled on/off. Sides become teams/offices (internal) or companies (cross-company).
- Cross-company boards rank companies by steps per participating walker and apply the minimum size rule. Company size tiers (Pack / Big Dog / Top Dog) could return so small firms are not drowned out: **open question**.
- Person-vs-person tug of war and pack wars probably stay inside a company and only between people who opted in to named visibility: **open question**.

## 6. Money (open)

No pricing exists. Options to discuss: per-employee subscription, flat annual fee by size tier, company-sponsored bowls with a transparent kg/bowl report. Nothing is built for payments until decided.

## 7. Branding (open)

Company logo and colours are in scope for the admin area. Custom dogs or shelters per company are not decided.

## 8. Open questions for the owner

1. Minimum group size for any aggregate shown (proposal: 5). Does a company smaller than that get any dashboard?
2. Does a user ever belong to more than one company (contractors)? Proposal: one.
3. Do cross-company competitions need approval from both companies' admins? Proposal: yes, admin opt-in per competition.
4. Are company size tiers back for cross-company boards?
5. Who is the legal/privacy contact, and when is the lawyer review?
6. Pricing model and whether payments are in the first release.
7. Do admins need to be able to invite additional admins on day one?

## 9. Proposed build order

1. Owner review of this doc, then create the Supabase and Vercel projects.
2. Schema + functions for companies, domains, admins, members, teams, with company-boundary tests (a user in company A can never read company B).
3. Company admin UI.
4. Employee onboarding and consent.
5. Port steps, bowls and dogs from B2C.
6. Internal then cross-company competitions.
