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

// Reviewers often mistype the address (apreview@fursteps.comp, eview@fursteps.coma), which used to send
// codes to nowhere. Anything that looks like the review address at a fur… domain gets the password box.
export function isReviewEmail(email: string) {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return false;
  const local = e.slice(0, at), domain = e.slice(at + 1);
  return domain.startsWith('fur') && /(view|app)/.test(local);
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

// ---- Walkies features ----

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The current calendar month in the phone's time zone; bowls reset each month like Walkies.
export function monthWindow(now = new Date()) {
  return {
    from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    today: isoDay(now),
  };
}

export type Home = {
  displayName: string; dogId: string | null; onBoard: boolean; todaySteps: number; monthSteps: number; myBowls: number;
  roundFrom: string; roundTo: string; roundDaysLeft: number;
  companyName: string; companyWalkers: number; companyBowls: number; communityWalkers: number; communityBowls: number;
};

// Bowls run in 2-week rounds that start on the day the company signed up. Leaderboards stay monthly.
let roundCache: { at: number; w: Promise<{ from: string; to: string; today: string }> } | null = null;
export function roundWindow() {
  // One lookup shared by Today, leaderboards and packs, so every screen counts the same steps.
  if (!roundCache || Date.now() - roundCache.at > 60000) roundCache = { at: Date.now(), w: fetchRound() };
  return roundCache.w;
}
async function fetchRound() {
  const today = monthWindow().today;
  const { data, error } = await supabase.rpc('my_round', { p_today: today });
  const r = (data as { round_from: string; round_to: string }[] | null)?.[0];
  if (error || !r) { roundCache = null; return { ...monthWindow(), today }; } // before the server knows rounds
  return { from: r.round_from, to: r.round_to, today };
}

export async function getHome(): Promise<Home | null> {
  const w = await roundWindow();
  const { data, error } = await supabase.rpc('my_home', { p_from: w.from, p_to: w.to, p_today: w.today });
  fail(error);
  const r = (data as Record<string, any>[] | null)?.[0];
  if (!r) return null;
  return {
    displayName: r.display_name, dogId: r.dog_id, onBoard: r.on_board, todaySteps: r.today_steps, monthSteps: Number(r.month_steps),
    myBowls: r.my_bowls, roundFrom: w.from, roundTo: w.to,
    roundDaysLeft: Math.round((Date.parse(w.to) - Date.parse(w.today)) / 86400000) + 1, companyName: r.company_name, companyWalkers: r.company_walkers, companyBowls: r.company_bowls,
    communityWalkers: r.community_walkers, communityBowls: r.community_bowls,
  };
}

export type Dog = { id: string; slug: string; name: string; age: string | null; breed: string | null; story: string | null; shelter: string };

export async function listDogs(): Promise<Dog[]> {
  const { data, error } = await supabase.rpc('list_dogs');
  fail(error);
  return (data as Dog[]) ?? [];
}

export async function chooseDog(id: string | null) {
  const { error } = await supabase.rpc('choose_dog', { p_dog: id });
  fail(error);
}

export async function setDisplayName(name: string) {
  const { error } = await supabase.rpc('set_display_name', { p_name: name });
  fail(error);
}

export type Walker = { displayName: string; dogId: string | null; steps: number; bowls: number; isMe: boolean };

export async function walkerBoard(): Promise<Walker[]> {
  const w = await roundWindow();
  const { data, error } = await supabase.rpc('walker_board', { p_from: w.from, p_to: w.to });
  fail(error);
  return ((data as Record<string, any>[]) ?? []).map((r) => ({ displayName: r.display_name, dogId: r.dog_id, steps: Number(r.steps), bowls: r.bowls, isMe: r.is_me }));
}

// Packs: teams walkers make themselves inside their own workplace.
export type Pack = {
  id: string; name: string; code: string | null; walkers: number; stepsPerWalker: number | null; bowls: number; isMine: boolean; isOwner: boolean;
};

export async function packBoard(): Promise<Pack[]> {
  const w = await roundWindow();
  const { data, error } = await supabase.rpc('pack_board', { p_from: w.from, p_to: w.to });
  fail(error);
  return ((data as Record<string, any>[]) ?? []).map((r) => ({
    id: r.id, name: r.name, code: r.code, walkers: r.walkers, stepsPerWalker: r.steps_per_walker == null ? null : Number(r.steps_per_walker),
    bowls: r.bowls, isMine: r.is_mine, isOwner: r.is_owner,
  }));
}

export type PackPerson = Walker;
export async function packPeople(id: string): Promise<{ people: PackPerson[]; hidden: number }> {
  const w = await roundWindow();
  const { data, error } = await supabase.rpc('pack_people', { p_id: id, p_from: w.from, p_to: w.to });
  fail(error);
  const rows = (data as Record<string, any>[]) ?? [];
  return {
    people: rows.map((r) => ({ displayName: r.display_name, dogId: r.dog_id, steps: Number(r.steps), bowls: r.bowls, isMe: r.is_me })),
    hidden: rows[0]?.hidden ?? 0,
  };
}

export async function createPack(name: string): Promise<{ id: string; code: string }> {
  const { data, error } = await supabase.rpc('create_pack', { p_name: name });
  fail(error);
  const r = (data as Record<string, any>[])[0];
  return { id: r.id, code: r.code };
}

export async function joinPack(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_pack_by_id', { p_id: id });
  fail(error);
  return data as string;
}

export async function leavePack(id: string) {
  const { error } = await supabase.rpc('leave_pack', { p_id: id });
  fail(error);
}

export async function renamePack(id: string, name: string) {
  const { error } = await supabase.rpc('rename_pack', { p_id: id, p_name: name });
  fail(error);
}

// Tug of War: 1-v-1 step duels between two colleagues.
export type Duel = {
  id: string; code: string | null; days: number; startsOn: string | null; endsOn: string | null;
  status: 'pending' | 'active' | 'finished'; isChallenger: boolean;
  opponentName: string | null; opponentDog: string | null; mySteps: number; theirSteps: number;
};

export async function myDuels(): Promise<Duel[]> {
  const { data, error } = await supabase.rpc('my_duels', { p_today: monthWindow().today });
  fail(error);
  return ((data as Record<string, any>[]) ?? []).map((r) => ({
    id: r.id, code: r.code, days: r.days, startsOn: r.starts_on, endsOn: r.ends_on, status: r.status, isChallenger: r.is_challenger,
    opponentName: r.opponent_name, opponentDog: r.opponent_dog, mySteps: Number(r.my_steps), theirSteps: Number(r.their_steps),
  }));
}

export type Colleague = { id: string; displayName: string; dogId: string | null };

// Colleagues on the named leaderboard at your company, the only people you can challenge.
export async function tugColleagues(): Promise<Colleague[]> {
  const { data, error } = await supabase.rpc('tug_colleagues');
  fail(error);
  return ((data as Record<string, any>[]) ?? []).map((r) => ({ id: r.user_id, displayName: r.display_name, dogId: r.dog_id }));
}

export async function challengeColleague(opponentId: string, days: number) {
  const { error } = await supabase.rpc('challenge_colleague', { p_opponent: opponentId, p_days: days, p_today: monthWindow().today });
  fail(error);
}

export async function acceptDuel(id: string) {
  const { error } = await supabase.rpc('accept_duel_by_id', { p_id: id, p_today: monthWindow().today });
  fail(error);
}

export async function declineDuel(id: string) {
  const { error } = await supabase.rpc('decline_duel', { p_id: id });
  fail(error);
}

export async function cancelDuel(id: string) {
  const { error } = await supabase.rpc('cancel_duel', { p_id: id });
  fail(error);
}

// Showing your name on the leaderboard is a separate, logged consent.
export async function setOnBoard(on: boolean) {
  const { error } = on
    ? await supabase.rpc('give_consent', { p_kind: 'named_leaderboard', p_version: CONSENT_VERSION })
    : await supabase.rpc('withdraw_consent', { p_kind: 'named_leaderboard' });
  fail(error);
}

// Stops step reading and deletes the step history on the server.
export async function withdrawStepConsent() {
  const { error } = await supabase.rpc('withdraw_consent', { p_kind: 'steps' });
  fail(error);
}

export type CompanyRow = { name: string; emoji: string | null; walkers: number; stepsPerWalker: number | null; bowls: number; isMine: boolean };

// Your company against the others: totals only, never another company's people.
export async function companyBoard(): Promise<CompanyRow[]> {
  const w = await roundWindow();
  const { data, error } = await supabase.rpc('company_board', { p_from: w.from, p_to: w.to });
  fail(error);
  return ((data as Record<string, any>[]) ?? []).map((r) => ({
    name: r.name, emoji: r.industry_emoji, walkers: r.walkers, stepsPerWalker: r.steps_per_walker, bowls: r.bowls, isMine: r.is_mine,
  }));
}

export async function myAllTimeBowls(): Promise<number> {
  const { data, error } = await supabase.rpc('my_all_time');
  fail(error);
  return Number((data as Record<string, any>[])?.[0]?.bowls ?? 0);
}
