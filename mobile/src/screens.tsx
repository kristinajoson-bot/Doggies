import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import appJson from '../app.json';

import type { Colleague, CompanyRow, Dog, Duel, Home, Pack, Walker } from './backend';
import { Bone, Bowl, DOG_PHOTOS, DogAvatar, PawTile } from './ui/art';
import { Bar, Btn, Card, Pill, fmt } from './ui/kit';
import { C, F, S, glow } from './ui/theme';

export const MILESTONES = [5000, 15000, 30000, 45000, 65000, 85000, 100000, 120000, 135000, 150000];
export const BOWL_KG = 0.4;
export const PRIVACY_URL = 'https://fursteps-site-kj-2567.vercel.app/privacy';

const textGlow = (color: string) => ({ textShadowColor: color, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } });
const plural = (n: number, one: string, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`;

function DogCard({ dog, onPress }: { dog: Dog | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[x.dogcard, glow(C.pink, 18, 0.18)]} accessibilityRole="button">
      <DogAvatar slug={dog?.slug} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={[S.bold, { fontSize: 16 }]}>{dog ? `Walking for ${dog.name}` : 'Choose a shelter dog to walk for'}</Text>
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
  const paw = Math.floor((inner - 12 - 40) / 5);
  return (
    <View style={{ gap: 16 }}>
      <DogCard dog={dog} onPress={onDogs} />
      <View style={S.hero}>
        <Pressable disabled={!prev} onPress={() => onCelebrate(prev)} accessibilityLabel={`${done} bowls this month`} style={{ alignItems: 'center' }}>
          <Bowl level={fill} width={Math.min(260, inner)} id="today" />
        </Pressable>
        <View style={{ alignItems: 'center', marginTop: -6 }}>
          <Text style={[{ fontFamily: F.display, fontSize: 56, lineHeight: 60, color: C.gold }, textGlow(C.gold)]}>{done}</Text>
          <Text style={S.eyebrow}>{done === 1 ? 'bowl' : 'bowls'} this month</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, width: '100%', paddingHorizontal: 6, marginTop: 6 }}>
          {MILESTONES.map((m) => {
            const state = steps >= m ? 'on' : m === next ? 'next' : 'off';
            return (
              <Pressable key={m} disabled={state !== 'on'} onPress={() => onCelebrate(m)} style={{ alignItems: 'center', width: paw }} accessibilityLabel={`${fmt(m)} steps, ${state === 'on' ? 'bowl filled' : state === 'next' ? 'next bowl' : 'locked'}`}>
                <PawTile state={state} size={paw} />
                <Text style={[x.pl, state === 'on' && { color: C.green }, state === 'next' && { color: C.pink }]}>{m / 1000}k</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ width: '100%', marginTop: 4 }}><Bar pct={Math.round(fill * 100)} /></View>
        <Text style={[S.p, { fontSize: 15, textAlign: 'center' }]}>
          {next ? <><Text style={S.bold}>{fmt(next - steps)}</Text> steps to fill your next bowl</> : 'Every bowl filled this month. Epic walking!'}
        </Text>
        <View style={{ flexDirection: 'row', width: '100%', marginTop: 6 }}>
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={[x.num, { color: C.pink, textAlign: 'center' }]}>{fmt(home.todaySteps)}</Text><Text style={S.eyebrow}>today</Text></View>
          <View style={{ width: 1, backgroundColor: C.line }} />
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={[x.num, { color: C.cyan, textAlign: 'center' }]}>{fmt(steps)}</Text><Text style={S.eyebrow}>this month</Text></View>
        </View>
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

export function ChallengesScreen({ packs, onPacks, onOpenPack, duels, tug, busy, dogs }: {
  packs: Pack[]; onPacks: () => void; onOpenPack: (p: Pack) => void; duels: Duel[]; tug: TugActions; busy: boolean; dogs: Dog[];
}) {
  const [inTug, setInTug] = useState(false);
  const slug = (id: string | null) => dogs.find((d) => d.id === id)?.slug;
  const mine = packs.map((k, i) => ({ k, rank: i + 1 })).filter((r) => r.k.isMine);
  if (inTug) return <TugScreen duels={duels} tug={tug} busy={busy} dogs={dogs} onBack={() => setInTug(false)} />;
  const open = duels.find((d) => d.status === 'active') ?? duels.find((d) => d.status === 'pending');
  return (
    <View style={{ gap: 16 }}>
      <Text style={[S.h1, { fontSize: 44, lineHeight: 50, color: C.pink }, textGlow(C.pink)]}>Challenges</Text>
      <View style={[x.chal, { borderColor: C.pink, borderStyle: 'solid' }, glow(C.pink, 14, 0.25)]}>
        <Text style={[x.chalKind, { color: C.pink }]}>TUG OF WAR</Text>
        {open ? <DuelCard d={open} slug={slug} tug={tug} busy={busy} /> : (
          <>
            <Text style={x.chalTitle}>PULL THE BONE FROM A COLLEAGUE</Text>
            <Text style={[S.p, { fontSize: 15, color: '#d8d4e6' }]}>Most steps in 3 to 14 days wins the bone.</Text>
            <Btn label="Challenge a colleague" kind="coral" small onPress={() => setInTug(true)} />
          </>
        )}
        {open && <Pressable onPress={() => setInTug(true)} accessibilityRole="button"><Text style={S.linkbtn}>Past tugs of war ›</Text></Pressable>}
      </View>
      <Pressable onPress={() => (mine.length ? onOpenPack(mine[0].k) : onPacks())} accessibilityRole="button"
        style={[x.chal, { borderColor: C.cyan, borderStyle: 'solid' }, glow(C.cyan, 14, 0.25)]}>
        <Text style={[x.chalKind, { color: C.cyan }]}>PACK WAR</Text>
        <Text style={x.chalTitle}>BUILD YOUR CREW. WIN AS A PACK</Text>
        {mine.length
          ? mine.map((r) => <Text key={r.k.id} style={[S.bold, { fontSize: 16 }]}>{r.k.name} · #{r.rank} of {packs.length} ›</Text>)
          : <Btn label="Start or join a pack" kind="coral" small onPress={onPacks} />}
      </Pressable>
    </View>
  );
}

// One tug of war: an invite to answer, a challenge waiting, or the live bone.
function DuelCard({ d, slug, tug, busy }: { d: Duel; slug: (id: string | null) => string | undefined; tug: TugActions; busy: boolean }) {
  const name = d.opponentName ?? 'your colleague';
  const who = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <DogAvatar slug={slug(d.opponentDog)} size={34} />
      <Text style={[S.bold, { fontSize: 18, flex: 1 }]}>{d.status === 'pending' && !d.isChallenger ? `${name} challenged you` : `You vs ${name}`}</Text>
    </View>
  );
  if (d.status === 'pending' && !d.isChallenger) {
    return (
      <View style={{ gap: 10 }}>
        {who}
        <Text style={S.muted}>{d.days} days. If you accept, you two see each other's steps for these days only.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Accept" small kind="coral" busy={busy} onPress={() => { tug.accept(d); }} />
          <Btn label="Decline" small kind="light" onPress={() => tug.decline(d)} />
        </View>
      </View>
    );
  }
  if (d.status === 'pending') {
    return (
      <View style={{ gap: 10 }}>
        {who}
        <Text style={S.muted}>Waiting for {name} to accept · {d.days} days</Text>
        <Btn label="Cancel challenge" small kind="light" onPress={() => tug.cancel(d)} />
      </View>
    );
  }
  const done = d.status === 'finished';
  const left = daysLeft(d.endsOn);
  const verdict = d.mySteps === d.theirSteps ? "It's a draw" : d.mySteps > d.theirSteps ? (done ? 'You won the bone!' : "You're winning") : (done ? `${name} won the bone` : `${name} is ahead`);
  return (
    <View style={{ gap: 10 }}>
      {who}
      <TugBar mine={d.mySteps} theirs={d.theirSteps} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View><Text style={[x.num, { textAlign: 'left', color: C.pink }]}>{fmt(d.mySteps)}</Text><Text style={S.muted}>You</Text></View>
        <View><Text style={[x.num, { color: C.cyan }]}>{fmt(d.theirSteps)}</Text><Text style={[S.muted, { textAlign: 'right' }]}>{name}</Text></View>
      </View>
      <Text style={[S.bold, { fontSize: 16, color: done && d.mySteps > d.theirSteps ? C.green : C.fg }]}>
        {verdict} · {done ? 'Finished' : left <= 1 ? 'Last day' : `${left} days left`}
      </Text>
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
function TugBar({ mine, theirs }: { mine: number; theirs: number }) {
  const [w, setW] = useState(0);
  const total = mine + theirs;
  const lead = total ? (mine - theirs) / total : 0; // -1..1, positive = you lead
  const pos = 0.5 - Math.max(-0.38, Math.min(0.38, lead * 0.6)); // 0 = your end (left)
  const bone = 84;
  return (
    <View style={{ height: 44, justifyContent: 'center' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ flex: 1, backgroundColor: C.pink }} /><View style={{ flex: 1, backgroundColor: C.cyan }} />
      </View>
      <View style={{ position: 'absolute', left: '50%', top: 6, bottom: 6, width: 2, marginLeft: -1, backgroundColor: C.fg, opacity: 0.5 }} />
      {w > 0 && <View style={{ position: 'absolute', left: w * pos - bone / 2 }}><Bone width={bone} /></View>}
    </View>
  );
}

function TugScreen({ duels, tug, busy, dogs, onBack }: { duels: Duel[]; tug: TugActions; busy: boolean; dogs: Dog[]; onBack: () => void }) {
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
      <Text style={[S.h1, { color: C.pink }, textGlow(C.pink)]}>Tug of War</Text>
      {duels.map((d) => (
        <View key={d.id} style={[S.card, { gap: 10 }, d.status !== 'finished' && { borderColor: C.pink, borderWidth: 2 }]}>
          <DuelCard d={d} slug={slug} tug={tug} busy={busy} />
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
                  {pick === p.id && <Text style={[S.bold, { color: C.pink }]}>✓</Text>}
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
      </View>
      <Text style={x.num}>{fmt(w.steps)}</Text>
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
        <Pill label="Walkers" on={tab === 'walkers'} onPress={() => setTab('walkers')} />
        <Pill label="Packs" on={tab === 'packs'} onPress={() => setTab('packs')} />
        <Pill label="Companies" on={tab === 'companies'} onPress={() => setTab('companies')} />
      </View>
      {tab !== 'companies' && <Text style={S.eyebrow}>{emoji ? `${emoji} ` : ''}{companyName}</Text>}
      {tab === 'walkers' ? (
        <>
          {!onBoard && (
            <Card style={[{ borderColor: C.cyan, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Text style={[S.bold, { flex: 1, fontSize: 15 }]}>Show your name here?</Text>
              <Btn label="Show me" small onPress={onJoin} busy={busy} />
            </Card>
          )}
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
                  <Text style={[S.p, { fontSize: 13 }]}>{plural(c.walkers, 'walker')}</Text>
                </View>
                {c.stepsPerWalker != null
                  ? <Text style={x.num}>{fmt(c.stepsPerWalker)}</Text>
                  : <Text style={[S.bold, { color: C.gold }]}>{plural(c.bowls, 'bowl')}</Text>}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PacksList({ packs, busy, actions, onOpen }: { packs: Pack[]; busy: boolean; actions: PackActions; onOpen: (p: Pack) => void }) {
  const [name, setName] = useState('');
  const [hint, setHint] = useState<'name' | null>(null);
  const mine = packs.filter((k) => k.isMine);
  const create = () => {
    Keyboard.dismiss();
    if (!name.trim()) return setHint('name');
    actions.create(name).then((ok) => { if (ok) setName(''); });
  };
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
              <Text style={[S.p, { fontSize: 13 }]}>{plural(k.walkers, 'walker')}</Text>
            </View>
            {k.stepsPerWalker != null ? <Text style={x.num}>{fmt(k.stepsPerWalker)}</Text> : k.isMine ? <Text style={[S.muted, { fontSize: 22 }]}>›</Text> : null}
            {!k.isMine && mine.length < 5 && <Btn label="Join" small kind="coral" busy={busy} onPress={() => actions.join(k)} />}
          </Pressable>
        );
      }) : (
        <Card><Text style={[S.bold, { fontSize: 16 }]}>No packs yet. Start one below.</Text></Card>
      )}
      {mine.length < 5 && (
        <>
          <Card style={{ gap: 10 }}>
            <Text style={S.h2}>Start a pack</Text>
            <TextInput style={S.input} value={name} onChangeText={(t) => { setName(t); setHint(null); }} placeholder="Pack name, e.g. Level 3 Legends" placeholderTextColor={C.muted} maxLength={40} accessibilityLabel="Pack name" returnKeyType="done" onSubmitEditing={create} />
            {hint === 'name' && <Text style={S.err}>Type a name for your pack first.</Text>}
            <Btn label="Create pack" kind="coral" busy={busy} onPress={create} />
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
          : null}
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
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Btn label="Start another pack" small onPress={onBack} />
        <Btn label="Leave pack" kind="light" small onPress={() => actions.leave(pack)} />
      </View>
    </View>
  );
}

export function ImpactScreen({ home, dog, allTime, onDogs, onMeet }: { home: Home; dog: Dog | null; allTime: number | null; onDogs: () => void; onMeet: (d: Dog) => void }) {
  const kg = (b: number) => Math.round(b * BOWL_KG * 10) / 10;
  const Stat = ({ label, bowls }: { label: string; bowls: number }) => (
    <View style={{ flex: 1 }}>
      <Text style={S.eyebrow}>{label}</Text>
      <Text style={[S.bold, { fontSize: 22, marginTop: 2 }]}>{plural(bowls, 'bowl')}</Text>
      <Text style={S.muted}>{kg(bowls)} kg</Text>
    </View>
  );
  return (
    <View style={{ gap: 16 }}>
      <Text style={S.h1}>Impact</Text>
      <View style={[S.hero, { alignItems: 'flex-start' }]}>
        <Text style={S.eyebrow}>FurSteps community this month</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Text style={{ fontFamily: F.display, fontSize: 64, lineHeight: 72, color: C.fg }}>{kg(home.communityBowls)}</Text><Text style={[S.bold, { fontSize: 20 }]}>kg of food</Text></View>
        <Text style={S.p}>{plural(home.communityBowls, 'bowl')} from {plural(home.communityWalkers, 'walker')}</Text>
      </View>
      <Card style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="This month" bowls={home.myBowls} />
        {allTime != null && <Stat label="All time" bowls={allTime} />}
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

// Shown once, right after a new walker agrees to share steps.
export function ChooseDogPopup({ visible, dogs, busy, onPick, onLater }: { visible: boolean; dogs: Dog[]; busy: boolean; onPick: (id: string) => void; onLater: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLater}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 48, gap: 16 }}>
          <Text style={[{ fontFamily: F.mono, fontSize: 13, letterSpacing: 2.4, color: C.pink }]}>WELCOME TO FURSTEPS</Text>
          <Text style={S.h1}>Choose a shelter dog to walk for</Text>
          <Text style={S.muted}>Every bowl your steps unlock goes to your dog. You can change dogs any time.</Text>
          {dogs.map((d) => {
            const photo = DOG_PHOTOS[d.slug]?.photos?.[0];
            return (
              <Card key={d.id} style={{ gap: 12 }}>
                {photo ? <Image source={photo} style={{ width: '100%', height: 220, borderRadius: 18 }} resizeMode="cover" /> : <DogAvatar slug={d.slug} size={64} />}
                <View><Text style={[S.bold, { fontSize: 20 }]}>{d.name}</Text><Text style={S.muted}>{[d.age, d.breed, d.shelter].filter(Boolean).join(' · ')}</Text></View>
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
      <View style={{ flex: 1, backgroundColor: '#07060b', paddingTop: 60, paddingBottom: 30 }}>
        <View style={{ position: 'absolute', top: 40, left: '15%', width: '70%', height: 300, borderRadius: 300, backgroundColor: 'rgba(255,46,154,0.18)' }} />
        <Pressable onPress={onDone} style={{ alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8 }}><Text style={{ color: C.cyan, fontFamily: F.bodyMedium, fontSize: 17 }}>Done</Text></Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, paddingHorizontal: 28 }}>
          <Text style={[{ fontFamily: F.mono, fontSize: 14, letterSpacing: 2.8, color: C.pink }, textGlow(C.pink)]}>CONGRATULATIONS</Text>
          <Text style={{ fontFamily: F.display, fontSize: 36, lineHeight: 40, letterSpacing: -1.2, color: C.fg, textAlign: 'center', marginTop: -12 }}>You helped feed a shelter dog</Text>
          <View style={[x.celCard, glow(C.pink, 40, 0.45)]}>
            <Bowl level={1} width={150} id="cel" />
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
