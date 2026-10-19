// Anti-cheat and privacy rules shared by the iOS and Android readers.
// Only a daily total per local calendar day ever leaves the phone.

export type DaySteps = { day: string; steps: number; flagged: boolean };

export type SourceReport = { counted: string[]; ignored: string[] };

// Matches the check on public.step_days in supabase/schema.sql.
export const DAILY_CAP = 60000;

// Above this a day still counts but is flagged for review.
export const FLAG_ABOVE = 40000;

export const DAYS_BACK = 7;

// Apple's own iPhone and Watch sources use bundle ids starting with this.
export const APPLE_SOURCE_PREFIX = 'com.apple.health';

// Third-party apps whose steps come from a wearable sensor. Anything else
// (for example a "step booster" app) is ignored. Verify ids on real devices.
export const IOS_TRUSTED_SOURCES = [
  'com.garmin.connect.mobile',
  'com.ouraring.oura',
];

export const ANDROID_TRUSTED_ORIGINS = [
  'android', // on-device step counting (Android 14+); verify
  'com.google.android.apps.fitness',
  'com.sec.android.app.shealth',
  'com.fitbit.FitbitMobile',
  'com.garmin.android.apps.connectmobile',
  'com.ouraring.oura',
];

export function isTrustedIosSource(bundleId: string): boolean {
  return bundleId.startsWith(APPLE_SOURCE_PREFIX) || IOS_TRUSTED_SOURCES.includes(bundleId);
}

export function localDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// The local days to read, oldest first, ending today.
export function dayWindows(now: Date, daysBack = DAYS_BACK): { start: Date; end: Date }[] {
  const today = startOfDay(now);
  const out = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    out.push({ start, end });
  }
  return out;
}

export function finaliseDay(day: string, rawSteps: number): DaySteps {
  const steps = Math.min(Math.max(0, Math.round(rawSteps)), DAILY_CAP);
  return { day, steps, flagged: rawSteps > FLAG_ABOVE };
}
