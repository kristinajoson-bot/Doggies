import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import type { DaySteps } from './steps';

// Public by design: the publishable key only reaches the functions granted to signed-in users.
const SUPABASE_URL = 'https://eadynnzljcijueshxsgg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NsNTh1EYRq_5fM8VQt18kA_7PLbzIuv';

export const CONSENT_VERSION = '2026-10-v1';

// The keychain can't hold large values, so the session is split into chunks.
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (!count) return null;
    let out = '';
    for (let i = 0; i < Number(count); i++) out += (await SecureStore.getItemAsync(`${key}.${i}`)) ?? '';
    return out;
  },
  async setItem(key: string, value: string) {
    await secureStorage.removeItem(key);
    const parts = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < parts; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${key}.n`, String(parts));
  },
  async removeItem(key: string) {
    const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Only refresh tokens while the app is open.
AppState.addEventListener('change', (s) => {
  if (s === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
  fail(error);
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' });
  fail(error);
}

// Apple's reviewers can't receive our email codes, so this one account signs in with a password instead.
export const REVIEW_EMAIL = 'appreview@fursteps.com';

export function isReviewEmail(email: string) {
  return email.trim().toLowerCase() === REVIEW_EMAIL;
}

export async function signInForReview(password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: REVIEW_EMAIL, password });
  fail(error);
}

export async function joinCompany() {
  const { error } = await supabase.rpc('join_company_by_email');
  fail(error);
}

export async function giveStepConsent() {
  const { error } = await supabase.rpc('give_consent', { p_kind: 'steps', p_version: CONSENT_VERSION });
  fail(error);
}

export async function syncSteps(days: DaySteps[], source: 'apple_health' | 'health_connect') {
  const { data, error } = await supabase.rpc('sync_steps', { p_days: days, p_source: source });
  fail(error);
  return data as number;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export type Status = { companyName: string; hasStepConsent: boolean } | null;

export async function getStatus(): Promise<Status> {
  const { data, error } = await supabase.rpc('my_status');
  fail(error);
  const row = (data as { company_name: string; has_step_consent: boolean }[] | null)?.[0];
  return row ? { companyName: row.company_name, hasStepConsent: row.has_step_consent } : null;
}
