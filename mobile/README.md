# FurSteps mobile (employee app)

Expo (React Native) app that reads daily step totals from Apple Health (iOS) and Health Connect (Android). A website can't read either, so employees need this app; the HR dashboard stays on the web.

## What it reads

One number per local day for the last 7 days. No location, heart rate or raw samples.

## Anti-cheat rules (`src/steps/rules.ts`)

| Rule | iOS | Android |
|---|---|---|
| Hand-typed steps ignored | HealthKit `HKWasUserEntered` excluded in the query | Manual-entry records subtracted from the aggregate |
| Only trusted sources | Apple iPhone/Watch plus a wearable allow-list | Data-origin allow-list |
| Daily cap | 60,000 (same as `step_days` check) | same |
| Flag for review | over 40,000 | same |

Overlap between phone and watch is removed by the platform's own aggregate queries.

## Not done yet

- Custom email sender (Zoho SMTP) in Supabase Auth, and the email template showing the 6-digit code (`{{ .Token }}`). Supabase's built-in sender only mails project team members and is heavily rate-limited.
- Team and dog picking, leaving and deleting from inside the app (backend functions exist).
- Background refresh (HealthKit background delivery, Health Connect background read).
- Bundle id and Android package: `com.fursteps.app` (reserved in App Store Connect, Apple ID 6829087926).
- Allow-listed source ids marked "verify" in `rules.ts` must be checked on real devices (the app shows counted and ignored sources).

## Backend

Supabase project `fursteps-b2b` (Sydney). SQL lives in `../supabase-b2b/`. The app signs in with an emailed code, joins the company that owns the email's verified domain, logs consent, then calls `sync_steps`. A test company "FurSteps (test)" owns `fursteps.com`.

## Commands

```bash
npm install
npm test            # rule tests
npm run typecheck
npx eas build --profile development --platform ios   # needs Expo account + Apple Developer account
```

Expo Go can't load HealthKit or Health Connect; use a development build.
