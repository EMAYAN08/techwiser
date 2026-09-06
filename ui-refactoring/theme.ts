/**
 * Drop-in design tokens for the Compare UI refactor (Expo / React Native).
 * If the repo already has a theme file, MERGE these values into it — do not
 * create a second source of truth.
 */

export const palette = {
  lime: "#D4FF3A",
  limeInk: "#0A0A0A",
  limeWashLight: "#F3FFC4",
  paper: "#F6F6F4",
  ink: "#0A0A0A",
  fog: "#EFEFEA",
  stone: "#8C8C86",
  lineLight: "#E8E8E4",
  bodyLight: "#5A5A58",
  surfaceLight: "#FFFFFF",
  surfaceDark: "#161616",
  fogDark: "#1C1C1C",
  bodyDark: "#A8A8A4",
  tabBarLight: "#1A1A1A",
  tabBarDark: "#141414",
} as const;

export const colors = {
  light: {
    bg: palette.paper,
    surface: palette.surfaceLight,
    ink: palette.ink,
    body: palette.bodyLight,
    stone: palette.stone,
    fog: palette.fog,
    line: palette.lineLight,
    lime: palette.lime,
    limeInk: palette.limeInk,
    limeWash: palette.limeWashLight,
    primaryBtn: palette.ink,
    primaryBtnFg: "#FFFFFF",
    tabBar: palette.tabBarLight,
    tabSelectedIcon: palette.lime,
    tabSelectedLabel: "#FFFFFF",
    tabUnselected: palette.stone,
    segmentSelectedBg: palette.ink,
    segmentSelectedFg: "#FFFFFF",
    verdictBg: palette.ink,
    verdictFg: "#FFFFFF",
    overlay: "rgba(10,10,10,0.08)",
  },
  dark: {
    bg: palette.ink,
    surface: palette.surfaceDark,
    ink: palette.paper,
    body: palette.bodyDark,
    stone: palette.stone,
    fog: palette.fogDark,
    line: "rgba(255,255,255,0.08)",
    lime: palette.lime,
    limeInk: palette.limeInk,
    limeWash: "rgba(212,255,58,0.12)",
    primaryBtn: palette.lime,
    primaryBtnFg: palette.limeInk,
    tabBar: palette.tabBarDark,
    tabSelectedIcon: palette.lime,
    tabSelectedLabel: "#FFFFFF",
    tabUnselected: palette.stone,
    segmentSelectedBg: palette.lime,
    segmentSelectedFg: palette.limeInk,
    verdictBg: palette.ink,
    verdictFg: "#FFFFFF",
    overlay: "rgba(255,255,255,0.06)",
  },
} as const;

export type ThemeColors = (typeof colors)["light"];
export type ColorScheme = keyof typeof colors;

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  gutter: 20,
  section: 28,
} as const;

export const radii = {
  field: 16,
  card: 20,
  cardSm: 16,
  spec: 14,
  phone: 18,
  nav: 22,
  pill: 999,
} as const;

export const size = {
  field: 56,
  button: 56,
  segment: 52,
  chip: 34,
  tabBar: 64,
  navCircle: 44,
  hit: 44,
} as const;

/** Static fonts only — Expo does not fully support variable fonts. */
export const fonts = {
  displayMedium: "ClashDisplay-Medium",
  displaySemibold: "ClashDisplay-Semibold",
  displayBold: "ClashDisplay-Bold",
  uiRegular: "Satoshi-Regular",
  uiMedium: "Satoshi-Medium",
  uiBold: "Satoshi-Bold",
} as const;

export const type = {
  screenTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  productHero: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  productName: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  price: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ["tabular-nums"] as const,
  },
  priceHero: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ["tabular-nums"] as const,
  },
  subtitle: {
    fontFamily: fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  eyebrow: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  button: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  specLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  specValue: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  chip: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    lineHeight: 16,
  },
} as const;
