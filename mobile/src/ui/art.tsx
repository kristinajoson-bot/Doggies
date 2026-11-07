import { Image, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C, F, glow } from './theme';

// Drawings ported from the Walkies web app so both look the same.

export function Paw({ size = 28, color = C.pink, outline }: { size?: number; color?: string; outline?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G fill={outline ? 'none' : color} stroke={color} strokeWidth={outline ? 9 : 6}>
        <Ellipse cx={60} cy={80} rx={25} ry={21} /><Ellipse cx={27} cy={52} rx={10} ry={13} />
        <Ellipse cx={47} cy={31} rx={10} ry={13} /><Ellipse cx={73} cy={31} rx={10} ry={13} /><Ellipse cx={93} cy={52} rx={10} ry={13} />
      </G>
    </Svg>
  );
}

// A milestone paw: lit green when reached, pink outline when it's the next one.
export function PawTile({ state, size }: { state: 'on' | 'next' | 'off'; size: number }) {
  const fill = state === 'on' ? C.green : 'none';
  const stroke = state === 'on' ? C.green : state === 'next' ? C.pink : '#cdbfd8';
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G fill={fill} stroke={stroke} strokeWidth={state === 'next' ? 7 : 5}>
        <Ellipse cx={25} cy={52} rx={10} ry={13} /><Ellipse cx={46} cy={29} rx={10} ry={13} />
        <Ellipse cx={74} cy={29} rx={10} ry={13} /><Ellipse cx={95} cy={52} rx={10} ry={13} />
        <Ellipse cx={60} cy={84} rx={31} ry={25} />
      </G>
    </Svg>
  );
}

