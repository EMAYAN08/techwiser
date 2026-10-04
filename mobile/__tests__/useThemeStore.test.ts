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
  const mod = await import("../store/useThemeStore");
  await mod.useThemeStore.persist.rehydrate();
  return mod;
}

describe("useThemeStore persistence", () => {
  beforeEach(() => {
    mem.clear();
  });

  it("defaults to light when nothing is stored", async () => {
    const { useThemeStore } = await bootStore();
    expect(useThemeStore.getState().preference).toBe("light");
  });

  it("writes dark to AsyncStorage and restores it on a fresh store", async () => {
    const first = await bootStore();
    first.useThemeStore.getState().setPreference("dark");
    await vi.waitFor(() => {
      expect(mem.get("tw-theme")).toContain('"preference":"dark"');
    });

    const second = await bootStore();
    expect(second.useThemeStore.getState().preference).toBe("dark");
  });

  it("migrates the legacy bare preference string", async () => {
    mem.set("tw-theme", "system");
    const { useThemeStore } = await bootStore();
    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("ignores corrupt storage and keeps the default", async () => {
    mem.set("tw-theme", "{not json");
    const { useThemeStore } = await bootStore();
    expect(useThemeStore.getState().preference).toBe("light");
  });
});
