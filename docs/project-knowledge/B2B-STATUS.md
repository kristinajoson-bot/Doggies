# Walkies B2B: status and hand-off (as of 18 Oct 2026)

Read this first in a new chat. It says what exists, what is open and what to do next.

## Where things live
- Confluence (site kristinajoson.atlassian.net, space SD "Software Development"):
  - Launch plan page: /wiki/spaces/SD/pages/65802
  - Brain dump page (parent: launch plan): /wiki/spaces/SD/pages/360450 (version 2, includes section 13 update)
  - Board 1, channel map (mind map): /wiki/spaces/SD/whiteboard/65818
- Jira (same site): project KAN "Walkies" (use as B2C or rename). No B2B Jira project yet. Free plan; epics, stories and tasks with parent links work. Claude cannot create Jira projects and cannot delete issues; the owner does both in the Jira UI.
- GitHub: kristinajoson-bot/doggies, branch b2b/design-doc (docs/B2B-DESIGN.md, CLAUDE.md, docs/B2B-PROJECT-INSTRUCTIONS.md, docs/project-knowledge/). B2C branch is claude/hopeful-johnson-59a7hr and must not be changed. No pull request unless asked.

## Decided
- HR admin plus verified work-email domain; invite link as backup; SSO later.
- Hard company boundary; cross-company leaderboards show company/team totals only.
- Step visibility opt-in; employer sees aggregates only (proposal: minimum group size 5).
- Reference product is Treely. Starting from scratch: no client companies, no shelter partner.
- Self-funded. Start on Supabase and Vercel (Sydney), free/cheap tiers, keep SQL portable for a later AWS move. Per-company branding stored as data.
- Strictest privacy and security from day one (GDPR baseline plus Australian Privacy Act). Step data is sensitive.
- Owner and partner are visual: prefer boards and diagrams. Claude acts as a critical investor and mentor.

## Open items for the owner
- Create Jira project key B2B (Free, team-managed). Delete test issues KAN-4 to KAN-9 (two epics with children).
- Decide whether KAN becomes B2C or a new B2C project is made.
- First 3 pilot companies (automotive network) and a shelter partner to approach.
- Minimum group size, one company per user, cross-company approval, size tiers back or not, privacy contact and lawyer review, pricing, whether admins can invite admins.
- Name check for "Walkies" (trademark, domain) before logo work.
- Treely research: pricing, sales approach, how they prove impact.

## Next
1. Board 2 customer journey (HR buyer, first contact to renewal), then board 3 90-day roadmap, then board 4 pitch flow, one at a time. Board 1 was built but not visually checked by Claude (no screenshot tool); owner to confirm it looks right.
2. Once Jira B2B exists: create 8 epics (Foundations, Tenancy and security, Company admin area, Employee onboarding and consent, Steps/bowls/dogs, Competitions, Privacy and legal, Business model and go-to-market), then stories and tasks, shown to the owner for approval before creation.
3. Keep adding to the Confluence brain dump as ideas arise.

## Notes for Claude
- Confluence and Jira writes need the Atlassian connector enabled in the chat. Check it is on in this project.
- Whiteboards use SVG; mind map nodes must share one orientation. Build and read back, but visual proof needs the owner.
