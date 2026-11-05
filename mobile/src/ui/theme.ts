import { StyleSheet } from 'react-native';

// Light theme from the FurSteps logo: white background, coral accent, warm cream cards.
// Text colours pass WCAG AA (4.5:1) on white. Bright coral (C.coral) is for shapes only, never small text.
export const C = {
  bg: '#ffffff',
  surface: '#fff5ec',
  surface2: '#fbebdd',
  line: '#efe6de',
  fg: '#241b19',
  muted: '#6b6360',
  pink: '#c8432a', // deep coral: buttons, links, active tab, small accent text
  coral: '#e9593c', // logo coral: bowl, progress, large shapes
  green: '#2e7d4f',
  cyan: '#2f6f73', // deep teal: the other side in a tug of war
  yellow: '#a35f00',
  gold: '#a35f00',
  mango: '#ffc468',
  dark: '#ffffff', // text on filled accent buttons and badges
  err: '#b42318',
  pinkSoft: '#fff1eb',
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
  eyebrow: { fontFamily: F.bodyBold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: C.pink },
  card: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 },
  hero: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 28, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', gap: 6, ...glow(C.pink, 28, 0.35) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, backgroundColor: C.surface, color: C.fg, fontSize: 16, fontFamily: F.body },
  label: { fontFamily: F.bodyBold, fontSize: 15, color: C.fg },
  err: { fontFamily: F.bodyBold, fontSize: 14, color: C.err },
  linkbtn: { fontFamily: F.bodyBold, fontSize: 16, color: C.pink, paddingVertical: 12 },
  tag: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted },
});
