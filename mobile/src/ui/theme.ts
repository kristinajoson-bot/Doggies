import { StyleSheet } from 'react-native';

// Soft plum theme from Kristina's mock-up (2026-11-06): warm off-white, plum, purple and teal.
export const C = {
  bg: '#faf6f5',
  card: '#fffdfd',
  surface: '#f3eaf0',
  surface2: '#ece0e8',
  line: '#eadfe6',
  fg: '#2a1838',
  muted: '#6e5f78',
  pink: '#9c3d63', // plum: buttons, links, active tab, the next paw
  coral: '#e27f8c', // rose: bowls ring
  purple: '#a77bd8', // lavender: today ring
  green: '#6b5b9e', // unlocked paws (dusty purple)
  cyan: '#5aa3a8', // teal: round ring, the other side in a tug of war
  yellow: '#b07a2a',
  gold: '#2a1838',
  mango: '#f2c48d',
  dark: '#ffffff', // text on filled buttons and badges
  err: '#b42318',
  pinkSoft: '#f6e8ef',
};

// Text versions of the neon colours: same hue, dark enough to read on white (WCAG AA 4.5:1).
// Neon (C.*) is for shapes, fills, borders and the big Challenges heading; small words use T.*.
export const T = {
  pink: '#9c3d63',
  green: '#5a4a8c',
  cyan: '#2f7480',
  yellow: '#8a5a12',
  gold: '#2a1838',
  coral: '#9c3d63',
};

// Type: Fredoka (rounded, friendly) for titles and big numbers; Nunito (rounded, very readable) for text.
// Sizes: 56 hero number · 34 screen title · 22 card title / stat · 18 row title · 16 body · 14 secondary · 12 label (caps, +0.8 spacing).
export const F = {
  display: 'Fredoka_600SemiBold', // titles and big numbers
  body: 'Nunito_500Medium',
  bodyMedium: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  mono: 'Nunito_700Bold', // labels
  monoBold: 'Nunito_800ExtraBold',
};

// On a light background neon glows look muddy, so every 'glow' is now one soft neutral shadow.
const glow = (_color?: string, _radius?: number, _opacity?: number) => ({
  shadowColor: '#4a2a5a', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2,
});
export { glow };

export const S = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  h1: { fontFamily: F.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.2, color: C.fg },
  h2: { fontFamily: F.display, fontSize: 22, lineHeight: 28, color: C.fg },
  p: { fontFamily: F.body, fontSize: 16, lineHeight: 24, color: C.fg },
  muted: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
  bold: { fontFamily: F.bodyBold, color: C.fg },
  eyebrow: { fontFamily: F.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: T.pink },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 },
  hero: { backgroundColor: C.card, borderWidth: 0, borderRadius: 28, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', gap: 6, ...glow(C.pink, 28, 0.35) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, backgroundColor: C.surface, color: C.fg, fontSize: 16, fontFamily: F.body },
  label: { fontFamily: F.bodyBold, fontSize: 16, color: C.fg },
  err: { fontFamily: F.bodyBold, fontSize: 14, color: C.err },
  linkbtn: { fontFamily: F.bodyBold, fontSize: 16, color: T.pink, paddingVertical: 12 },
  tag: { fontFamily: F.mono, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted },
});
