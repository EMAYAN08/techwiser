import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export const HAPTICS_STORAGE_KEY = "tw-haptics";

interface SettingsStore {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
}

/** Only a real boolean is a saved choice. Anything else keeps the default (on). */
export function readHapticsEnabled(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * AsyncStorage on web is window.localStorage and throws when `window` is missing
 * (unit tests). Swallow that so a failed write does not reject, and keep the
 * value for the rest of the process.
 */
const memory = new Map<string, string>();

const hapticsStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return memory.has(name) ? memory.get(name)! : null;
    }
  },
  setItem: async (name, value) => {
    memory.set(name, value);
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      /* native/web storage unavailable; in-memory copy already updated */
    }
  },
  removeItem: async (name) => {
    memory.delete(name);
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: HAPTICS_STORAGE_KEY,
      storage: createJSONStorage(() => hapticsStorage),
      partialize: (state) => ({ hapticsEnabled: state.hapticsEnabled }),
      merge: (persisted, current) => {
        const saved = persisted as { hapticsEnabled?: unknown } | undefined;
        return {
          ...current,
          hapticsEnabled: readHapticsEnabled(saved?.hapticsEnabled, current.hapticsEnabled),
        };
      },
    }
  )
);
