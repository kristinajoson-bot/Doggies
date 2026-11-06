import { StyleSheet } from 'react-native';

// Walkies neon colours on a white background (Kristina, 2026-11-06).
export const C = {
  bg: '#ffffff',
  surface: '#f7f6fa',
  surface2: '#efedf4',
  line: '#e6e3ec',
  fg: '#14121a',
  muted: '#6b6679',
  pink: '#ff2e9a',
  coral: '#ff2e9a',
  green: '#3bff8f',
  cyan: '#23e5ff',
  yellow: '#f4ff3a',
  gold: '#ffc21a',
  mango: '#ffc468',
  dark: '#050507', // text on filled neon buttons and badges
  err: '#e11d48',
  pinkSoft: '#fff0f7',
};

// Text versions of the neon colours: same hue, dark enough to read on white (WCAG AA 4.5:1).
// Neon (C.*) is for shapes, fills, borders and the big Challenges heading; small words use T.*.
export const T = {
  pink: '#c8006a',
  green: '#0f7a3d',
  cyan: '#0a6a80',
  yellow: '#7a6400',
  gold: '#8f5f00',
  coral: '#c8006a',
};

export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
};

// On a light background neon glows look muddy, so every 'glow' is now one soft neutral shadow.
const glow = (_color?: string, _radius?: number, _opacity?: number) => ({
  shadowColor: '#1c1a24', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
});
export { glow };

export const S = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  h1: { fontFamily: F.display, fontSize: 34, letterSpacing: -1, color: C.fg },
  h2: { fontFamily: F.display, fontSize: 20, color: C.fg },
  p: { fontFamily: F.body, fontSize: 16, lineHeight: 22, color: C.fg },
  muted: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
  bold: { fontFamily: F.bodyBold, color: C.fg },
  eyebrow: { fontFamily: F.bodyBold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: T.pink },
  card: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 },
  hero: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 28, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', gap: 6, ...glow(C.pink, 28, 0.35) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, backgroundColor: C.surface, color: C.fg, fontSize: 16, fontFamily: F.body },
  label: { fontFamily: F.bodyBold, fontSize: 15, color: C.fg },
  err: { fontFamily: F.bodyBold, fontSize: 14, color: C.err },
  linkbtn: { fontFamily: F.bodyBold, fontSize: 16, color: T.cyan, paddingVertical: 12 },
  tag: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: T.cyan },
});
