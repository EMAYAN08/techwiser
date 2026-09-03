import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

export const palette = {
  dark: {
    background: "#0A0A0A",
    surface: "#141414",
    surfaceHighlight: "#1F1F1F",
    border: "#2A2A2A",
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.6)",
    textTertiary: "rgba(255,255,255,0.38)",
    primary: "#2383E2",
    primaryMuted: "rgba(35,131,226,0.12)",
    success: "#2EA043",
    successMuted: "rgba(46,160,67,0.08)",
    error: "#EB5757",
    errorMuted: "rgba(235, 87, 87, 0.1)",
    ai: "#A259FF",
    aiMuted: "rgba(162, 89, 255, 0.1)",
  },
  light: {
    background: "#FFFFFF",
    surface: "#F7F7F7",
    surfaceHighlight: "#EEEEEE",
    border: "#E5E5E5",
    text: "#111111",
    textSecondary: "rgba(17,17,17,0.6)",
    textTertiary: "rgba(17,17,17,0.38)",
    primary: "#0066CC",
    primaryMuted: "rgba(0,102,204,0.12)",
    success: "#2EA043",
    successMuted: "rgba(46,160,67,0.08)",
    error: "#D32F2F",
    errorMuted: "rgba(211, 47, 47, 0.1)",
    ai: "#8A2BE2",
    aiMuted: "rgba(138, 43, 226, 0.1)",
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

export const RETAILER_COLORS: Record<string, string> = {
  "bestbuy": "#003B64",
  "amazon": "#FF9900",
  "canadacomputers": "#E31837",
  "memoryexpress": "#005BAA",
  "newegg": "#E2241B",
  "staples": "#CC0000",
  "thesource": "#E4002B",
  "costco": "#005BAA",
  "walmart": "#0071CE",
};

export function getRetailerColor(retailerName?: string, fallback: string = "#555555") {
  if (!retailerName) return fallback;
  const normalized = retailerName.toLowerCase().replace(/[^a-z]/g, "");
  for (const [key, color] of Object.entries(RETAILER_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return fallback;
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

