import { StyleSheet } from 'react-native';

// Same colours and fonts as the Walkies web app.
export const C = {
  bg: '#000000',
  surface: '#0d0c12',
  surface2: '#16141f',
  line: '#2a2736',
  fg: '#f4f2fa',
  muted: '#9a95ad',
  pink: '#ff2e9a',
  green: '#3bff8f',
  cyan: '#23e5ff',
  yellow: '#f4ff3a',
  gold: '#ffc21a',
  dark: '#050507',
  err: '#ff7a9c',
};

export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
};

const glow = (color: string, radius = 14, opacity = 0.45) => ({
  shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: 0 },
});
export { glow };

export const S = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  h1: { fontFamily: F.display, fontSize: 34, letterSpacing: -1, color: C.fg },
  h2: { fontFamily: F.display, fontSize: 20, color: C.fg },
  p: { fontFamily: F.body, fontSize: 16, lineHeight: 22, color: C.fg },
  muted: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
  bold: { fontFamily: F.bodyBold, color: C.fg },
  eyebrow: { fontFamily: F.bodyBold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: C.pink },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 },
  hero: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.pink, borderRadius: 28, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', gap: 6, ...glow(C.pink, 28, 0.35) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, backgroundColor: C.surface, color: C.fg, fontSize: 16, fontFamily: F.body },
  label: { fontFamily: F.bodyBold, fontSize: 15, color: C.fg },
  err: { fontFamily: F.bodyBold, fontSize: 14, color: C.err },
  linkbtn: { fontFamily: F.bodyBold, fontSize: 16, color: C.cyan, paddingVertical: 12 },
  tag: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.cyan },
});
