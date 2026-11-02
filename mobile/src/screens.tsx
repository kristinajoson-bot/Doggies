import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import appJson from '../app.json';

import type { Dog, Home, Pack, Walker } from './backend';
import { Bowl, BowlIcon, DOG_PHOTOS, DogAvatar, Orb, PawTile } from './ui/art';
import { Bar, Btn, Card, Pill, fmt } from './ui/kit';
import { C, F, S, glow } from './ui/theme';

export const MILESTONES = [5000, 15000, 30000, 45000, 65000, 85000, 100000, 120000, 135000, 150000];
export const BOWL_KG = 0.4;
export const PRIVACY_URL = 'https://fursteps-site-kj-2567.vercel.app/privacy';

const textGlow = (color: string) => ({ textShadowColor: color, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } });
const short = (m: number) => `${m / 1000}k`;
const plural = (n: number, one: string, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`;

function DogCard({ dog, onPress }: { dog: Dog | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[x.dogcard, glow(C.pink, 18, 0.18)]} accessibilityRole="button">
      <DogAvatar slug={dog?.slug} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={[S.bold, { fontSize: 16 }]}>{dog ? `Walking for ${dog.name}` : 'Walking for the FurSteps pool'}</Text>
        <Text style={S.muted}>{dog ? `Tap to meet ${dog.name}` : 'Choose a shelter dog to walk for'}</Text>
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
  const pct = next ? Math.round(((steps - prev) / (next - prev)) * 100) : 100;
  const inner = Math.min(width, 440) - 40 - 44;
  const orb = Math.floor((inner - 16) / 3), paw = Math.floor((inner - 12 - 40) / 5);
  return (
    <View style={{ gap: 16 }}>
      <DogCard dog={dog} onPress={onDogs} />
      <View style={S.hero}>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Orb size={orb} progress={done / 10} color={C.gold} value={String(done)} label="dog bowls" big />
          <Orb size={orb} progress={1} color={C.pink} value={fmt(home.todaySteps)} label="today" />
          <Orb size={orb} progress={steps / 150000} color={C.cyan} value={fmt(steps)} label="month" />
        </View>
        <View style={{ marginTop: -24 }}><Bowl level={steps / 150000} width={Math.min(240, inner)} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, width: '100%', paddingHorizontal: 6 }}>
          {MILESTONES.map((m) => {
            const state = steps >= m ? 'on' : m === next ? 'next' : 'off';
            return (
              <Pressable key={m} disabled={state !== 'on'} onPress={() => onCelebrate(m)} style={{ alignItems: 'center', width: paw }} accessibilityLabel={`${fmt(m)} steps, ${state === 'on' ? 'unlocked' : state === 'next' ? 'next scoop' : 'locked'}`}>
                <PawTile state={state} size={paw} />
                <Text style={[x.pl, state === 'on' && { color: C.green }, state === 'next' && { color: C.pink }]}>{short(m)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ width: '100%', marginTop: 2 }}><Bar pct={pct} /></View>
        <Text style={[S.p, { fontSize: 15, textAlign: 'center' }]}>
          {next ? <><Text style={S.bold}>{fmt(next - steps)}</Text> steps to your next scoop <Text style={{ color: C.muted }}>({short(next)})</Text></> : 'All 10 scoops unlocked. Epic walking!'}
        </Text>
      </View>
    </View>
  );
}

export function ChallengesScreen({ packs, onPacks }: { packs: Pack[]; onPacks: () => void }) {
  const mine = packs.map((k, i) => ({ k, rank: i + 1 })).filter((r) => r.k.isMine);
  const month = new Date().toLocaleDateString('en-AU', { month: 'long' }).toUpperCase();
  const cards = [
    { kind: 'PACK WAR', title: 'BUILD YOUR CREW. WIN AS A PACK', body: 'Team up with colleagues and race other teams in your company to the top of the ranking.', color: C.cyan },
    { kind: 'TUG OF WAR', title: 'PULL THE BONE FROM A COLLEAGUE', body: 'Challenge one person. Most steps in 3 to 14 days wins the bone.', color: C.pink },
    { kind: 'COMPANY CUP', title: 'YOUR COMPANY VS THE REST', body: 'Companies and industries go head to head, ranked by steps per walker.', color: C.yellow },
  ];
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={S.eyebrow}>{month} · PICK YOUR FIGHT</Text>
        <Text style={[S.h1, { fontSize: 44, lineHeight: 50, color: C.pink }, textGlow(C.pink)]}>Challenges</Text>
        <Text style={[S.h1, { fontSize: 24, color: C.pink, marginTop: -6 }]}>of the month</Text>
        <Text style={[S.muted, { fontSize: 16, lineHeight: 22 }]}>Every step you walk also fills a bowl for a shelter dog. Take on a colleague or lead a pack.</Text>
      </View>
      {cards.map((c) => {
        const live = c.kind === 'PACK WAR';
        return (
          <Pressable key={c.kind} disabled={!live} onPress={onPacks} accessibilityRole={live ? 'button' : undefined}
            style={[x.chal, { borderColor: c.color }, live && { borderStyle: 'solid' }, glow(c.color, 14, 0.25)]}>
            <Text style={[x.chalKind, { color: c.color }]}>{live ? `PACK WAR · LIVE ALL ${month}` : c.kind}</Text>
            <Text style={x.chalTitle}>{c.title}</Text>
            <Text style={[S.p, { fontSize: 15, color: '#d8d4e6' }]}>{c.body}</Text>
            {live ? (
              <>
                {mine.length
                  ? mine.map((r) => <Text key={r.k.id} style={[S.bold, { fontSize: 16 }]}>{r.k.name}: #{r.rank} of {packs.length}</Text>)
                  : <Text style={[S.bold, { fontSize: 16 }]}>You're not in a pack yet.</Text>}
                <Btn label={mine.length ? 'See the pack ranking' : 'Start or join a pack'} kind="coral" small onPress={onPacks} />
              </>
            ) : <Text style={[S.tag, { color: c.color }]}>Coming soon</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function WalkerRow({ w, rank, slug }: { w: Walker; rank: number; slug?: string }) {
  const first = rank === 1 && !w.isMe;
  return (
    <View style={[x.lb, first && x.lbFirst, w.isMe && x.lbMine]}>
      <View style={[x.rank, first && { backgroundColor: C.cyan, borderColor: C.cyan }, w.isMe && { backgroundColor: C.pink, borderColor: C.pink }]}>
        <Text style={[x.rankText, (first || w.isMe) && { color: C.dark }]}>{rank}</Text>
      </View>
      <DogAvatar slug={slug} size={26} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[S.bold, { fontFamily: F.bodyBold, fontSize: 16 }]}>{w.displayName}</Text>
        <Text style={[S.p, { fontSize: 13 }]}>{plural(w.bowls, 'bowl')}</Text>
      </View>
      <View>
        <Text style={x.num}>{fmt(w.steps)}</Text>
        <Text style={[S.p, { fontSize: 12, textAlign: 'right' }]}>steps</Text>
      </View>
    </View>
  );
}

export type PackActions = {
  create: (name: string) => Promise<boolean>;
  join: (code: string) => Promise<boolean>;
  leave: (p: Pack) => void;
  invite: (p: Pack) => void;
  rename: (p: Pack, name: string) => Promise<void>;
  people: (p: Pack) => Promise<{ people: Walker[]; hidden: number }>;
};

export function LeaderboardScreen({ walkers, packs, onBoard, companyName, busy, onJoin, dogs, actions, startOn = 'walkers' }: {
  walkers: Walker[]; packs: Pack[]; onBoard: boolean; companyName: string; busy: boolean; onJoin: () => void; dogs: Dog[]; actions: PackActions; startOn?: 'walkers' | 'packs';
}) {
  const [tab, setTab] = useState<'walkers' | 'packs'>(startOn);
  const [open, setOpen] = useState<Pack | null>(null);
  const slug = (id: string | null) => dogs.find((d) => d.id === id)?.slug;
  const fresh = open && packs.find((k) => k.id === open.id);
  if (fresh) {
    return <PackScreen pack={fresh} slug={slug} busy={busy} actions={actions} onBack={() => setOpen(null)} />;
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Leaderboard</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill label="Walkers" on={tab === 'walkers'} onPress={() => setTab('walkers')} />
        <Pill label="Packs" on={tab === 'packs'} onPress={() => setTab('packs')} />
      </View>
      {tab === 'walkers' ? (
        <>
          {!onBoard && (
            <Card style={[{ borderColor: C.cyan, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Text style={[S.p, { flex: 1, fontSize: 14, lineHeight: 20 }]}>
                <Text style={S.bold}>Join the walker leaderboard? </Text>
                Your name and monthly steps will show to colleagues at {companyName}. You can change this in Me.
              </Text>
              <Btn label="Show me" small onPress={onJoin} busy={busy} />
            </Card>
          )}
          {walkers.length ? walkers.map((w, i) => <WalkerRow key={`${w.displayName}-${i}`} w={w} rank={i + 1} slug={slug(w.dogId)} />) : (
            <Card><Text style={[S.bold, { fontSize: 16 }]}>No walkers here yet.</Text><Text style={S.muted}>Be the first. Tap Show me to join the leaderboard.</Text></Card>
          )}
        </>
      ) : (
        <PacksList packs={packs} busy={busy} actions={actions} onOpen={setOpen} companyName={companyName} />
      )}
    </View>
  );
}

function PacksList({ packs, busy, actions, onOpen, companyName }: { packs: Pack[]; busy: boolean; actions: PackActions; onOpen: (p: Pack) => void; companyName: string }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<'name' | 'code' | null>(null);
  const mine = packs.filter((k) => k.isMine);
  const create = () => {
    Keyboard.dismiss();
    if (!name.trim()) return setHint('name');
    actions.create(name).then((ok) => { if (ok) setName(''); });
  };
  const join = () => {
    Keyboard.dismiss();
    if (code.trim().length !== 6) return setHint('code');
    actions.join(code).then((ok) => { if (ok) setCode(''); });
  };
  return (
    <View style={{ gap: 12 }}>
      <Text style={S.muted}>Packs are teams you make with colleagues at {companyName}. They're ranked by steps per walker this month.</Text>
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
              <Text style={[S.p, { fontSize: 13 }]}>{plural(k.walkers, 'walker')} · {plural(k.bowls, 'bowl')}</Text>
            </View>
            {k.stepsPerWalker != null ? (
              <View>
                <Text style={x.num}>{fmt(k.stepsPerWalker)}</Text>
                <Text style={[S.p, { fontSize: 12, textAlign: 'right' }]}>per walker</Text>
              </View>
            ) : k.isMine ? <Text style={[S.muted, { fontSize: 22 }]}>›</Text> : null}
          </Pressable>
        );
      }) : (
        <Card><Text style={[S.bold, { fontSize: 16 }]}>No packs yet.</Text><Text style={S.muted}>Start one below and invite your colleagues.</Text></Card>
      )}
      {mine.length < 5 && (
        <>
          <Card style={{ gap: 10 }}>
            <Text style={S.h2}>Start a pack</Text>
            <TextInput style={S.input} value={name} onChangeText={(t) => { setName(t); setHint(null); }} placeholder="Pack name, e.g. Level 3 Legends" placeholderTextColor={C.muted} maxLength={40} accessibilityLabel="Pack name" returnKeyType="done" onSubmitEditing={create} />
            {hint === 'name' && <Text style={S.err}>Type a name for your pack first.</Text>}
            <Btn label="Create pack" kind="coral" busy={busy} onPress={create} />
          </Card>
          <Card style={{ gap: 10 }}>
            <Text style={S.h2}>Join with a code</Text>
            <TextInput style={[S.input, { fontFamily: F.mono, letterSpacing: 4, textTransform: 'uppercase' }]} value={code} onChangeText={(t) => { setCode(t.toUpperCase()); setHint(null); }} placeholder="ABC234" placeholderTextColor={C.muted} maxLength={6} autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Pack code" returnKeyType="done" onSubmitEditing={join} />
            {hint === 'code' && <Text style={S.err}>Pack codes have 6 letters and numbers.</Text>}
            <Btn label="Join pack" busy={busy} onPress={join} />
          </Card>
        </>
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
        <Text style={S.eyebrow}>This month</Text>
        <Text style={[S.bold, { fontSize: 22 }]}>{plural(pack.walkers, 'walker')} · {plural(pack.bowls, 'bowl')}</Text>
        {pack.stepsPerWalker != null
          ? <Text style={S.p}>{fmt(pack.stepsPerWalker)} steps per walker</Text>
          : <Text style={S.muted}>Step totals show once the pack has 5 walkers, or everyone in it shows their name.</Text>}
        {pack.code && <Text style={[S.tag, { marginTop: 6 }]}>Invite code {pack.code}</Text>}
        <Btn label="Invite colleagues" kind="coral" small onPress={() => actions.invite(pack)} style={{ marginTop: 6 }} />
      </View>
      {err && <Text style={S.err}>{err}</Text>}
      {!rows ? <Text style={S.muted}>Loading…</Text> : (
        <>
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
      <Btn label="Leave pack" kind="light" small onPress={() => actions.leave(pack)} />
    </View>
  );
}

export function ImpactScreen({ home, dog, onDogs, onMeet }: { home: Home; dog: Dog | null; onDogs: () => void; onMeet: (d: Dog) => void }) {
  const kg = (b: number) => Math.round(b * BOWL_KG * 10) / 10;
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Impact</Text>
      <View style={[S.hero, { alignItems: 'flex-start' }]}>
        <Text style={S.eyebrow}>Food unlocked by the FurSteps community this month</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Text style={{ fontFamily: F.display, fontSize: 64, lineHeight: 72, color: C.fg }}>{kg(home.communityBowls)}</Text><Text style={[S.bold, { fontSize: 20 }]}>kg</Text></View>
        <Text style={S.p}>{plural(home.communityBowls, 'bowl')} from {plural(home.communityWalkers, 'walker')}.</Text>
      </View>
      <Card>
        <Text style={S.eyebrow}>What you unlocked</Text>
        <Text style={[S.bold, { fontSize: 22, marginTop: 2 }]}>{plural(home.myBowls, 'bowl')} <Text style={[S.muted, { fontSize: 15 }]}>· {kg(home.myBowls)} kg</Text></Text>
      </Card>
      <Card>
        <Text style={S.eyebrow}>{home.companyName} this month</Text>
        <Text style={[S.bold, { fontSize: 22, marginTop: 2 }]}>{plural(home.companyBowls, 'bowl')} <Text style={[S.muted, { fontSize: 15 }]}>· {kg(home.companyBowls)} kg</Text></Text>
        <Text style={S.muted}>From {plural(home.companyWalkers, 'walker')} at your workplace.</Text>
      </Card>
      <Card style={{ gap: 10 }}>
        <Text style={S.h2}>Who you are feeding</Text>
        {dog ? (
          <View style={S.row}>
            <DogAvatar slug={dog.slug} size={44} />
            <View style={{ flex: 1 }}><Text style={[S.bold, { fontSize: 16 }]}>{dog.name}</Text><Text style={S.muted}>{[dog.age, dog.breed].filter(Boolean).join(' · ') || dog.shelter}</Text></View>
          </View>
        ) : <Text style={S.muted}>Your bowls go to the FurSteps pool, which feeds whichever dog needs it most. Pick a dog to follow their story.</Text>}
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {dog && <Btn label={`Meet ${dog.name}`} small onPress={() => onMeet(dog)} />}
          <Btn label={dog ? 'Change dog' : 'Meet the dogs'} small kind="light" onPress={onDogs} />
        </View>
      </Card>
      <Card><Text style={[S.bold, { fontSize: 16 }]}>Delivery proof</Text><Text style={S.muted}>Photos and delivery dockets from our rescue partners will show up here once the first food goes out.</Text></Card>
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
            <Text style={[S.p, { flex: 1, fontSize: 15 }]}>Show my name and monthly steps on the walker leaderboard. Only colleagues at {home.companyName} can see it. Off by default.</Text>
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
      <Text style={[S.muted, { fontSize: 13, textAlign: 'center' }]}>{email} · version {appJson.expo.version}</Text>
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
        <Card style={{ borderColor: C.green }}><Text style={[S.bold, { color: C.green, fontSize: 16 }]}>✓ You walk for {dog.name}</Text><Text style={S.muted}>Every bowl you unlock goes to {dog.name}.</Text></Card>
      ) : <Btn label={`Walk for ${dog.name}`} kind="coral" busy={busy} onPress={onPick} />}
      <Text style={S.h2}>Thank-you notes</Text>
      <Text style={S.muted}>No notes yet. The shelter team will post a thank-you here when food arrives.</Text>
      <Card><Text style={[S.bold, { fontSize: 16 }]}>Delivery proof</Text><Text style={S.muted}>Photos and delivery details will show up here once the first food goes out.</Text></Card>
      <Btn label="See all dogs" kind="light" onPress={onAll} />
    </View>
  );
}

export function Celebrate({ visible, bowls, steps, dogName, onDone, onMore }: { visible: boolean; bowls: number; steps: number; dogName: string | null; onDone: () => void; onMore: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: '#07060b', paddingTop: 60, paddingBottom: 30 }}>
        <View style={{ position: 'absolute', top: 40, left: '15%', width: '70%', height: 300, borderRadius: 300, backgroundColor: 'rgba(255,46,154,0.18)' }} />
        <Pressable onPress={onDone} style={{ alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8 }}><Text style={{ color: C.cyan, fontFamily: F.bodyMedium, fontSize: 17 }}>Done</Text></Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, paddingHorizontal: 28 }}>
          <Text style={[{ fontFamily: F.mono, fontSize: 14, letterSpacing: 2.8, color: C.pink }, textGlow(C.pink)]}>CONGRATULATIONS</Text>
          <Text style={{ fontFamily: F.display, fontSize: 36, lineHeight: 40, letterSpacing: -1.2, color: C.fg, textAlign: 'center', marginTop: -12 }}>You helped feed a shelter dog</Text>
          <View style={[x.celCard, glow(C.pink, 40, 0.45)]}>
            <View style={glow(C.green, 12, 0.7)}><BowlIcon /></View>
            <Text style={{ fontFamily: F.display, fontSize: 30, color: C.fg }}>{plural(bowls, 'bowl')}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1.7, color: C.muted }}>{fmt(steps)} STEPS</Text>
          </View>
          <Text style={[S.p, { fontSize: 17, textAlign: 'center', maxWidth: 300 }]}>Thanks to you, a bowl of food is on its way to {dogName ?? 'a rescue near you'}.</Text>
          <Btn label="Find out more" kind="coral" onPress={onMore} style={{ alignSelf: 'stretch' }} />
        </View>
        <Text style={[S.muted, { textAlign: 'center' }]}>Your steps make the difference <Text style={{ color: C.pink }}>♥</Text></Text>
      </View>
    </Modal>
  );
}

const x = StyleSheet.create({
  dogcard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: 'rgba(255,46,154,0.5)', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 },
  pl: { fontFamily: F.display, fontSize: 12, color: C.muted, marginTop: 1 },
  chal: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 22, padding: 18, gap: 10, backgroundColor: '#0b0a12' },
  chalKind: { fontFamily: F.monoBold, fontSize: 13, letterSpacing: 1.6 },
  chalTitle: { fontFamily: 'Bungee_400Regular', fontSize: 24, lineHeight: 28, color: C.fg },
  lb: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 },
  lbFirst: { borderColor: C.cyan, ...glow(C.cyan, 18, 0.25) },
  lbMine: { backgroundColor: 'rgba(255,46,154,0.1)', borderWidth: 2, borderColor: C.pink, ...glow(C.pink, 28, 0.28) },
  rank: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: F.display, fontSize: 18, color: C.muted },
  num: { fontFamily: F.display, fontSize: 22, color: C.fg, textAlign: 'right' },
  drop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 16, minHeight: 56 },
  celCard: { width: 280, aspectRatio: 4 / 3, borderRadius: 22, borderWidth: 2, borderColor: C.pink, backgroundColor: '#100c18', alignItems: 'center', justifyContent: 'center', gap: 6, transform: [{ rotate: '-3deg' }] },
});
