import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import appJson from '../app.json';

import type { Colleague, CompanyRow, Dog, Duel, Home, Pack, Walker } from './backend';
import { Bone, Bowl, DOG_PHOTOS, DogAvatar, Orb, PawTile } from './ui/art';
import { Bar, Btn, Card, Pill, fmt } from './ui/kit';
import { C, F, S, T, glow } from './ui/theme';

export const MILESTONES = [5000, 15000, 30000, 45000, 65000, 85000, 100000, 120000, 135000, 150000];
export const BOWL_KG = 0.4;
export const PRIVACY_URL = 'https://fursteps-site-kj-2567.vercel.app/privacy';

const textGlow = (_color: string) => ({}); // no text glows on the light theme
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const plural = (n: number, one: string, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`;

function DogCard({ dog, onPress }: { dog: Dog | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={x.dogcard} accessibilityRole="button">
      <DogAvatar slug={dog?.slug} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={[S.h2, { fontSize: 18 }]}>{dog ? `Walking for ${dog.name}` : 'Choose a shelter dog to walk for'}</Text>
      </View>
      <Text style={[S.muted, { fontSize: 22 }]}>›</Text>
    </Pressable>
  );
}

export function TodayScreen({ home, dog, healthName, busy, onDogs, onCelebrate }: {
  home: Home; dog: Dog | null; healthName: string; busy: boolean; onDogs: () => void; onCelebrate: (milestone: number) => void;
}) {
  const { width } = useWindowDimensions();
  const steps = home.monthSteps, done = home.myBowls;
  const next = MILESTONES.find((m) => steps < m);
  const prev = [...MILESTONES].reverse().find((m) => steps >= m) ?? 0;
  const fill = next ? (steps - prev) / (next - prev) : 1;
  const inner = Math.min(width, 440) - 40 - 44;
  const paw = Math.min(44, Math.floor((inner - 12 - 40) / 5));
  const ring = Math.floor((inner - 16) / 3);
  return (
    <View style={{ gap: 16 }}>
      <DogCard dog={dog} onPress={onDogs} />
      <View style={S.hero}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <Orb size={ring} progress={next ? done / (done + 1) : 1} color={C.coral} value={fmt(done)} label={done === 1 ? 'bowl' : 'bowls'} icon="bowl" />
          <Orb size={ring} progress={home.todaySteps / 10000} color={C.purple} value={fmt(home.todaySteps)} label="today" icon="shoe" />
          <Orb size={ring} progress={steps / 150000} color={C.cyan} value={fmt(steps)} label="total" icon="calendar" />
        </View>
        <Pressable disabled={!prev} onPress={() => onCelebrate(prev)} accessibilityLabel={`${done} bowls this round`} style={{ alignItems: 'center', marginTop: 4 }}>
          <Bowl level={fill} width={Math.min(210, inner)} id="today" />
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, width: '100%', paddingHorizontal: 6, marginTop: 6 }}>
          {MILESTONES.map((m) => {
            const state = steps >= m ? 'on' : m === next ? 'next' : 'off';
            return (
              <Pressable key={m} disabled={state !== 'on'} onPress={() => onCelebrate(m)} style={{ alignItems: 'center', width: paw }} accessibilityLabel={`${fmt(m)} steps, ${state === 'on' ? 'bowl filled' : state === 'next' ? 'next bowl' : 'locked'}`}>
                <PawTile state={state} size={paw} />
                <Text style={[x.pl, state === 'on' && { color: C.fg }, state === 'next' && { color: T.pink }]}>{m / 1000}k</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ width: '100%', marginTop: 4 }}><Bar pct={Math.round(fill * 100)} /></View>
        <Text style={[S.p, { fontSize: 16, textAlign: 'center' }]}>
          {next ? <><Text style={S.bold}>{fmt(next - steps)}</Text> steps to your next bowl</> : 'Every bowl filled this round. Epic walking!'}
        </Text>
      </View>
    </View>
  );
}

export type TugActions = {
  colleagues: () => Promise<Colleague[]>;
  create: (opponentId: string, days: number) => Promise<boolean>;
  accept: (d: Duel) => Promise<boolean>;
  decline: (d: Duel) => void;
  cancel: (d: Duel) => void;
};

export function ChallengesScreen({ packs, onOpenPack, duels, tug, busy, dogs, myDogId, packActions }: {
  packs: Pack[]; onPacks: () => void; onOpenPack: (p: Pack) => void; duels: Duel[]; tug: TugActions; busy: boolean; dogs: Dog[]; myDogId: string | null; packActions: PackActions;
}) {
  const [page, setPage] = useState<false | 'live' | 'past' | 'packs'>(false);
  const slug = (id: string | null) => dogs.find((d) => d.id === id)?.slug;
  const mine = packs.map((k, i) => ({ k, rank: i + 1 })).filter((r) => r.k.isMine);
  const back = () => setPage(false);
  if (page === 'past') return <PastTugsScreen duels={duels} dogs={dogs} myDogId={myDogId} onBack={back} />;
  if (page === 'packs') return <PackWarScreen packs={packs} busy={busy} actions={packActions} onBack={back} onOpen={onOpenPack} />;
  if (page) return <TugScreen duels={duels} tug={tug} busy={busy} dogs={dogs} myDogId={myDogId} onBack={back} />;
  const open = duels.find((d) => d.status === 'active') ?? duels.find((d) => d.status === 'pending');
  const past = duels.filter((d) => d.status === 'finished');
  const won = past.filter((d) => d.mySteps > d.theirSteps).length;
  const lost = past.filter((d) => d.mySteps < d.theirSteps).length;
  const drawn = past.length - won - lost;
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Challenges</Text>
      <View style={[x.chal, { borderColor: C.pink, borderStyle: 'solid' }]}>
        <Text style={[x.chalKind, { color: T.pink }]}>TUG OF WAR</Text>
        {open ? <DuelCard d={open} slug={slug} mine={slug(myDogId)} tug={tug} busy={busy} /> : (
          <>
            <Text style={x.chalTitle}>Pull the bone from a colleague</Text>
            <Text style={[S.p, { color: C.muted }]}>Most steps in 3 to 14 days wins the bone.</Text>
            <Btn label="Challenge a colleague" kind="coral" small onPress={() => setPage('live')} />
          </>
        )}
      </View>
      <Pressable onPress={() => setPage('packs')} accessibilityRole="button" style={[x.chal, { borderColor: C.cyan, borderStyle: 'solid' }]}>
        <Text style={[x.chalKind, { color: T.cyan }]}>PACK WAR</Text>
        {mine.length ? mine.map((r) => (
          <View key={r.k.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[x.rank, { backgroundColor: C.cyan, borderColor: C.cyan }]}><Text style={[x.rankText, { color: C.dark }]}>{r.rank}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={x.chalTitle} numberOfLines={1}>{r.k.name}</Text>
              <Text style={S.muted}>{ordinal(r.rank)} of {packs.length} {packs.length === 1 ? 'pack' : 'packs'} ›</Text>
            </View>
          </View>
        )) : (
          <>
            <Text style={x.chalTitle}>{'Build your crew.\nWin as a pack.'}</Text>
            <Text style={[S.bold, { color: T.pink }]}>Create or join a pack ›</Text>
          </>
        )}
      </Pressable>
      {past.length > 0 && (
        <Pressable onPress={() => setPage('past')} accessibilityRole="button" style={[S.card, S.row]}>
          <View style={{ flex: 1 }}>
            <Text style={S.h2}>Past challenges</Text>
            <Text style={S.muted}>{won} won · {lost} lost{drawn ? ` · ${drawn} drawn` : ''}</Text>
          </View>
          <Text style={[S.muted, { fontSize: 22 }]}>›</Text>
        </Pressable>
      )}
    </View>
  );
}

// Pack War: every pack at your workplace, plus one button to create your own.
function PackWarScreen({ packs, busy, actions, onBack, onOpen }: { packs: Pack[]; busy: boolean; actions: PackActions; onBack: () => void; onOpen: (p: Pack) => void }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [hint, setHint] = useState(false);
  const mine = packs.filter((k) => k.isMine);
  const create = () => {
    Keyboard.dismiss();
    if (!name.trim()) return setHint(true);
    actions.create(name).then((ok) => { if (ok) { setName(''); setNaming(false); } });
  };
  // iPhone: one tap on Create pack opens a small pop-up asking for the name.
  const start = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Name your pack', 'Your colleagues will see this name.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: (v?: string) => { if (v?.trim()) actions.create(v); } },
      ], 'plain-text');
    } else setNaming(true);
  };
  return (
    <View style={{ gap: 16 }}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={S.linkbtn}>‹ Challenges</Text></Pressable>
      <Text style={S.h1}>Pack War</Text>
      <PacksList packs={packs} busy={busy} actions={actions} onOpen={onOpen} />
      {mine.length < 5 && (naming ? (
        <Card style={{ gap: 10 }}>
          <TextInput style={S.input} value={name} onChangeText={(t) => { setName(t); setHint(false); }} placeholder="Pack name" placeholderTextColor={C.muted} maxLength={40}
            autoFocus accessibilityLabel="Pack name" returnKeyType="done" onSubmitEditing={create} />
          {hint && <Text style={S.err}>Type a name for your pack first.</Text>}
          <Btn label="Create pack" kind="coral" busy={busy} onPress={create} />
        </Card>
      ) : <Btn label="Create pack" kind="coral" busy={busy} onPress={start} />)}
    </View>
  );
}

// One tug of war: an invite to answer, a challenge waiting, or the live bone.
function DuelCard({ d, slug, mine, tug, busy }: { d: Duel; slug: (id: string | null) => string | undefined; mine?: string; tug?: TugActions; busy: boolean }) {
  const name = d.opponentName ?? 'your colleague';
  const live = d.status === 'active';
  const left = daysLeft(d.endsOn);
  const who = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={[S.bold, { fontSize: 18, flex: 1 }]}>{d.status === 'pending' && !d.isChallenger ? `${name} challenged you` : `You vs ${name}`}</Text>
      {live && <Text style={[S.bold, { fontSize: 14, color: T.pink }]}>{left <= 1 ? 'Last day' : `${left} days left`}</Text>}
    </View>
  );
  if (d.status === 'pending' && !d.isChallenger) {
    return (
      <View style={{ gap: 10 }}>
        {who}
        <Text style={S.muted}>{d.days} days. If you accept, you two see each other's steps for these days only.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Accept" small kind="coral" busy={busy} onPress={() => { tug?.accept(d); }} />
          <Btn label="Decline" small kind="light" onPress={() => tug?.decline(d)} />
        </View>
      </View>
    );
  }
  if (d.status === 'pending') {
    return (
      <View style={{ gap: 10 }}>
        {who}
        <Text style={S.muted}>Waiting for {name} to accept · {d.days} days</Text>
        <Btn label="Cancel challenge" small kind="light" onPress={() => tug?.cancel(d)} />
      </View>
    );
  }
  const done = d.status === 'finished';
  const result = d.mySteps === d.theirSteps ? "It's a draw" : d.mySteps > d.theirSteps ? 'You won the bone!' : `${name} won the bone`;
  return (
    <View style={{ gap: 10 }}>
      {who}
      <TugBar mine={d.mySteps} theirs={d.theirSteps} myDog={mine} theirDog={slug(d.opponentDog)} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View><Text style={[x.num, { textAlign: 'left', color: T.pink }]}>{fmt(d.mySteps)}</Text><Text style={S.muted}>You</Text></View>
        <View><Text style={[x.num, { color: T.cyan }]}>{fmt(d.theirSteps)}</Text><Text style={[S.muted, { textAlign: 'right' }]}>{name}</Text></View>
      </View>
      {done && <Text style={[S.bold, { fontSize: 16, color: C.fg }]}>{result}</Text>}
    </View>
  );
}

const DAY_MS = 86400000;
function daysLeft(endsOn: string | null) {
  if (!endsOn) return 0;
  const end = new Date(endsOn + 'T23:59:59');
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
}

// A rope with a bone in the middle. The bone slides toward whoever has more steps.
function TugBar({ mine, theirs, myDog, theirDog }: { mine: number; theirs: number; myDog?: string; theirDog?: string }) {
  const [w, setW] = useState(0);
  const total = mine + theirs;
  const lead = total ? (mine - theirs) / total : 0; // -1..1, positive = you lead
  const pos = 0.5 - Math.max(-0.38, Math.min(0.38, lead * 0.6)); // 0 = your end (left)
  const bone = 30;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <DogAvatar slug={myDog} size={40} />
      <View style={{ flex: 1, height: 36, justifyContent: 'center' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={{ height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' }}>
          <View style={{ flex: 1, backgroundColor: C.pink }} /><View style={{ flex: 1, backgroundColor: C.cyan }} />
        </View>
        {w > 0 && <View style={{ position: 'absolute', left: w * pos - bone / 2 }}><Bone width={bone} /></View>}
      </View>
      <DogAvatar slug={theirDog} size={40} />
    </View>
  );
}

function TugScreen({ duels, tug, busy, dogs, myDogId, onBack }: { duels: Duel[]; tug: TugActions; busy: boolean; dogs: Dog[]; myDogId: string | null; onBack: () => void }) {
  const [days, setDays] = useState(7);
  const [people, setPeople] = useState<Colleague[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const slug = (id: string | null) => dogs.find((d) => d.id === id)?.slug;
  const busyDuel = duels.some((d) => d.status === 'active' || d.status === 'pending');
  useEffect(() => { tug.colleagues().then(setPeople).catch(() => setPeople([])); }, [duels.length]);
  const send = () => {
    if (!pick) return setHint(true);
    tug.create(pick, days).then((ok) => { if (ok) setPick(null); });
  };
  return (
    <View style={{ gap: 16 }}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={S.linkbtn}>‹ Challenges</Text></Pressable>
      <Text style={S.h1}>Tug of War</Text>
      {duels.filter((d) => d.status !== 'finished').map((d) => (
        <View key={d.id} style={[S.card, { gap: 10, borderColor: C.pink, borderWidth: 1.5 }]}>
          <DuelCard d={d} slug={slug} mine={slug(myDogId)} tug={tug} busy={busy} />
        </View>
      ))}
      {!busyDuel && (
        <Card style={{ gap: 10 }}>
          <Text style={S.h2}>Challenge a colleague</Text>
          {!people ? <Text style={S.muted}>Loading…</Text> : people.length === 0 ? (
            <Text style={S.muted}>Nobody else at your workplace is on the leaderboard yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {people.map((p) => (
                <Pressable key={p.id} onPress={() => { setPick(pick === p.id ? null : p.id); setHint(false); }} accessibilityRole="radio" accessibilityState={{ selected: pick === p.id }}
                  style={[x.lb, pick === p.id && x.lbMine]}>
                  <DogAvatar slug={slug(p.dogId)} size={26} />
                  <Text numberOfLines={1} style={[S.bold, { fontSize: 16, flex: 1 }]}>{p.displayName}</Text>
                  {pick === p.id && <Text style={[S.bold, { color: T.pink }]}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[3, 7, 14].map((n) => <Pill key={n} label={`${n} days`} on={days === n} onPress={() => setDays(n)} />)}
          </View>
          {hint && <Text style={S.err}>Pick a colleague first.</Text>}
          <Btn label="Send challenge" kind="coral" busy={busy} onPress={send} />
        </Card>
      )}
    </View>
  );
}

// Finished tugs of war, on their own page.
function PastTugsScreen({ duels, dogs, myDogId, onBack }: { duels: Duel[]; dogs: Dog[]; myDogId: string | null; onBack: () => void }) {
  const slug = (id: string | null) => dogs.find((d) => d.id === id)?.slug;
  const past = duels.filter((d) => d.status === 'finished');
  return (
    <View style={{ gap: 16 }}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={S.linkbtn}>‹ Challenges</Text></Pressable>
      <Text style={S.h1}>Past challenges</Text>
      {past.length === 0 ? <Text style={S.muted}>No finished tugs of war yet.</Text> : past.map((d) => (
        <View key={d.id} style={[S.card, { gap: 10 }]}><DuelCard d={d} slug={slug} mine={slug(myDogId)} busy={false} /></View>
      ))}
    </View>
  );
}

function WalkerRow({ w, rank, slug }: { w: Walker; rank: number; slug?: string }) {
  const first = rank === 1 && !w.isMe;
  return (
    <View style={[x.lb, { gap: 10 }, first && x.lbFirst, w.isMe && x.lbMine]}>
      <View style={[x.rank, first && { backgroundColor: C.cyan, borderColor: C.cyan }, w.isMe && { backgroundColor: C.pink, borderColor: C.pink }]}>
        <Text style={[x.rankText, (first || w.isMe) && { color: C.dark }]}>{rank}</Text>
      </View>
      <DogAvatar slug={slug} size={26} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[S.bold, { fontFamily: F.bodyBold, fontSize: 16 }]}>{w.displayName}</Text>
      </View>
      <Text style={[x.num, x.colSteps]}>{fmt(w.steps)}</Text>
      <Text style={[x.num, x.colBowls]}>{fmt(w.bowls ?? 0)}</Text>
    </View>
  );
}

// Column labels above a walker list, lined up with WalkerRow.
function WalkerHead() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, marginBottom: -6 }}>
      <Text style={[x.head, { width: 36, textAlign: 'center' }]}>Rank</Text>
      <Text style={[x.head, { flex: 1, textAlign: 'left', paddingLeft: 36 }]}>Name</Text>
      <Text style={[x.head, { width: 68 }]}>Steps</Text>
      <Text style={[x.head, { width: 44 }]}>Bowls</Text>
    </View>
  );
}

export type PackActions = {
  create: (name: string) => Promise<boolean>;
  join: (p: Pack) => Promise<boolean>;
  leave: (p: Pack) => void;
  invite: (p: Pack) => void;
  rename: (p: Pack, name: string) => Promise<void>;
  people: (p: Pack) => Promise<{ people: Walker[]; hidden: number }>;
};

export function LeaderboardScreen({ walkers, packs, companies, onBoard, companyName, busy, onJoin, dogs, actions, startOn = 'walkers', startPack }: {
  walkers: Walker[]; packs: Pack[]; companies: CompanyRow[]; onBoard: boolean; companyName: string; busy: boolean; onJoin: () => void; dogs: Dog[]; actions: PackActions;
  startOn?: 'walkers' | 'packs' | 'companies'; startPack?: string | null;
}) {
  const [tab, setTab] = useState<'walkers' | 'packs' | 'companies'>(startOn);
  const [open, setOpen] = useState<Pack | null>(() => packs.find((k) => k.id === startPack) ?? null);
  const slug = (id: string | null) => dogs.find((d) => d.id === id)?.slug;
  const fresh = open && packs.find((k) => k.id === open.id);
  if (fresh) {
    return <PackScreen pack={fresh} slug={slug} busy={busy} actions={actions} onBack={() => setOpen(null)} />;
  }
  const emoji = companies.find((c) => c.isMine)?.emoji;
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Leaderboard</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill grow label="Walkers" on={tab === 'walkers'} onPress={() => setTab('walkers')} />
        <Pill grow label="Packs" on={tab === 'packs'} onPress={() => setTab('packs')} />
        {companies.length >= 5 && <Pill grow label="Companies" on={tab === 'companies'} onPress={() => setTab('companies')} />}
      </View>
      {tab !== 'companies' && <Text style={S.eyebrow}>{emoji ? `${emoji} ` : ''}{companyName}</Text>}
      {tab === 'walkers' ? (
        <>
          {!onBoard && (
            <Card style={[{ borderColor: C.cyan, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Text style={[S.bold, { flex: 1, fontSize: 16 }]}>Show your name here?</Text>
              <Btn label="Show me" small onPress={onJoin} busy={busy} />
            </Card>
          )}
          {walkers.length > 0 && <WalkerHead />}
          {walkers.length ? walkers.map((w, i) => <WalkerRow key={`${w.displayName}-${i}`} w={w} rank={i + 1} slug={slug(w.dogId)} />) : (
            <Card><Text style={[S.bold, { fontSize: 16 }]}>No walkers here yet.</Text></Card>
          )}
        </>
      ) : tab === 'packs' ? (
        <PacksList packs={packs} busy={busy} actions={actions} onOpen={setOpen} />
      ) : (
        <View style={{ gap: 12 }}>
          {companies.map((c, i) => {
            const first = i === 0 && !c.isMine;
            return (
              <View key={`${c.name}-${i}`} style={[x.lb, first && x.lbFirst, c.isMine && x.lbMine]}>
                <View style={[x.rank, first && { backgroundColor: C.cyan, borderColor: C.cyan }, c.isMine && { backgroundColor: C.pink, borderColor: C.pink }]}>
                  <Text style={[x.rankText, (first || c.isMine) && { color: C.dark }]}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 22 }}>{c.emoji ?? '🏢'}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[S.bold, { fontSize: 16 }]}>{c.name}</Text>
                  <Text style={[S.p, { fontSize: 12 }]}>{plural(c.walkers, 'walker')}</Text>
                </View>
                {c.stepsPerWalker != null
                  ? <Text style={x.num}>{fmt(c.stepsPerWalker)}</Text>
                  : <Text style={[S.bold, { color: T.gold }]}>{plural(c.bowls, 'bowl')}</Text>}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PacksList({ packs, busy, actions, onOpen }: { packs: Pack[]; busy: boolean; actions: PackActions; onOpen: (p: Pack) => void }) {
  const mine = packs.filter((k) => k.isMine);
  return (
    <View style={{ gap: 12 }}>
      {packs.length ? packs.map((k, i) => {
        const first = i === 0 && !k.isMine;
        return (
          <Pressable key={k.id} onPress={() => k.isMine && onOpen(k)} disabled={!k.isMine} accessibilityRole={k.isMine ? 'button' : undefined}
            style={[x.lb, first && x.lbFirst, k.isMine && x.lbMine]}>
            <View style={[x.rank, first && { backgroundColor: C.cyan, borderColor: C.cyan }, k.isMine && { backgroundColor: C.pink, borderColor: C.pink }]}>
              <Text style={[x.rankText, (first || k.isMine) && { color: C.dark }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[S.bold, { fontSize: 16 }]}>{k.name}</Text>
              <Text style={[S.p, { fontSize: 12 }]}>{plural(k.walkers, 'walker')}</Text>
            </View>
            {k.stepsPerWalker != null ? <View><Text style={x.num}>{fmt(k.stepsPerWalker)}</Text><Text style={[S.muted, { fontSize: 12, textAlign: 'right' }]}>per walker</Text></View> : k.isMine ? <Text style={[S.muted, { fontSize: 22 }]}>›</Text> : null}
            {!k.isMine && mine.length < 5 && <Btn label="Join" small kind="coral" busy={busy} onPress={() => actions.join(k)} />}
          </Pressable>
        );
      }) : (
        <Card><Text style={[S.bold, { fontSize: 16 }]}>No packs yet. Be the first to create one.</Text></Card>
      )}
    </View>
  );
}

function PackScreen({ pack, slug, busy, actions, onBack }: { pack: Pack; slug: (id: string | null) => string | undefined; busy: boolean; actions: PackActions; onBack: () => void }) {
  const [rows, setRows] = useState<{ people: Walker[]; hidden: number } | null>(null);
  const [name, setName] = useState(pack.name);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { actions.people(pack).then(setRows).catch((e) => setErr(String(e?.message ?? e))); }, [pack.id, pack.walkers]);
  return (
    <View style={{ gap: 16 }}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={S.linkbtn}>‹ Leaderboard</Text></Pressable>
      <Text style={S.h1}>{pack.name}</Text>
      <View style={[S.hero, { alignItems: 'flex-start' }]}>
        <Text style={S.eyebrow}>This round</Text>
        <Text style={[S.bold, { fontSize: 22 }]}>{plural(pack.walkers, 'walker')} · {plural(pack.bowls, 'bowl')}</Text>
        {pack.stepsPerWalker != null
          ? <Text style={S.p}>{fmt(pack.stepsPerWalker)} steps per walker (average)</Text>
          : null}
        <Btn label="Invite colleagues" kind="coral" small onPress={() => actions.invite(pack)} style={{ marginTop: 6 }} />
      </View>
      {err && <Text style={S.err}>{err}</Text>}
      {!rows ? <Text style={S.muted}>Loading…</Text> : (
        <>
          {rows.people.length > 0 && <WalkerHead />}
          {rows.people.map((w, i) => <WalkerRow key={`${w.displayName}-${i}`} w={w} rank={i + 1} slug={slug(w.dogId)} />)}
          {rows.hidden > 0 && <Text style={S.muted}>{plural(rows.hidden, 'member')} {rows.hidden === 1 ? 'keeps' : 'keep'} their name private.</Text>}
        </>
      )}
      {pack.isOwner && (
        <Card style={{ gap: 10 }}>
          <Text style={S.label}>Pack name</Text>
          <TextInput style={S.input} value={name} onChangeText={setName} maxLength={40} accessibilityLabel="Pack name" />
          <Btn label="Save name" small busy={busy} onPress={() => { if (name.trim() && name.trim() !== pack.name) actions.rename(pack, name); }} />
        </Card>
      )}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Btn label="Leave pack" kind="light" small onPress={() => actions.leave(pack)} />
      </View>
    </View>
  );
}

export function ImpactScreen({ home, dog, allTime, onDogs, onMeet }: { home: Home; dog: Dog | null; allTime: number | null; onDogs: () => void; onMeet: (d: Dog) => void }) {
  const kg = (b: number) => Math.round(b * BOWL_KG * 10) / 10;
  const Stat = ({ label, bowls }: { label: string; bowls: number }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <Text style={[S.eyebrow, { flex: 1 }]}>{label}</Text>
      <Text style={[S.bold, { fontSize: 20 }]}>{plural(bowls, 'bowl')}</Text>
      <Text style={[S.muted, { width: 64, textAlign: 'right' }]}>{kg(bowls)} kg</Text>
    </View>
  );
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Impact</Text>
      <View style={[S.hero, { alignItems: 'flex-start' }]}>
        <Text style={S.eyebrow}>FurSteps community this round</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Text style={{ fontFamily: F.display, fontSize: 56, lineHeight: 67, color: C.fg }}>{kg(home.communityBowls)}</Text><Text style={[S.bold, { fontSize: 22 }]}>kg of food</Text></View>
        <Text style={S.p}>{plural(home.communityBowls, 'bowl')} from {plural(home.communityWalkers, 'walker')}</Text>
      </View>
      <Card style={{ paddingVertical: 6 }}>
        <Stat label="This round" bowls={home.myBowls} />
        {allTime != null && allTime > home.myBowls && <Stat label="Since you joined" bowls={allTime} />}
        <Stat label="Your company" bowls={home.companyBowls} />
      </Card>
      <Pressable onPress={() => (dog ? onMeet(dog) : onDogs())} accessibilityRole="button" style={[S.card, S.row]}>
        <DogAvatar slug={dog?.slug} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={S.eyebrow}>You are feeding</Text>
          <Text style={[S.bold, { fontSize: 16 }]}>{dog ? dog.name : 'Whichever dog needs it most'}</Text>
        </View>
        <Text style={[S.muted, { fontSize: 22 }]}>›</Text>
      </Pressable>
    </View>
  );
}

export function MeScreen({ home, email, busy, onSaveName, onBoardChange, onWithdraw, onSignOut }: {
  home: Home; email: string; busy: boolean; onSaveName: (n: string) => void; onBoardChange: (on: boolean) => void; onWithdraw: () => void; onSignOut: () => void;
}) {
  const [name, setName] = useState(home.displayName);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Me</Text>
      <Card style={{ gap: 8 }}>
        <Text style={S.label}>Your name</Text>
        <TextInput style={S.input} value={name} onChangeText={setName} maxLength={40} returnKeyType="done"
          onEndEditing={() => name.trim() && name.trim() !== home.displayName && onSaveName(name.trim())} />
        <Text style={S.muted}>{home.companyName}</Text>
      </Card>
      <Text style={S.h2}>Privacy</Text>
      <Pressable style={x.drop} onPress={() => setOpen(!open)} accessibilityRole="button">
        <Text style={[S.bold, { fontSize: 16 }]}>Privacy settings</Text><Text style={S.muted}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open && (
        <Card style={{ gap: 14, marginTop: -8 }}>
          <View style={S.row}>
            <Text style={[S.p, { flex: 1, fontSize: 16 }]}>Show my name and monthly steps on the walker leaderboard. Only colleagues at {home.companyName} can see it. Off by default.</Text>
            <Switch value={home.onBoard} onValueChange={onBoardChange} disabled={busy} trackColor={{ true: C.pink, false: C.line }} />
          </View>
          <Text style={S.muted}>Your employer only ever sees team totals, never your own steps.</Text>
          <Btn label="Stop reading my steps" kind="light" small busy={busy} onPress={() => Alert.alert('Stop reading your steps?', 'FurSteps will stop counting your steps and delete your step history. You can start again later.', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Stop and delete', style: 'destructive', onPress: onWithdraw },
          ])} />
        </Card>
      )}
      <Pressable style={x.drop} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
        <Text style={[S.bold, { fontSize: 16 }]}>Privacy policy</Text><Text style={S.muted}>↗</Text>
      </Pressable>
      <Btn label="Sign out" kind="light" onPress={onSignOut} />
      <Text style={[S.muted, { fontSize: 12, textAlign: 'center' }]}>{email} · version {appJson.expo.version}</Text>
    </View>
  );
}

export function DogsScreen({ dogs, current, busy, onPick, onMeet, onBack }: { dogs: Dog[]; current: string | null; busy: boolean; onPick: (id: string | null) => void; onMeet: (d: Dog) => void; onBack: () => void }) {
  return (
    <View style={{ gap: 16 }}>
      <Pressable onPress={onBack}><Text style={S.linkbtn}>‹ Back</Text></Pressable>
      <View><Text style={S.h1}>Meet a dog</Text><Text style={S.muted}>Choose who your bowls feed. You can change your mind any time.</Text></View>
      <Card style={{ gap: 12 }}>
        <View style={S.row}><DogAvatar size={44} /><View style={{ flex: 1 }}><Text style={[S.bold, { fontSize: 16 }]}>FurSteps pool</Text><Text style={S.muted}>Feeds whichever dog needs it most</Text></View></View>
        {current ? <Btn label="Walk for the pool" small kind="light" busy={busy} onPress={() => onPick(null)} /> : <Text style={S.tag}>✓ Your choice</Text>}
      </Card>
      {dogs.map((d) => (
        <Card key={d.id} style={{ gap: 10 }}>
          <Pressable style={S.row} onPress={() => onMeet(d)}>
            <DogAvatar slug={d.slug} size={44} />
            <View style={{ flex: 1 }}><Text style={[S.bold, { fontSize: 18 }]}>{d.name}</Text><Text style={S.muted}>{[d.age, d.breed, d.shelter].filter(Boolean).join(' · ')}</Text></View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {current === d.id ? <Text style={S.tag}>✓ You walk for {d.name}</Text> : <Btn label={`Walk for ${d.name}`} small kind="coral" busy={busy} onPress={() => onPick(d.id)} />}
            <Btn label={`Meet ${d.name}`} small kind="light" onPress={() => onMeet(d)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

export function DogScreen({ dog, mine, busy, onPick, onBack, onAll }: { dog: Dog; mine: boolean; busy: boolean; onPick: () => void; onBack: () => void; onAll: () => void }) {
  const { width } = useWindowDimensions();
  const photos = DOG_PHOTOS[dog.slug]?.photos ?? [];
  const w = Math.min(width, 440) - 40;
  return (
    <View style={{ gap: 16 }}>
      <Pressable onPress={onBack}><Text style={S.linkbtn}>‹ All dogs</Text></Pressable>
      <View style={{ alignItems: 'center', gap: 8 }}>
        {photos.length ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: w }} snapToInterval={w * 0.88 + 10} decelerationRate="fast">
            {photos.map((p, i) => <Image key={i} source={p} style={{ width: photos.length > 1 ? w * 0.88 : w, height: 360, borderRadius: 24, marginRight: 10, borderWidth: 1, borderColor: C.line }} resizeMode="cover" />)}
          </ScrollView>
        ) : <DogAvatar slug={dog.slug} size={96} />}
        {photos.length > 1 && <Text style={[S.muted, { fontSize: 12 }]}>Swipe for more photos</Text>}
        <Text style={S.h1}>{dog.name}</Text>
        {!!(dog.age || dog.breed) && <Text style={S.muted}>{[dog.age, dog.breed].filter(Boolean).join(' · ')}</Text>}
        <Text style={S.muted}>{dog.shelter}</Text>
      </View>
      {!!dog.story && <Card><Text style={S.p}>{dog.story}</Text></Card>}
      {mine ? (
        <Card style={{ borderColor: C.green }}><Text style={[S.bold, { color: T.green, fontSize: 16 }]}>✓ You walk for {dog.name}</Text><Text style={S.muted}>Every bowl you unlock goes to {dog.name}.</Text></Card>
      ) : <Btn label={`Walk for ${dog.name}`} kind="coral" busy={busy} onPress={onPick} />}
      <Text style={S.h2}>Thank-you notes</Text>
      <Text style={S.muted}>No notes yet. The shelter team will post a thank-you here when food arrives.</Text>
      <Card><Text style={[S.bold, { fontSize: 16 }]}>Delivery proof</Text><Text style={S.muted}>Photos and delivery details will show up here once the first food goes out.</Text></Card>
      <Btn label="See all dogs" kind="light" onPress={onAll} />
    </View>
  );
}

// Shown once, right after a new walker agrees to share steps.
export function ChooseDogPopup({ visible, dogs, busy, onPick, onLater }: { visible: boolean; dogs: Dog[]; busy: boolean; onPick: (id: string) => void; onLater: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLater}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 48, gap: 16 }}>
          <Text style={[{ fontFamily: F.mono, fontSize: 12, letterSpacing: 0.8, color: T.pink }]}>WELCOME TO FURSTEPS</Text>
          <Text style={S.h1}>Choose a shelter dog to walk for</Text>
          <Text style={S.muted}>Every bowl your steps unlock goes to your dog. You can change dogs any time.</Text>
          {dogs.map((d) => {
            const photo = DOG_PHOTOS[d.slug]?.photos?.[0];
            return (
              <Card key={d.id} style={{ gap: 12 }}>
                {photo ? <Image source={photo} style={{ width: '100%', height: 220, borderRadius: 18 }} resizeMode="cover" /> : <DogAvatar slug={d.slug} size={64} />}
                <View><Text style={[S.bold, { fontSize: 22 }]}>{d.name}</Text><Text style={S.muted}>{[d.age, d.breed, d.shelter].filter(Boolean).join(' · ')}</Text></View>
                <Btn label={`Walk for ${d.name}`} kind="coral" busy={busy} onPress={() => onPick(d.id)} />
              </Card>
            );
          })}
          <Btn label="Later, feed whichever dog needs it most" kind="light" onPress={onLater} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export function Celebrate({ visible, bowls, steps, dogName, onDone, onMore }: { visible: boolean; bowls: number; steps: number; dogName: string | null; onDone: () => void; onMore: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 60, paddingBottom: 30 }}>
        <Pressable onPress={onDone} style={{ alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8 }}><Text style={{ color: T.cyan, fontFamily: F.bodyMedium, fontSize: 16 }}>Done</Text></Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, paddingHorizontal: 28 }}>
          <Text style={[{ fontFamily: F.mono, fontSize: 14, letterSpacing: 0.8, color: T.pink }, textGlow(C.pink)]}>CONGRATULATIONS</Text>
          <Text style={{ fontFamily: F.display, fontSize: 32, lineHeight: 38, letterSpacing: -1.2, color: C.fg, textAlign: 'center', marginTop: -12 }}>You helped feed a shelter dog</Text>
          <View style={[x.celCard, glow(C.pink, 40, 0.45)]}>
            <Bowl level={1} width={150} id="cel" />
            <Text style={{ fontFamily: F.display, fontSize: 32, color: C.fg }}>{plural(bowls, 'bowl')}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 0.8, color: C.muted }}>{fmt(steps)} STEPS</Text>
          </View>
          <Text style={[S.p, { fontSize: 16, textAlign: 'center', maxWidth: 300 }]}>Thanks to you, a bowl of food is on its way to {dogName ?? 'a rescue near you'}.</Text>
          <Btn label="Find out more" kind="coral" onPress={onMore} style={{ alignSelf: 'stretch' }} />
        </View>
        <Text style={[S.muted, { textAlign: 'center' }]}>Your steps make the difference <Text style={{ color: T.pink }}>♥</Text></Text>
      </View>
    </Modal>
  );
}

const x = StyleSheet.create({
  dogcard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 26, paddingVertical: 14, paddingHorizontal: 16 },
  pl: { fontFamily: F.display, fontSize: 12, color: C.muted, marginTop: 1 },
  chal: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 24, padding: 18, gap: 10, backgroundColor: C.card },
  chalKind: { fontFamily: F.monoBold, fontSize: 12, letterSpacing: 0.8 },
  chalTitle: { fontFamily: F.display, fontSize: 22, lineHeight: 26, color: C.fg },
  lb: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 },
  lbFirst: { borderColor: C.cyan, ...glow(C.cyan, 18, 0.25) },
  lbMine: { backgroundColor: C.pinkSoft, borderWidth: 1.5, borderColor: C.pink, ...glow(C.pink, 28, 0.28) },
  rank: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: F.display, fontSize: 18, color: C.muted },
  colSteps: { width: 68, fontSize: 18, textAlign: 'right' },
  colBowls: { width: 44, fontSize: 18, textAlign: 'right' },
  head: { fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: C.muted, textAlign: 'right' },
  num: { fontFamily: F.display, fontSize: 22, color: C.fg, textAlign: 'right', fontVariant: ['tabular-nums'] },
  drop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 16, minHeight: 56 },
  celCard: { width: 280, aspectRatio: 4 / 3, borderRadius: 22, borderWidth: 2, borderColor: C.pink, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 6, transform: [{ rotate: '-3deg' }] },
});
