import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "tw-theme";

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "system" || v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "light";
}

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  preference: readStoredPreference(),
  setPreference: (preference) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
    set({ preference });
  },
}));
