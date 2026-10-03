import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

export const paletteTokens = {
  spotify: "#1DB954",
  spotifyInk: "#0A0A0A",
  spotifyWashLight: "#E8F8EE",
  paper: "#F6F6F4",
  ink: "#0A0A0A",
  fog: "#EFEFEA",
  stone: "#8C8C86",
  lineLight: "#D5D5CF",
  bodyLight: "#484846",
  surfaceLight: "#FFFFFF",
  surfaceDark: "#161616",
  fogDark: "#1C1C1C",
  bodyDark: "#A8A8A4",
  tabBarLight: "#FFFFFF",
  tabBarDark: "#141414",
  scannerAmber: "#C9B896",
  modeWellLight: "#E4DFD4",
  modeWellDark: "#2C2C2C",
} as const;

export const palette = {
  light: {
    background: "#F2F2EF",
    surface: paletteTokens.surfaceLight,
    surfaceHighlight: "#E8E8E2",
    surfaceHover: "#E8E8E2",
    border: paletteTokens.lineLight,
    text: paletteTokens.ink,
    textSecondary: paletteTokens.bodyLight,
    textTertiary: "#6E6E68",
    primary: paletteTokens.ink,
    primaryMuted: paletteTokens.lineLight,
    success: paletteTokens.spotify,
    successMuted: paletteTokens.spotifyWashLight,
    error: "#EB5757",
    errorMuted: "rgba(235, 87, 87, 0.1)",
    ai: paletteTokens.spotify,
    aiMuted: "#E8E8E2",
    // Exact theme.ts match
    bg: "#F2F2EF",
    ink: paletteTokens.ink,
    body: paletteTokens.bodyLight,
    stone: "#6E6E68",
    fog: "#E8E8E2",
    line: paletteTokens.lineLight,
    spotify: paletteTokens.spotify,
    spotifyInk: paletteTokens.spotifyInk,
    spotifyWash: paletteTokens.spotifyWashLight,
    primaryBtn: paletteTokens.ink,
    primaryBtnFg: "#FFFFFF",
    // Same paper as the screen — hairline only, no grey slab.
    tabBar: "#F2F2EF",
    tabBarBorder: "rgba(10,10,10,0.08)",
    dock: "#FFFFFF",
    dockBorder: "rgba(10,10,10,0.06)",
    // Subtle Spotify wash (not a white/grey competing pill).
    tabPill: "rgba(29,185,84,0.14)",
    /** Quieter sibling of tabPill for idle Home mode pills. */
    tabPillQuiet: "rgba(29,185,84,0.07)",
    tabSelectedIcon: paletteTokens.ink,
    tabSelectedLabel: paletteTokens.ink,
    tabUnselected: "rgba(10,10,10,0.50)",
    segmentSelectedBg: paletteTokens.ink,
    segmentSelectedFg: "#FFFFFF",
    verdictBg: paletteTokens.ink,
    verdictFg: "#FFFFFF",
    overlay: "rgba(10,10,10,0.10)",
    scannerAmber: paletteTokens.scannerAmber,
    modeWell: paletteTokens.modeWellLight,
    /** Idle input / control chrome — stronger than `line` so fields read on paper bg */
    fieldBorder: "#B4B4AC",
    /** Placeholder text — readable but clearly softer than filled `ink` */
    placeholder: "#5A5A54",
  },
  dark: {
    background: paletteTokens.ink,
    surface: paletteTokens.surfaceDark,
    surfaceHighlight: paletteTokens.fogDark,
    surfaceHover: paletteTokens.fogDark,
    border: "rgba(255,255,255,0.08)",
    text: paletteTokens.paper,
    textSecondary: paletteTokens.bodyDark,
    textTertiary: paletteTokens.stone,
    primary: paletteTokens.spotify,
    primaryMuted: "rgba(255,255,255,0.08)",
    success: paletteTokens.spotify,
    successMuted: "rgba(29,185,84,0.12)",
    error: "#EB5757",
    errorMuted: "rgba(235,87,87, 0.1)",
    ai: paletteTokens.spotify,
    aiMuted: paletteTokens.fogDark,
    // Exact theme.ts match
    bg: paletteTokens.ink,
    ink: paletteTokens.paper,
    body: paletteTokens.bodyDark,
    stone: paletteTokens.stone,
    fog: paletteTokens.fogDark,
    line: "rgba(255,255,255,0.08)",
    spotify: paletteTokens.spotify,
    spotifyInk: paletteTokens.spotifyInk,
    spotifyWash: "rgba(29,185,84,0.12)",
    primaryBtn: paletteTokens.spotify,
    primaryBtnFg: paletteTokens.spotifyInk,
    // Same ink as the screen — no lifted grey band.
    tabBar: paletteTokens.ink,
    tabBarBorder: "rgba(255,255,255,0.08)",
    dock: "#1C1C1C",
    dockBorder: "rgba(255,255,255,0.10)",
    // Subtle Spotify wash (not a third grey).
    tabPill: "rgba(29,185,84,0.18)",
    /** Quieter sibling of tabPill for idle Home mode pills. */
    tabPillQuiet: "rgba(29,185,84,0.09)",
    tabSelectedIcon: "#FFFFFF",
    tabSelectedLabel: "#FFFFFF",
    tabUnselected: "rgba(255,255,255,0.55)",
    segmentSelectedBg: paletteTokens.spotify,
    segmentSelectedFg: paletteTokens.spotifyInk,
    verdictBg: paletteTokens.ink,
    verdictFg: "#FFFFFF",
    overlay: "rgba(255,255,255,0.06)",
    scannerAmber: paletteTokens.scannerAmber,
    modeWell: paletteTokens.modeWellDark,
    fieldBorder: "rgba(255,255,255,0.16)",
    placeholder: paletteTokens.stone,
  },
};

