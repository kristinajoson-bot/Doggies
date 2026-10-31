import { Image, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

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
  const fill = state === 'on' ? C.green : C.surface;
  const stroke = state === 'on' ? C.green : state === 'next' ? C.pink : '#4a4660';
  const glowStyle = state === 'on' ? glow(C.green, 6, 0.6) : state === 'next' ? glow(C.pink, 6, 0.65) : {};
  return (
    <View style={glowStyle}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <G fill={fill} stroke={stroke} strokeWidth={state === 'next' ? 6 : 5}>
          <Ellipse cx={25} cy={52} rx={10} ry={13} /><Ellipse cx={46} cy={29} rx={10} ry={13} />
          <Ellipse cx={74} cy={29} rx={10} ry={13} /><Ellipse cx={95} cy={52} rx={10} ry={13} />
          <Ellipse cx={60} cy={84} rx={31} ry={25} />
        </G>
      </Svg>
    </View>
  );
}

// The kibble bowl fills up as the month goes on (level 0 to 1).
export function Bowl({ level, width = 250 }: { level: number; width?: number }) {
  const l = Math.max(0, Math.min(1, level));
  const peak = 76 - 52 * l, mid = 76 - 30 * l;
  return (
    <Svg width={width} height={Math.round(width * 0.68)} viewBox="0 0 200 140">
      <Ellipse cx={100} cy={134} rx={70} ry={6} fill={C.pink} opacity={0.25} />
      {l > 0.02 && (
        <>
          <Path d={`M34 76 Q54 ${mid} 100 ${peak} Q146 ${mid} 166 76 Z`} fill="#B9692F" stroke={C.fg} strokeWidth={4} strokeLinejoin="round" />
          <G fill="#8A4A1E">
            <Circle cx={70} cy={72 - 14 * l} r={5} /><Circle cx={96} cy={70 - 24 * l} r={5} /><Circle cx={122} cy={72 - 14 * l} r={5} />
            <Circle cx={146} cy={73} r={4.5} /><Circle cx={84} cy={73} r={4.5} />
          </G>
        </>
      )}
      <Path d="M18 76 H182 Q182 132 100 132 Q18 132 18 76 Z" fill={C.surface} stroke={C.fg} strokeWidth={5} strokeLinejoin="round" />
      <G fill={C.pink}>
        <Ellipse cx={100} cy={116} rx={6} ry={5} /><Ellipse cx={88} cy={108} rx={2.6} ry={3.4} />
        <Ellipse cx={95} cy={103} rx={2.6} ry={3.4} /><Ellipse cx={105} cy={103} rx={2.6} ry={3.4} /><Ellipse cx={112} cy={108} rx={2.6} ry={3.4} />
      </G>
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
