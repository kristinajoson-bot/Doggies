import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getStatus, giveStepConsent, isReviewEmail, joinCompany, sendCode, signInForReview, signOut, supabase, syncSteps, verifyCode } from './src/backend';
import { connect, healthStoreName, readDailySteps, type DaySteps, type SourceReport } from './src/steps';

type Screen =
  | { kind: 'loading' }
  | { kind: 'email' }
  | { kind: 'code'; email: string }
  | { kind: 'consent'; companyName: string }
  | { kind: 'steps'; companyName: string; days?: DaySteps[]; sources?: SourceReport; saved?: number };

const source = Platform.OS === 'ios' ? 'apple_health' : 'health_connect';

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterSignIn() {
    let status = await getStatus();
    if (!status) {
      await joinCompany();
      status = await getStatus();
    }
    if (!status) throw new Error('Could not join your workplace');
    setScreen(status.hasStepConsent ? { kind: 'steps', companyName: status.companyName } : { kind: 'consent', companyName: status.companyName });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return setScreen({ kind: 'email' });
      afterSignIn().catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setScreen({ kind: 'email' });
      });
    });
  }, []);

  async function readAndSync(companyName: string, askFirst: boolean) {
    if (askFirst && !(await connect())) throw new Error(`${healthStoreName} isn't available or access was not given.`);
    const { days, sources } = await readDailySteps();
    const saved = await syncSteps(days, source);
    setScreen({ kind: 'steps', companyName, days, sources, saved });
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>FurSteps</Text>

      {screen.kind === 'loading' && <Text style={styles.p}>Loading…</Text>}

      {screen.kind === 'email' && (
        <View style={styles.card}>
          <Text style={styles.h2}>Sign in with your work email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@company.com"
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          {isReviewEmail(email) ? (
            <>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password"
                secureTextEntry autoCapitalize="none" />
              <Button label="Sign in" busy={busy} onPress={() => run(async () => {
                await signInForReview(password);
                await afterSignIn();
              })} />
            </>
          ) : (
            <Button label="Send me a code" busy={busy} onPress={() => run(async () => {
              await sendCode(email);
              setScreen({ kind: 'code', email });
            })} />
          )}
        </View>
      )}

      {screen.kind === 'code' && (
        <View style={styles.card}>
          <Text style={styles.h2}>Check your email</Text>
          <Text style={styles.p}>We sent a code to {screen.email}.</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Code"
            keyboardType="number-pad" autoComplete="one-time-code" />
          <Button label="Sign in" busy={busy} onPress={() => run(async () => {
            await verifyCode(screen.email, code);
            await afterSignIn();
          })} />
        </View>
      )}

      {screen.kind === 'consent' && (
        <View style={styles.card}>
          <Text style={styles.h2}>Your steps, your choice</Text>
          <Text style={styles.p}>FurSteps reads one number per day from {healthStoreName}: your step total. No location, no heart rate.</Text>
          <Text style={styles.p}>{screen.companyName} only sees team totals, never your steps. Teams under 5 people show no step totals unless everyone agrees.</Text>
          <Text style={styles.p}>Steps typed in by hand don't count. You can withdraw any time, and your step history is then deleted.</Text>
          <Text style={styles.p}>Joining is optional and not a condition of your job.</Text>
          <Button label="I agree, connect my steps" busy={busy} onPress={() => run(async () => {
            await giveStepConsent();
            await readAndSync(screen.companyName, true);
          })} />
        </View>
      )}

      {screen.kind === 'steps' && (
        <View style={styles.card}>
          <Text style={styles.h2}>{screen.companyName}: last 7 days</Text>
          {screen.days?.map((d) => (
            <View key={d.day} style={styles.row}>
              <Text style={styles.p}>{d.day}</Text>
              <Text style={styles.steps}>{d.steps.toLocaleString()}{d.flagged ? ' ⚑' : ''}</Text>
            </View>
          ))}
          {screen.sources && (
            <>
              <Text style={styles.small}>Counted: {screen.sources.counted.join(', ') || 'none'}</Text>
              <Text style={styles.small}>Ignored: {screen.sources.ignored.join(', ') || 'none'}</Text>
              <Text style={styles.small}>Saved {screen.saved} days.</Text>
            </>
          )}
          <Button label={screen.days ? 'Refresh' : `Sync from ${healthStoreName}`} busy={busy}
            onPress={() => run(() => readAndSync(screen.companyName, !screen.days))} />
          <Pressable onPress={() => run(async () => { await signOut(); setScreen({ kind: 'email' }); })}>
            <Text style={styles.link}>Sign out</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

function Button({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, busy && styles.busy]} onPress={onPress} disabled={busy}>
      <Text style={styles.buttonText}>{busy ? 'One moment…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 72, gap: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  card: { backgroundColor: '#F4F1EA', borderRadius: 16, padding: 20, gap: 10 },
  h2: { fontSize: 20, fontWeight: '600' },
  p: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 13, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  steps: { fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#2E6B4F', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  busy: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#2E6B4F', textAlign: 'center', marginTop: 8 },
  error: { color: '#B00020', fontSize: 15 },
});
