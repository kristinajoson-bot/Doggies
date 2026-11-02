import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, AppState, Share, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFonts } from 'expo-font';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { GeistMono_500Medium, GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono';
import { Bungee_400Regular } from '@expo-google-fonts/bungee';

import {
  chooseDog, createPack, getHome, joinPack, leavePack, packBoard, packPeople, renamePack, getStatus, giveStepConsent, isReviewEmail, joinCompany, listDogs, monthWindow, sendCode, setDisplayName,
  setOnBoard, signInForReview, signOut, supabase, syncSteps, verifyCode, walkerBoard, withdrawStepConsent,
  type Dog, type Home, type Pack, type Walker,
} from './src/backend';
import { connect, healthStoreName, readDailySteps } from './src/steps';
import {
  Celebrate, ChallengesScreen, type PackActions, DogScreen, DogsScreen, ImpactScreen, LeaderboardScreen, MILESTONES, MeScreen, TodayScreen,
} from './src/screens';
import { TabIcon } from './src/ui/art';
import { Btn, Glow, TopBar } from './src/ui/kit';
import { C, F, S, glow } from './src/ui/theme';

type Tab = 'today' | 'rivals' | 'packs' | 'impact' | 'me';
type View_ =
  | { kind: 'loading' }
  | { kind: 'email' }
  | { kind: 'code'; email: string }
  | { kind: 'consent'; companyName: string }
  | { kind: 'app' };

const TABS: [Tab, string][] = [['today', 'Today'], ['rivals', 'Challenges'], ['packs', 'Leaderboard'], ['impact', 'Impact'], ['me', 'Me']];
const source = Platform.OS === 'ios' ? 'apple_health' : 'health_connect';

export default function App() {
  const [fontsReady] = useFonts({
    BricolageGrotesque_800ExtraBold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, GeistMono_500Medium, GeistMono_600SemiBold, Bungee_400Regular,
  });
  const [view, setView] = useState<View_>({ kind: 'loading' });
  const [tab, setTab] = useState<Tab>('today');
  const [sub, setSub] = useState<{ kind: 'dogs' } | { kind: 'dog'; dog: Dog } | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [lbStart, setLbStart] = useState<'walkers' | 'packs'>('walkers');
  const [userEmail, setUserEmail] = useState('');
  const [celebrate, setCelebrate] = useState<{ bowls: number; steps: number } | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

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

  const loadAll = useCallback(async () => {
    const [h, d, w, k] = await Promise.all([getHome(), listDogs(), walkerBoard(), packBoard().catch(() => [] as Pack[])]);
    setHome(h);
    setDogs(d);
    setWalkers(w);
    setPacks(k);
    return h;
  }, []);

  // A new bowl since the last time this phone looked shows the celebration.
  async function checkNewBowls(h: Home | null) {
    if (!h) return;
    const key = `fursteps.bowls.${monthWindow().from}`;
    const seen = Number((await SecureStore.getItemAsync(key)) ?? 0);
    if (h.myBowls > seen) setCelebrate({ bowls: h.myBowls - seen, steps: h.monthSteps });
    await SecureStore.setItemAsync(key, String(h.myBowls));
  }

  async function syncFromHealth(askFirst: boolean) {
    if (askFirst && !(await connect())) throw new Error(`${healthStoreName} isn't available or access was not given.`);
    const { days } = await readDailySteps();
    await syncSteps(days, source);
    await checkNewBowls(await loadAll());
  }

  async function afterSignIn() {
    const { data } = await supabase.auth.getUser();
    setUserEmail(data.user?.email ?? '');
    let status = await getStatus();
    if (!status) {
      await joinCompany();
      status = await getStatus();
    }
    if (!status) throw new Error('Could not join your workplace');
    if (!status.hasStepConsent) return setView({ kind: 'consent', companyName: status.companyName });
    setView({ kind: 'app' });
    await loadAll();
    await syncFromHealth(true).catch(() => undefined);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return setView({ kind: 'email' });
      afterSignIn().catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setView({ kind: 'email' });
      });
    });
  }, []);

  // Pick up new steps whenever the app comes back to the front.
  useEffect(() => {
    const s = AppState.addEventListener('change', (st) => {
      if (st === 'active' && view.kind === 'app') syncFromHealth(true).catch(() => undefined);
    });
    return () => s.remove();
  }, [view.kind]);

  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const myDog = home?.dogId ? dogs.find((d) => d.id === home.dogId) ?? null : null;
  const goTab = (t: Tab) => { setSub(null); setTab(t); scroll.current?.scrollTo({ y: 0, animated: false }); };

  if (view.kind !== 'app' || !home) {
    return (
      <Glow>
        <ScrollView contentContainerStyle={[S.page, { paddingTop: 64, gap: 18 }]} keyboardShouldPersistTaps="handled">
          <TopBar />
          {view.kind === 'loading' || (view.kind === 'app' && !home) ? (
            <Text style={S.muted}>Loading your bowl…</Text>
          ) : view.kind === 'email' ? (
            <>
              <Text style={[S.h1, { fontSize: 44, lineHeight: 45 }]}>Walk. Fill a bowl. Feed a rescue dog.</Text>
              <Text style={[S.p, { fontSize: 17 }]}>Every scoop you unlock is a bowl of food for a shelter dog. Walk on your own, or take on your colleagues.</Text>
              <View style={a.form}>
                <Text style={S.label}>Your work email</Text>
                <TextInput style={S.input} value={email} onChangeText={setEmail} placeholder="you@company.com" placeholderTextColor={C.muted}
                  autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
                {isReviewEmail(email) && (
                  <>
                    <Text style={S.label}>Password</Text>
                    <TextInput style={S.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
                  </>
                )}
                {error && <Text style={S.err}>{error}</Text>}
                <Btn kind="coral" busy={busy} label={isReviewEmail(email) ? 'Sign in' : 'Email me a code'} onPress={() => run(async () => {
                  if (isReviewEmail(email)) {
                    await signInForReview(password);
                    await afterSignIn();
                  } else {
                    await sendCode(email);
                    setCode('');
                    setView({ kind: 'code', email });
                  }
                })} />
              </View>
              <Text style={[S.p, { fontSize: 13, textAlign: 'center' }]}>Free for staff. We only read your step count.</Text>
            </>
          ) : view.kind === 'code' ? (
            <>
              <Text style={S.h1}>Check your email</Text>
              <View style={a.form}>
                <Text style={S.p}>We sent a 6-digit code to <Text style={S.bold}>{view.email}</Text>.</Text>
                <TextInput style={[S.input, { fontFamily: F.monoBold, fontSize: 22, letterSpacing: 6, textAlign: 'center' }]} value={code} onChangeText={setCode}
                  placeholder="000000" placeholderTextColor={C.line} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
                {error && <Text style={S.err}>{error}</Text>}
                <Btn kind="coral" busy={busy} label="Sign in" onPress={() => run(async () => {
                  await verifyCode(view.email, code);
                  await afterSignIn();
                })} />
              </View>
              <Btn label="Use a different email" kind="light" onPress={() => { setError(null); setView({ kind: 'email' }); }} />
            </>
          ) : view.kind === 'consent' ? (
            <>
              <Text style={S.h1}>Your steps, your choice</Text>
              <View style={a.form}>
                <Text style={S.p}>FurSteps reads one number per day from {healthStoreName}: your step total. No location, no heart rate.</Text>
                <Text style={S.p}>{view.companyName} only sees team totals, never your steps. Teams under 5 people show no step totals unless everyone agrees.</Text>
                <Text style={S.p}>Steps typed in by hand don't count. You can withdraw any time, and your step history is then deleted.</Text>
                <Text style={S.p}>Joining is optional and not a condition of your job.</Text>
                {error && <Text style={S.err}>{error}</Text>}
                <Btn kind="coral" busy={busy} label="I agree, connect my steps" onPress={() => run(async () => {
                  await giveStepConsent();
                  setView({ kind: 'app' });
                  await loadAll();
                  await syncFromHealth(true);
                })} />
              </View>
            </>
          ) : null}
        </ScrollView>
        <StatusBar style="light" />
      </Glow>
    );
  }

  const pickDog = (id: string | null) => run(async () => {
    await chooseDog(id);
    await loadAll();
    setSub(null);
  });

  // Pack actions show problems in a pop-up, because the error line at the top is off screen down here.
  async function packRun(action: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      return true;
    } catch (e) {
      Alert.alert("That didn't work", e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function invitePack(name: string, code: string) {
    Share.share({ message: `Join my FurSteps pack "${name}"! Every step fills a bowl for a shelter dog. Open FurSteps, go to Leaderboard > Packs and enter code ${code}.` }).catch(() => undefined);
  }

  let body;
  if (sub?.kind === 'dogs') {
    body = <DogsScreen dogs={dogs} current={home.dogId} busy={busy} onPick={pickDog} onMeet={(d) => setSub({ kind: 'dog', dog: d })} onBack={() => setSub(null)} />;
  } else if (sub?.kind === 'dog') {
    body = <DogScreen dog={sub.dog} mine={home.dogId === sub.dog.id} busy={busy} onPick={() => pickDog(sub.dog.id)} onBack={() => setSub({ kind: 'dogs' })} onAll={() => setSub({ kind: 'dogs' })} />;
  } else if (tab === 'today') {
    body = (
      <TodayScreen home={home} dog={myDog} healthName={healthStoreName} busy={busy}
        onDogs={() => setSub(myDog ? { kind: 'dog', dog: myDog } : { kind: 'dogs' })}
        onCelebrate={(m) => setCelebrate({ bowls: MILESTONES.indexOf(m) + 1, steps: m })} />
    );
  } else if (tab === 'rivals') {
    body = <ChallengesScreen packs={packs} onPacks={() => { setLbStart('packs'); setTab('packs'); }} />;
  } else if (tab === 'packs') {
    const actions: PackActions = {
      create: (name) => packRun(async () => { const k = await createPack(name); await loadAll(); invitePack(name.trim(), k.code); }),
      join: (code) => packRun(async () => { await joinPack(code); await loadAll(); }),
      rename: (k, name) => packRun(async () => { await renamePack(k.id, name); await loadAll(); }).then(() => undefined),
      people: (k) => packPeople(k.id),
      invite: (k) => k.code && invitePack(k.name, k.code),
      leave: (k) => Alert.alert(`Leave ${k.name}?`, 'You can join again later with the code.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { packRun(async () => { await leavePack(k.id); await loadAll(); }); } },
      ]),
    };
    body = <LeaderboardScreen key={lbStart} startOn={lbStart} walkers={walkers} packs={packs} onBoard={home.onBoard} companyName={home.companyName} busy={busy} dogs={dogs} actions={actions}
      onJoin={() => run(async () => { await setOnBoard(true); await loadAll(); })} />;
  } else if (tab === 'impact') {
    body = <ImpactScreen home={home} dog={myDog} onDogs={() => setSub({ kind: 'dogs' })} onMeet={(d) => setSub({ kind: 'dog', dog: d })} />;
  } else {
    body = (
      <MeScreen home={home} email={userEmail} busy={busy}
        onSaveName={(n) => run(async () => { await setDisplayName(n); await loadAll(); })}
        onBoardChange={(on) => run(async () => { await setOnBoard(on); await loadAll(); })}
        onWithdraw={() => run(async () => { await withdrawStepConsent(); setHome(null); setView({ kind: 'consent', companyName: home.companyName }); })}
        onSignOut={() => run(async () => { await signOut(); setHome(null); setTab('today'); setView({ kind: 'email' }); })} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={[S.page, { paddingTop: 60 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive"
        refreshControl={<RefreshControl refreshing={false} tintColor={C.pink} onRefresh={() => run(() => syncFromHealth(false))} />}>
        <TopBar />
        {error && <Text style={S.err}>{error}</Text>}
        {body}
      </ScrollView>
      <View style={a.nav}>
        {TABS.map(([t, label]) => {
          const on = tab === t && !sub;
          return (
            <Pressable key={t} style={a.tab} onPress={() => goTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <View style={on ? glow(C.pink, 6, 0.8) : undefined}><TabIcon tab={t} color={on ? C.pink : C.muted} /></View>
              <Text style={[a.tabText, on && { color: C.fg }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {busy && <ActivityIndicator style={{ position: 'absolute', top: 64, right: 20 }} color={C.pink} />}
      <Celebrate visible={!!celebrate} bowls={celebrate?.bowls ?? 0} steps={celebrate?.steps ?? 0} dogName={myDog?.name ?? null}
        onDone={() => setCelebrate(null)} onMore={() => { setCelebrate(null); goTab('impact'); }} />
      <StatusBar style="light" />
    </View>
  );
}

const a = StyleSheet.create({
  form: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.pink, borderRadius: 24, padding: 16, gap: 12, ...glow(C.pink, 28, 0.3) },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: 'rgba(0,0,0,0.94)', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, paddingBottom: 28, paddingHorizontal: 10 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52, minWidth: 56 },
  tabText: { fontFamily: F.bodyBold, fontSize: 12, color: C.muted },
});
