import {
  ComparisonPredicateOperator,
  isHealthDataAvailable,
  queryStatisticsCollectionForQuantity,
  querySources,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

import { dayWindows, finaliseDay, isTrustedIosSource, localDay, type DaySteps, type SourceReport } from './rules';

const STEPS = 'HKQuantityTypeIdentifierStepCount';

export async function connect(): Promise<boolean> {
  if (!isHealthDataAvailable()) return false;
  // Apple never says whether read access was granted, so a denial shows up as zero steps.
  return requestAuthorization({ toRead: [STEPS] });
}

export async function readDailySteps(now = new Date()): Promise<{ days: DaySteps[]; sources: SourceReport }> {
  const windows = dayWindows(now);
  const start = windows[0].start;
  const end = windows[windows.length - 1].end;

  const all = await querySources(STEPS, { date: { startDate: start, endDate: end } });
  const trusted = all.filter((s) => isTrustedIosSource(s.bundleIdentifier));
  const sources = {
    counted: trusted.map((s) => s.name),
    ignored: all.filter((s) => !trusted.includes(s)).map((s) => s.name),
  };
  if (trusted.length === 0) {
    return { days: windows.map((w) => finaliseDay(localDay(w.start), 0)), sources };
  }

  // HealthKit's statistics query removes overlap between iPhone and Watch.
  const stats = await queryStatisticsCollectionForQuantity(STEPS, ['cumulativeSum'], start, { day: 1 }, {
    unit: 'count',
    filter: {
      date: { startDate: start, endDate: end },
      sources: trusted,
      NOT: [{ metadata: { withMetadataKey: 'HKWasUserEntered', operatorType: ComparisonPredicateOperator.equalTo, value: true } }],
    },
  });

  const byDay = new Map<string, number>();
  for (const s of stats) {
    if (s.startDate) byDay.set(localDay(s.startDate), s.sumQuantity?.quantity ?? 0);
  }
  const days = windows.map((w) => finaliseDay(localDay(w.start), byDay.get(localDay(w.start)) ?? 0));
  return { days, sources };
}
