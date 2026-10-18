# Walkies B2B: brain dump and channel map (copy of the Confluence page, session 2)

Source: Confluence space SD, page "Walkies B2B: brain dump and channel map". Items marked *verify* need a lawyer or primary source.

Idea: companies pay per employee so staff walk; every milestone unlocks a bowl of food for a shelter dog; companies and industries compete; the company gets proof of impact. For-profit with a shelter/charity partnership, not a charity. Reference product: Treely (not "Trilli").

## Channel map
Buyers (HR, wellbeing, ESG leads): pitch deck, one-pager, pilot offer, pricing, ROI, privacy pack. Employees: app, step sync, opt-in privacy. Shelters/charities: partner pitch, agreement, proof, dog visits. Sponsors: pet food, insurers, vets, health funds. Industry leagues: automotive first, then others. Brand and web: name, logo, domain, trademark. Social: LinkedIn for buyers, Instagram for dogs and impact. Tech platform. Legal and compliance. Finance.

## Business model
- Market is proven: Wellable, Vantage Fit, Walker Tracker/Terryberry, Wellstep sell to HR. Published prices about $1 to $15 per employee per month, mostly under $6 self-service (indicative only).
- Treely: one tree per 15,000 steps, time-boxed team challenges (e.g. 10 days), donations to charity for winners, phone pedometer not GPS, reports 250+ companies and 250,000+ trees since 2022. Pricing and verification of impact not found.
- Our edge: a named dog and verifiable proof (photo, visit, shelter confirmation).
- Revenue ideas: per-employee subscription with minimum; annual licence by size tier; paid leagues/events; sponsor packages; paid pilots.
- Model unit economics: price/employee, cost/employee, bowl cost, shelter share, sales cost, churn.
- Pilot first: 3 to 5 friendly companies (owner's automotive network), 4 to 8 weeks.

## Pitches: HR/companies, shelters/charities, sponsors. Investor lens: repeatable sales motion, low delivery cost, path to B2C.

## Industry competition
Dealership vs dealership, brand vs brand, industry vs industry. Using real brand names (BMW, Audi) may need permission (verify). Rank by steps per participating walker with size tiers.

## Product and tech
PWA now; Capacitor wrapper for app stores first, rebuild later if needed. Step sync via Apple HealthKit and Android Health Connect (verify policies). One design system with white-label theme; per-company branding stored as data. Hosting plan: prototype on free tiers with fake data; pilots on Supabase Pro (Sydney) + Vercel Pro (about A$50 to 100/month, verify); growth on Supabase Team, monitoring, pen test, SOC 2 prep; scale by moving Postgres to AWS (RDS/Aurora, Cognito, S3, CloudFront) when an enterprise customer, data residency or scale demands it. Keep SQL portable and logic in database functions.

## Security and privacy
GDPR baseline plus Australian Privacy Act; step data treated as sensitive health data; explicit consent, minimisation, retention limits, delete and access rights; employer sees aggregates only with minimum group size; company_id isolation with automated cross-tenant tests; encryption, MFA for admins, audit logs, tested backups; plan ISO 27001/SOC 2, annual pen test, privacy impact assessment.

## Legal and structure (verify)
Pty Ltd, shareholder agreement, IP in the company, trademarks and domain owned by the company; truthful charity claims (Australian Consumer Law); state charitable fundraising / commercial participator rules; contracts (customer, DPA, shelter, sponsor, privacy policy, terms, consent); insurance for dog visits; photo consent and ownership; GST and fund flow; voluntary participation and inclusion.

## Brand, web, social
Check "Walkies" availability and trademark; consider "Walkies for Work"; one-page website first; LinkedIn plus Instagram; monthly impact report; pilot case studies.

## Gaps added
Customer success/launch kit; challenge calendar (R U OK? Day, Steptember, Mental Health Week, January, EOFY); inclusion and alternative activities; proof of impact; anti-cheating; competitor price comparison; support and operations; advisors (HR + shelter); metrics (participation, weekly actives, retention, renewal); exit and data handling.

## Starting position
From scratch: no client companies, no shelter partner. Self-funded; free/cheap tiers fine if security is met; must scale and migrate later; pages brandable per company; owner and partner are visual.

## Risks and investor questions
Competition and long HR sales cycles; privacy incident; misleading charity claims; step-sync policy changes; founder time; seasonality and post-challenge churn. Why pay us instead of Treely or a free challenge? Price, cost to serve, margin? Sales calls and cycle length? Defensibility? Renewal? Biggest way this fails?

## Suggested first 90 days
Weeks 1-2 lawyer/accountant, name and trademark checks, pricing v1. Weeks 3-6 B2B foundation, one-page site, social, deck v1. Weeks 6-10 onboarding, consent, competitions, security review, shelter agreement. Weeks 10-13 pilot with 3 companies, impact report, decide native apps.

## Boards: (1) channel map done, (2) customer journey, (3) 90-day roadmap, (4) pitch flow.
