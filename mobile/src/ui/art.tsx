import { Image, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C, F, glow } from './theme';

// Drawings ported from the Walkies web app so both look the same.

export function Paw({ size = 28, color = C.pink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G fill={color} stroke={color} strokeWidth={6}>
        <Ellipse cx={60} cy={80} rx={25} ry={21} /><Ellipse cx={27} cy={52} rx={10} ry={13} />
        <Ellipse cx={47} cy={31} rx={10} ry={13} /><Ellipse cx={73} cy={31} rx={10} ry={13} /><Ellipse cx={93} cy={52} rx={10} ry={13} />
      </G>
    </Svg>
  );
}

// A milestone paw: lit green when reached, pink outline when it's the next one.
export function PawTile({ state, size }: { state: 'on' | 'next' | 'off'; size: number }) {
  const fill = state === 'on' ? C.green : 'none';
  const stroke = state === 'on' ? C.green : state === 'next' ? C.pink : '#4a4660';
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

// A cream ceramic dog bowl with a pink paw that fills with kibble (level 0 to 1). The same bowl is used everywhere.
// Kibble pieces sit on a fixed grid; only the ones under the mound line show, back rows first.
const KIBBLE_GRID: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  let k = 0;
  for (let y = 22; y <= 70; y += 5.5) {
    const shift = (Math.round(y) % 2) * 4.5;
    for (let x = 32 + shift; x <= 168; x += 9) out.push([x + ((k * 37) % 5) - 2, y + ((k * 53) % 3) - 1, (k++ * 47) % 180]);
  }
  return out;
})();
const KIBBLE_COLOURS = ['#b07a45', '#8c5a2e', '#c7925a', '#a0472e'];
// Matte mixed kibble: rounds, triangles and crosses.
function Kibble({ x, y, r, i }: { x: number; y: number; r: number; i: number }) {
  const c = KIBBLE_COLOURS[i % 4];
  const s = i % 3;
  if (s === 0) return <Circle cx={x} cy={y} r={4} fill={c} />;
  if (s === 1) return <Polygon transform={`rotate(${r} ${x} ${y})`} points={`${x},${y - 4.6} ${x + 4.3},${y + 3} ${x - 4.3},${y + 3}`} fill={c} stroke={c} strokeWidth={1.5} strokeLinejoin="round" />;
  return (
    <G transform={`rotate(${r} ${x} ${y})`} fill={c}>
      <Rect x={x - 4.5} y={y - 1.6} width={9} height={3.2} rx={1.4} /><Rect x={x - 1.6} y={y - 4.5} width={3.2} height={9} rx={1.4} />
    </G>
  );
}
export function Bowl({ level, width = 250, id = 'b' }: { level: number; width?: number; id?: string }) {
  const l = Math.max(0, Math.min(1, level));
  const top = 60 - 30 * l; // peak of the kibble mound
  const edge = 61 - 2 * l; // where the mound meets the bowl wall
  const mound = (x: number) => top + (edge - top) * Math.pow((x - 100) / 70, 2);
  const front = (x: number) => 59 + 14 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 100) / 72, 2)));
  const pieces = KIBBLE_GRID.filter(([x, y]) => Math.abs(x - 100) <= 68 && y >= mound(x) + 1 && y <= front(x) - 3);
  return (
    <Svg width={width} height={Math.round(width * 0.7)} viewBox="0 0 200 140">
      <Defs>
        <LinearGradient id={`${id}cer`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#c9c3b8" /><Stop offset="0.35" stopColor="#fbf8f2" /><Stop offset="1" stopColor="#b5afa4" />
        </LinearGradient>
        <ClipPath id={`${id}in`}><Path d="M29 0 H171 V59 A71 13 0 0 1 29 59 Z" /></ClipPath>
      </Defs>
      <Ellipse cx={100} cy={128} rx={74} ry={7} fill="#000" opacity={0.6} />
      <Path d="M18 58 C22 108 58 124 100 124 C142 124 178 108 182 58 Z" fill={`url(#${id}cer)`} />
      <Ellipse cx={100} cy={58} rx={82} ry={18} fill="#ffffff" />
      <Ellipse cx={100} cy={59} rx={72} ry={14} fill="#2a1a14" />
      {l > 0.01 && (
        <G clipPath={`url(#${id}in)`}>
          <Path d={`M29 ${edge} Q100 ${2 * top - edge} 171 ${edge} L171 59 A71 13 0 0 1 29 59 Z`} fill="#6a4220" />
          {pieces.map(([x, y, r], i) => <Kibble key={i} x={x} y={y} r={r} i={i} />)}
        </G>
      )}
      <G fill={C.pink}>
        <Ellipse cx={100} cy={106} rx={8.5} ry={6.5} /><Circle cx={87} cy={96} r={3.6} /><Circle cx={95} cy={90.5} r={3.6} />
        <Circle cx={105} cy={90.5} r={3.6} /><Circle cx={113} cy={96} r={3.6} />
      </G>
    </Svg>
  );
}

// The bone in a tug of war. It slides toward whoever is ahead.
export function Bone({ width = 90, color = '#f4ead8' }: { width?: number; color?: string }) {
  return (
    <Svg width={width} height={width * 0.42} viewBox="0 0 100 42">
      <G fill={color}>
        <Circle cx={11} cy={12} r={10} /><Circle cx={11} cy={30} r={10} /><Circle cx={89} cy={12} r={10} /><Circle cx={89} cy={30} r={10} />
        <Path d="M10 11 H90 V31 H10 Z" />
      </G>
      <Path d="M18 16 H82" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// One of the three round counters at the top of Today.
export function Orb({ size, progress, color, value, label, big }: { size: number; progress: number; color: string; value: string; label: string; big?: boolean }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#1a1428', alignItems: 'center', justifyContent: 'center' }, glow(color, 10, 0.4)]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={46} fill="none" stroke={C.line} strokeWidth={7} />
        <Circle cx={50} cy={50} r={46} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray="289" strokeDashoffset={Math.round(289 * (1 - p))} />
      </Svg>
      <Svg width={size * 0.8} height={size * 0.5} viewBox="0 0 80 40">
        <SvgText x={40} y={big ? 30 : 26} fontFamily={F.display} fontSize={big ? 30 : value.length > 6 ? 16 : 18} fill={big ? '#ffd24a' : '#ffffff'} textAnchor="middle">{value}</SvgText>
      </Svg>
      <View style={{ position: 'absolute', bottom: size * 0.24 }}>
        <SvgLabel text={label} />
      </View>
    </View>
  );
}

function SvgLabel({ text }: { text: string }) {
  return (
    <Svg width={90} height={14} viewBox="0 0 90 14">
      <SvgText x={45} y={11} fontFamily={F.bodyBold} fontSize={9.5} letterSpacing={0.8} fill={C.muted} textAnchor="middle">{text.toUpperCase()}</SvgText>
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
    <View style={[{ width: ring, height: ring, borderRadius: ring / 2, borderWidth: 2, borderColor: 'rgba(255,46,154,0.6)', backgroundColor: '#1a0f1c', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, glow(C.pink, 11, 0.3)]}>
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
