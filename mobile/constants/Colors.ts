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
  lineLight: "#E8E8E4",
  bodyLight: "#5A5A58",
  surfaceLight: "#FFFFFF",
  surfaceDark: "#161616",
  fogDark: "#1C1C1C",
  bodyDark: "#A8A8A4",
  tabBarLight: "#FFFFFF",
  tabBarDark: "#141414",
  scannerAmber: "#C9B896",
  modeWellLight: "#EBE6DC",
  modeWellDark: "#2C2C2C",
} as const;

export const palette = {
  light: {
    background: paletteTokens.paper,
    surface: paletteTokens.surfaceLight,
    surfaceHighlight: paletteTokens.fog,
    surfaceHover: paletteTokens.fog,
    border: paletteTokens.lineLight,
    text: paletteTokens.ink,
    textSecondary: paletteTokens.bodyLight,
    textTertiary: paletteTokens.stone,
    primary: paletteTokens.ink,
    primaryMuted: paletteTokens.lineLight,
    success: paletteTokens.spotify,
    successMuted: paletteTokens.spotifyWashLight,
    error: "#EB5757",
    errorMuted: "rgba(235, 87, 87, 0.1)",
    ai: paletteTokens.spotify,
    aiMuted: paletteTokens.fog,
    // Exact theme.ts match
    bg: paletteTokens.paper,
    ink: paletteTokens.ink,
    body: paletteTokens.bodyLight,
    stone: paletteTokens.stone,
    fog: paletteTokens.fog,
    line: paletteTokens.lineLight,
    spotify: paletteTokens.spotify,
    spotifyInk: paletteTokens.spotifyInk,
    spotifyWash: paletteTokens.spotifyWashLight,
    primaryBtn: paletteTokens.ink,
    primaryBtnFg: "#FFFFFF",
    tabBar: "rgba(255,255,255,0.38)",
    tabBarBorder: "rgba(10,10,10,0.06)",
    tabPill: paletteTokens.ink,
    tabSelectedIcon: "#FFFFFF",
    tabSelectedLabel: "#FFFFFF",
    tabUnselected: paletteTokens.bodyLight,
    segmentSelectedBg: paletteTokens.ink,
    segmentSelectedFg: "#FFFFFF",
    verdictBg: paletteTokens.ink,
    verdictFg: "#FFFFFF",
    overlay: "rgba(10,10,10,0.08)",
    scannerAmber: paletteTokens.scannerAmber,
    modeWell: paletteTokens.modeWellLight,
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
    tabBar: "rgba(18,18,18,0.40)",
    tabBarBorder: "rgba(255,255,255,0.14)",
    tabPill: "rgba(255,255,255,0.10)",
    tabSelectedIcon: paletteTokens.spotify,
    tabSelectedLabel: "#FFFFFF",
    tabUnselected: paletteTokens.stone,
    segmentSelectedBg: paletteTokens.spotify,
    segmentSelectedFg: paletteTokens.spotifyInk,
    verdictBg: paletteTokens.ink,
    verdictFg: "#FFFFFF",
    overlay: "rgba(255,255,255,0.06)",
    scannerAmber: paletteTokens.scannerAmber,
    modeWell: paletteTokens.modeWellDark,
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

export function getRetailerColor(retailerName?: string, fallback?: string) {
  return fallback || paletteTokens.stone;
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