// A plum ceramic dog bowl with a white outline paw that fills with kibble (level 0 to 1). The same bowl is used everywhere.
// Kibble pieces sit on a fixed grid; only the ones under the mound line show, back rows first.
const KIBBLE_GRID: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  let k = 0;
  for (let y = 14; y <= 70; y += 5.5) {
    const shift = (Math.round(y) % 2) * 4.5;
    for (let x = 32 + shift; x <= 168; x += 9) out.push([x + ((k * 37) % 5) - 2, y + ((k * 53) % 3) - 1, (k++ * 47) % 180]);
  }
  return out;
})();
const KIBBLE_COLOURS = ['#6b3a1e', '#7a4424', '#5e3219', '#84502c'];
// Round kibble pieces with a soft highlight, like the mock-up.
function Kibble({ x, y, i }: { x: number; y: number; r: number; i: number }) {
  if (i % 2) return null; // every other grid spot stays tan mound, so pieces read as separate balls
  return (
    <G>
      <Circle cx={x} cy={y} r={5.4} fill={KIBBLE_COLOURS[i % 4]} />
      <Circle cx={x - 1.6} cy={y - 1.8} r={1.5} fill="#ffffff" opacity={0.18} />
    </G>
  );
}
export function Bowl({ level, width = 250, id = 'b' }: { level: number; width?: number; id?: string }) {
  const l = Math.max(0, Math.min(1, level));
  const top = 52 - 34 * l; // peak of the kibble mound
  const edge = 53 - 2 * l; // where the mound meets the bowl wall
  const mound = (x: number) => top + (edge - top) * Math.pow((x - 100) / 62, 2);
  const front = (x: number) => 52 + 11 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 100) / 62, 2)));
  const pieces = KIBBLE_GRID.filter(([x, y]) => Math.abs(x - 100) <= 58 && y >= mound(x) + 2 && y <= front(x) - 3);
  return (
    <Svg width={width} height={Math.round(width * 0.7)} viewBox="0 0 200 140">
      <Defs>
        <LinearGradient id={`${id}cer`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#a24c72" /><Stop offset="0.35" stopColor="#c56f93" /><Stop offset="1" stopColor="#6e2a4e" />
        </LinearGradient>
        <ClipPath id={`${id}in`}><Path d="M38 0 H162 V52 A62 11 0 0 1 38 52 Z" /></ClipPath>
      </Defs>
      <Ellipse cx={100} cy={129} rx={92} ry={7} fill="#4a2a5a" opacity={0.12} />
      <Path d="M30 54 L14 110 Q13 121 28 124 Q100 133 172 124 Q187 121 186 110 L170 54 Z" fill={`url(#${id}cer)`} />
      <Path d="M17 112 Q100 128 183 112" stroke="#5e2443" strokeOpacity={0.35} strokeWidth={2} fill="none" />
      <Ellipse cx={100} cy={53} rx={71} ry={15} fill="#e3a9c0" />
      <Ellipse cx={100} cy={52} rx={62} ry={11} fill="#5a2e44" />
      {l > 0.01 && (
        <G clipPath={`url(#${id}in)`}>
          <Path d={`M38 ${edge} Q100 ${2 * top - edge} 162 ${edge} L162 52 A62 11 0 0 1 38 52 Z`} fill="#c98a4a" />
          {pieces.map(([x, y, r], i) => <Kibble key={i} x={x} y={y} r={r} i={i} />)}
        </G>
      )}
      <G fill="none" stroke="#ffffff" strokeWidth={2.6}>
        <Ellipse cx={100} cy={101} rx={10} ry={7.5} /><Circle cx={85} cy={89} r={4.2} /><Circle cx={95} cy={82.5} r={4.2} />
        <Circle cx={105} cy={82.5} r={4.2} /><Circle cx={115} cy={89} r={4.2} />
      </G>
      <Path d="M166 26 L171 12 M176 31 L187 21 M179 42 L193 38" stroke={C.pink} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

// The bone in a tug of war. It slides toward whoever is ahead.
export function Bone({ width = 36, color = '#f3e2c4' }: { width?: number; color?: string }) {
  // A short, chubby cartoon bone: round knobs, soft outline.
  return (
    <Svg width={width} height={width * 0.62} viewBox="0 0 50 31">
      <G fill={color} stroke="#c9a46e" strokeWidth={1.6}>
        <Circle cx={10} cy={9} r={7.5} /><Circle cx={10} cy={22} r={7.5} /><Circle cx={40} cy={9} r={7.5} /><Circle cx={40} cy={22} r={7.5} />
      </G>
      <Rect x={9} y={8} width={32} height={15} rx={5} fill={color} />
      <Path d="M9 8 H41 M9 23 H41" stroke="#c9a46e" strokeWidth={1.6} />
      <Path d="M15 12 H30" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// One of the three rings at the top of Today: icon, number and label inside a soft coloured ring.
export function Orb({ size, progress, color, value, label, icon }: { size: number; progress: number; color: string; value: string; label: string; icon: 'bowl' | 'shoe' | 'calendar' }) {
  const p = Math.max(0.04, Math.min(1, progress));
  const r = 45, circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={7} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - p)} />
      </Svg>
      <View style={{ alignItems: 'center', zIndex: 1 }}>
        <RingIcon kind={icon} size={size * 0.2} />
        <Svg width={size * 0.8} height={size * 0.26} viewBox="0 0 80 26">
          <SvgText x={40} y={22} fontFamily={F.display} fontSize={value.length > 6 ? 14 : value.length > 5 ? 16 : value.length > 4 ? 18 : 24} fill={C.fg} textAnchor="middle">{value}</SvgText>
        </Svg>
        <SvgLabel text={label} />
      </View>
    </View>
  );
}

function RingIcon({ kind, size }: { kind: 'bowl' | 'shoe' | 'calendar'; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.fg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'bowl' ? <><Ellipse cx={12} cy={9} rx={9} ry={3} /><Path d="M3 9c.5 5 3.5 8 9 8s8.5-3 9-8" /></>
        : kind === 'shoe' ? <><Path d="M3 16v-4c2 0 4-1 5-4l3 1c0 2 1 3 3 3l5 1c1.5.3 2 1.5 2 3H3z" /><Path d="M3 18h18" /><Path d="M10 10l1 1.5M12.5 10.5l.8 1.5" /></>
        : <><Rect x={4} y={5} width={16} height={15} rx={2.5} /><Path d="M4 10h16M8 3v4M16 3v4" /></>}
    </Svg>
  );
}

// Soft purple-pink waves behind the app, as in the mock-up.
// Background art: soft glows plus faint paw prints, bones, hearts and dots scattered down the page.
const DECOR: [number, number, 'paw' | 'bone' | 'heart' | 'dot', number, number][] = (() => {
  const kinds = ['paw', 'dot', 'bone', 'dot', 'heart', 'paw', 'dot'] as const;
  const out: [number, number, 'paw' | 'bone' | 'heart' | 'dot', number, number][] = [];
  for (let i = 0; i < 34; i++) {
    const x = ((i * 0.618034) % 1) * 0.92 + 0.04; // spread evenly across the width
    const y = i / 34 + ((i * 37) % 7) / 200;
    out.push([x, y, kinds[i % kinds.length], ((i * 53) % 70) - 35, 0.75 + ((i * 29) % 5) / 10]);
  }
  return out;
})();
const DECOR_COLOURS = ['#9c3d63', '#a77bd8', '#5aa3a8', '#e27f8c'];

