import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tw-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/** Sync read for web so the first paint matches a saved choice. Native has no sync storage. */
function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined" || !window.localStorage) return "light";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return "light";
    if (isThemePreference(raw)) return raw;
    const parsed = JSON.parse(raw) as { state?: { preference?: unknown } };
    if (isThemePreference(parsed?.state?.preference)) return parsed.state.preference;
  } catch {
    /* ignore */
  }
  return "light";
}

/**
 * Older builds stored a bare "light" | "dark" | "system" string in localStorage.
 * Zustand persist expects { state, version }. Accept both.
 */
const themeStorage: StateStorage = {
  getItem: async (name) => {
    const raw = await AsyncStorage.getItem(name);
    if (raw == null) return null;
    const trimmed = raw.trim();
    if (isThemePreference(trimmed)) {
      return JSON.stringify({ state: { preference: trimmed }, version: 0 });
    }
    return raw;
  },
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      preference: readStoredPreference(),
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => themeStorage),
      partialize: (state) => ({ preference: state.preference }),
    }
  )
);
