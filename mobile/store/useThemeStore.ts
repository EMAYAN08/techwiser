import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  preference: "dark",
  setPreference: (preference) => set({ preference }),
}));
