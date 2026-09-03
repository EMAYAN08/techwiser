import { create } from "zustand";

interface SettingsStore {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  hapticsEnabled: true,
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
}));
