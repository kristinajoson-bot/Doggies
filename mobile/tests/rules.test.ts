import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DAILY_CAP, dayWindows, finaliseDay, isTrustedIosSource, localDay } from '../src/steps/rules.ts';

test('seven local days ending today, oldest first', () => {
  const w = dayWindows(new Date(2026, 9, 19, 15, 30));
  assert.equal(w.length, 7);
  assert.equal(localDay(w[0].start), '2026-10-13');
  assert.equal(localDay(w[6].start), '2026-10-19');
  assert.equal(localDay(w[6].end), '2026-10-20');
});

test('caps, rounds and flags', () => {
  assert.deepEqual(finaliseDay('d', 1234.6), { day: 'd', steps: 1235, flagged: false });
  assert.deepEqual(finaliseDay('d', 45000), { day: 'd', steps: 45000, flagged: true });
  assert.equal(finaliseDay('d', 99999).steps, DAILY_CAP);
  assert.equal(finaliseDay('d', -5).steps, 0);
});

test('only Apple and wearable sources count on iOS', () => {
  assert.ok(isTrustedIosSource('com.apple.health.81AF2C3B-1234'));
  assert.ok(isTrustedIosSource('com.garmin.connect.mobile'));
  assert.ok(!isTrustedIosSource('com.example.stepbooster'));
});