export function Waves({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <RadialGradient id="wv1" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#a98ad8" stopOpacity={0.55} /><Stop offset="0.45" stopColor="#d9a7c7" stopOpacity={0.35} /><Stop offset="1" stopColor="#faf6f5" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wv2" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#e3a9c0" stopOpacity={0.4} /><Stop offset="0.5" stopColor="#c7b0e6" stopOpacity={0.22} /><Stop offset="1" stopColor="#faf6f5" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wv3" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#9fd3d0" stopOpacity={0.3} /><Stop offset="1" stopColor="#faf6f5" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width * 1.02} cy={70} rx={width * 0.62} ry={190} fill="url(#wv1)" />
      <Ellipse cx={-width * 0.05} cy={height * 0.45} rx={width * 0.45} ry={170} fill="url(#wv3)" />
      <Ellipse cx={width * 0.35} cy={height + 10} rx={width * 0.9} ry={170} fill="url(#wv2)" />
      {DECOR.map(([fx, fy, kind, rot, sc], i) => {
        const x = fx * width, y = 40 + fy * (height - 60), c = DECOR_COLOURS[i % 4];
        return (
          <G key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={kind === 'dot' ? 0.28 : 0.17} fill={c}>
            {kind === 'paw' ? <><Ellipse cx={0} cy={4} rx={6} ry={5} /><Circle cx={-6} cy={-3} r={2.4} /><Circle cx={-2} cy={-7} r={2.4} /><Circle cx={2} cy={-7} r={2.4} /><Circle cx={6} cy={-3} r={2.4} /></>
              : kind === 'bone' ? <><Circle cx={-7} cy={-2.5} r={3} /><Circle cx={-7} cy={2.5} r={3} /><Circle cx={7} cy={-2.5} r={3} /><Circle cx={7} cy={2.5} r={3} /><Rect x={-7} y={-2.5} width={14} height={5} /></>
              : kind === 'heart' ? <Path d="M0 6 C-8 0 -5 -7 0 -3 C5 -7 8 0 0 6 Z" />
              : <Circle cx={0} cy={0} r={3} />}
          </G>
        );
      })}
    </Svg>
  );
}

function SvgLabel({ text }: { text: string }) {
  return (
    <Svg width={90} height={14} viewBox="0 0 90 14">
      <SvgText x={45} y={11} fontFamily={F.bodyBold} fontSize={9.5} letterSpacing={0.4} fill={C.fg} textAnchor="middle">{text.toUpperCase()}</SvgText>
    </Svg>
  );
}

export const DOG_PHOTOS: Record<string, { thumb: number; photos: number[] }> = {
  lima: { thumb: require('../../assets/dogs/lima-thumb.jpg'), photos: [require('../../assets/dogs/lima-1.jpg'), require('../../assets/dogs/lima-2.jpg')] },
  cusco: { thumb: require('../../assets/dogs/cusco-thumb.jpg'), photos: [require('../../assets/dogs/cusco-1.jpg'), require('../../assets/dogs/cusco-2.jpg')] },
  pepper: { thumb: require('../../assets/dogs/pepper-thumb.jpg'), photos: [require('../../assets/dogs/pepper-1.jpg'), require('../../assets/dogs/pepper-2.jpg')] },
};

// A round dog photo in a glowing pink ring; a pink paw when no dog is chosen.
export function DogAvatar({ slug, size }: { slug?: string | null; size: number }) {
  const ring = Math.round(size * 1.25), pic = slug ? DOG_PHOTOS[slug] : undefined;
  return (
    <View style={[{ width: ring, height: ring, borderRadius: ring / 2, borderWidth: 2, borderColor: 'rgba(214,31,105,0.35)', backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, glow(C.pink, 11, 0.3)]}>
      {pic ? <Image source={pic.thumb} style={{ width: '100%', height: '100%' }} /> : <Paw size={size} />}
    </View>
  );
}

const TAB_PATHS: Record<string, string> = {
  today: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  rivals: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  impact: 'M3 11h18a9 6 0 0 1-18 0zM7 20h10',
  me: 'M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7',
};

export function TabIcon({ tab, color }: { tab: string; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {tab === 'packs' ? (
        <>
          <Circle cx={9} cy={8} r={3.5} /><Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
          <Circle cx={17} cy={9} r={2.5} /><Path d="M17 14c2.6 0 4.5 1.8 4.5 4.5" />
        </>
      ) : tab === 'me' ? (
        <><Circle cx={12} cy={8} r={4} /><Path d={TAB_PATHS.me} /></>
      ) : (
        <Path d={TAB_PATHS[tab]} />
      )}
    </Svg>
  );
}

export function BowlIcon({ size = 64, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11h18a9 6 0 0 1-18 0zM6 20h12M9 7l1-3M14 7l1-3" />
    </Svg>
  );
}
