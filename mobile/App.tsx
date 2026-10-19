import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { connect, healthStoreName, readDailySteps, type DaySteps, type SourceReport } from './src/steps';

type State =
  | { kind: 'intro' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; days: DaySteps[]; sources: SourceReport };

export default function App() {
  const [state, setState] = useState<State>({ kind: 'intro' });

  async function load(askFirst: boolean) {
    setState({ kind: 'loading' });
    try {
      if (askFirst && !(await connect())) {
        setState({ kind: 'error', message: `${healthStoreName} isn't available or access was not given.` });
        return;
      }
      const { days, sources } = await readDailySteps();
      setState({ kind: 'ready', days, sources });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Walkies</Text>

      {state.kind === 'intro' && (
        <View style={styles.card}>
          <Text style={styles.h2}>Connect your steps</Text>
          <Text style={styles.p}>We read one number per day from {healthStoreName}: your step total. Nothing else, no location, no heart rate.</Text>
          <Text style={styles.p}>Steps you type in by hand, and steps from apps that aren't step trackers, don't count.</Text>
          <Text style={styles.p}>Your employer only sees team totals, never your steps.</Text>
          <Pressable style={styles.button} onPress={() => load(true)}>
            <Text style={styles.buttonText}>Connect {healthStoreName}</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'loading' && <Text style={styles.p}>Reading your steps…</Text>}

      {state.kind === 'error' && (
        <View style={styles.card}>
          <Text style={styles.p}>{state.message}</Text>
          <Pressable style={styles.button} onPress={() => load(true)}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'ready' && (
        <View style={styles.card}>
          <Text style={styles.h2}>Last 7 days</Text>
          {state.days.map((d) => (
            <View key={d.day} style={styles.row}>
              <Text style={styles.p}>{d.day}</Text>
              <Text style={styles.steps}>{d.steps.toLocaleString()}{d.flagged ? ' ⚑' : ''}</Text>
            </View>
          ))}
          <Text style={styles.small}>Counted: {state.sources.counted.join(', ') || 'none'}</Text>
          <Text style={styles.small}>Ignored: {state.sources.ignored.join(', ') || 'none'}</Text>
          <Pressable style={styles.button} onPress={() => load(false)}>
            <Text style={styles.buttonText}>Refresh</Text>
          </Pressable>
        </View>
      )}

      <StatusBar style="auto" />
    </ScrollView>
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
  button: { backgroundColor: '#2E6B4F', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