export function useThemeColors() {
  const preference = useThemeStore((s) => s.preference);
  const systemScheme = useColorScheme();
  
  const isDark = 
    preference === 'dark' || 
    (preference === 'system' && systemScheme === 'dark');

  return {
    isDark,
    colors: isDark ? palette.dark : palette.light,
  };
}

export function getRetailerColor(retailerName?: string, isDark?: boolean) {
  if (!retailerName) return isDark ? "#A8A8A4" : "#484846";
  const normalized = retailerName.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("bestbuy")) return isDark ? "#60A5FA" : "#0046BE";
  if (normalized.includes("walmart")) return isDark ? "#FDE047" : "#D97706";
  if (normalized.includes("canadacomputers") || normalized.includes("candacomp")) return isDark ? "#F87171" : "#DC2626";
  if (normalized.includes("staples")) return isDark ? "#FDA4AF" : "#9F1239";
  if (normalized.includes("costco")) return isDark ? "#F472B6" : "#DB2777";
  if (normalized.includes("amazon")) return isDark ? "#FDBA74" : "#EA580C";
  if (normalized.includes("leons")) return isDark ? "#FACC15" : "#EAB308";
  return isDark ? "#A8A8A4" : "#484846";
}

export const RETAILER_NAMES: Record<string, string> = {
  "bestbuy": "Best Buy",
  "amazon": "Amazon",
  "canadacomputers": "Canada Computers",
  "memoryexpress": "Memory Express",
  "newegg": "Newegg",
  "staples": "Staples",
  "thesource": "The Source",
  "costco": "Costco",
  "walmart": "Walmart",
  "leons": "Leon's",
};

export function formatRetailerName(retailerName?: string): string {
  if (!retailerName) return "Unknown Retailer";
  const normalized = retailerName.toLowerCase().replace(/[^a-z]/g, "");
  for (const [key, cleanName] of Object.entries(RETAILER_NAMES)) {
    if (normalized.includes(key)) {
      return cleanName;
    }
  }
  // Fallback to capitalizing whatever they gave us
  return retailerName.toUpperCase();
}
