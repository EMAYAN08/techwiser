import { beforeEach, describe, expect, it, vi } from "vitest";

const { mem } = vi.hoisted(() => ({
  mem: new Map<string, string>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => (mem.has(key) ? mem.get(key)! : null),
    setItem: async (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: async (key: string) => {
      mem.delete(key);
    },
  },
}));

async function bootStore() {
  vi.resetModules();
  const mod = await import("../store/useSettingsStore");
  await mod.useSettingsStore.persist.rehydrate();
  return mod;
}

describe("useSettingsStore persistence", () => {
  beforeEach(() => {
    mem.clear();
  });

  it("defaults haptics on when nothing is stored", async () => {
    const { useSettingsStore } = await bootStore();
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
  });

  it("writes off to AsyncStorage and restores it on a fresh store", async () => {
    const first = await bootStore();
    first.useSettingsStore.getState().setHapticsEnabled(false);
    await vi.waitFor(() => {
      expect(mem.get("tw-haptics")).toContain('"hapticsEnabled":false');
    });

    const second = await bootStore();
    expect(second.useSettingsStore.getState().hapticsEnabled).toBe(false);
  });

  it("restores an explicit on after it was saved", async () => {
    mem.set("tw-haptics", JSON.stringify({ state: { hapticsEnabled: true }, version: 0 }));
    const { useSettingsStore } = await bootStore();
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
  });

  it("ignores corrupt storage and keeps haptics on", async () => {
    mem.set("tw-haptics", "{not json");
    const { useSettingsStore } = await bootStore();
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
  });

  it("ignores a non-boolean saved value", async () => {
    mem.set(
      "tw-haptics",
      JSON.stringify({ state: { hapticsEnabled: "off" }, version: 0 })
    );
    const { useSettingsStore } = await bootStore();
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
  });
});
