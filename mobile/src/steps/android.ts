import {
  aggregateRecord,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  RecordingMethod,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { ANDROID_TRUSTED_ORIGINS, dayWindows, finaliseDay, localDay, type DaySteps, type SourceReport } from './rules';

export async function connect(): Promise<boolean> {
  if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  if (!(await initialize())) return false;
  const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
  return granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
}

async function readDay(start: Date, end: Date, origins: Set<string>, manual: { total: number }) {
  const timeRangeFilter = { operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() };

  // Health Connect's aggregate removes overlap between apps writing the same walk.
  const agg = await aggregateRecord({ recordType: 'Steps', timeRangeFilter, dataOriginFilter: ANDROID_TRUSTED_ORIGINS });

  // Aggregates can't exclude hand-typed records, so subtract them.
  let typed = 0;
  let pageToken: string | undefined;
  do {
    const page = await readRecords('Steps', { timeRangeFilter, pageToken });
    for (const r of page.records) {
      const origin = r.metadata?.dataOrigin ?? 'unknown';
      origins.add(origin);
      if (ANDROID_TRUSTED_ORIGINS.includes(origin) && r.metadata?.recordingMethod === RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY) {
        typed += r.count;
      }
    }
    pageToken = page.pageToken || undefined;
  } while (pageToken);

  manual.total += typed;
  return Math.max(0, agg.COUNT_TOTAL - typed);
}

export async function readDailySteps(now = new Date()): Promise<{ days: DaySteps[]; sources: SourceReport }> {
  const origins = new Set<string>();
  const manual = { total: 0 };
  const days: DaySteps[] = [];
  for (const w of dayWindows(now)) {
    days.push(finaliseDay(localDay(w.start), await readDay(w.start, w.end, origins, manual)));
  }
  const all = [...origins];
  const sources = {
    counted: all.filter((o) => ANDROID_TRUSTED_ORIGINS.includes(o)),
    ignored: all.filter((o) => !ANDROID_TRUSTED_ORIGINS.includes(o)),
  };
  return { days, sources };
}
