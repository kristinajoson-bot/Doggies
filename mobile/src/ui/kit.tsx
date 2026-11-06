import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { Paw } from './art';
import { C, F, glow } from './theme';

export function TopBar() {
  return (
    <View style={k.top}>
      <Paw size={34} outline />
      <Text style={k.brand}>FurSteps</Text>
      <Svg width={26} height={26} viewBox="0 0 26 26" style={{ marginLeft: -6, marginTop: -18 }}>
        <Path d="M5 13 L8 4 M11 15 L18 8 M13 21 L22 18" stroke={C.pink} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

type BtnKind = 'default' | 'coral' | 'light';

export function Btn({ label, onPress, kind = 'default', small, busy, style }: { label: string; onPress: () => void; kind?: BtnKind; small?: boolean; busy?: boolean; style?: StyleProp<ViewStyle> }) {
  const box = [k.btn, small && k.btnSmall, kind === 'coral' && k.btnCoral, kind === 'light' && k.btnLight, busy && { opacity: 0.5 }, style];
  return (
    <Pressable style={({ pressed }) => [box, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onPress} disabled={busy} accessibilityRole="button">
      <Text style={[k.btnText, small && { fontSize: 14 }, kind === 'coral' && { fontFamily: F.display, color: C.dark }, kind === 'light' && { color: C.fg }]}>{busy ? 'One moment…' : label}</Text>
    </Pressable>
  );
}

export function Bar({ pct }: { pct: number }) {
  return (
    <View style={k.bar}>
      <LinearGradient colors={['#a8507a', '#a77bd8', '#7cc3bd']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[k.barFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} />
    </View>
  );
}

export function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[k.pill, on && k.pillOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[k.pillText, on && { color: '#ffffff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 }, style]}>{children}</View>;
}

// A pink-on-black glow behind the welcome and celebration screens.
export function Glow({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={['rgba(167,123,216,0.16)', 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420 }} />
      <LinearGradient colors={['transparent', 'rgba(227,169,192,0.18)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 380 }} />
      {children}
    </View>
  );
}

export const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString('en-AU');

const k = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 12 },
  brand: { fontFamily: F.display, fontSize: 30, letterSpacing: -0.6, color: C.fg },
  btn: { minHeight: 52, borderRadius: 16, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnSmall: { minHeight: 44, borderRadius: 14, alignSelf: 'flex-start' },
  btnCoral: { backgroundColor: C.pink, ...glow(C.pink, 22, 0.45) },
  btnLight: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  btnText: { fontFamily: F.bodyBold, fontSize: 16, color: '#ffffff' },
  bar: { width: '100%', height: 14, backgroundColor: C.surface2, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  pill: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: C.line, justifyContent: 'center' },
  pillOn: { backgroundColor: C.pink, borderColor: C.pink },
  pillText: { fontFamily: F.bodyBold, fontSize: 14, color: C.muted },
});
