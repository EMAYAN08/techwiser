import { beforeEach, describe, expect, it, vi } from "vitest";

const { mem } = vi.hoisted(() => ({ mem: new Map<string, string>() }));

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

const KEY = "tw-recents";

/** Fresh module = fresh store, like a cold app launch. */
async function launch() {
  vi.resetModules();
  const mod = await import("../store/useComparisonStore");
  await mod.useComparisonStore.persist.rehydrate();
  return mod;
}

function product(id: string, extra: Record<string, unknown> = {}) {
  return { id, name: `Product ${id}`, brand: "B", retailer: "bestbuy", retailerColor: "#000", url: `https://x/${id}`, specs: [], ...extra };
}

function comparison(id: string, productIds: string[] = [`${id}a`, `${id}b`]) {
  return {
    id,
    title: `Title ${id}`,
    date: "now",
    urls: productIds.map((p) => `https://x/${p}`),
    result: {
      id,
      products: productIds.map((p) => product(p)),
      keyDifferences: [],
      aiSummary: "s",
      createdAt: "2026-10-07T00:00:00Z",
      alternatives: { huge: "x".repeat(1000) } as any,
      specExplanations: { cpu: { text: "y" } } as any,
    },
  };
}

function stored() {
  const raw = mem.get(KEY);
  return raw ? JSON.parse(raw) : null;
}

describe("recent comparisons + library persistence (tw-recents)", () => {
  beforeEach(() => mem.clear());

  it("starts truly empty on a fresh install and marks hydrated", async () => {
    const { useComparisonStore } = await launch();
    const s = useComparisonStore.getState();
    expect(s.recentComparisons).toEqual([]);
    expect(s.hasHydrated).toBe(true);
  });

  it("writes to AsyncStorage on add and rehydrates after relaunch", async () => {
    const first = await launch();
    first.useComparisonStore.getState().addRecentComparison(comparison("c1") as any);
    await vi.waitFor(() => expect(stored()?.state.recentComparisons).toHaveLength(1));
    expect(stored().version).toBe(1);

    const second = await launch();
    const recents = second.useComparisonStore.getState().recentComparisons;
    expect(recents.map((c) => c.id)).toEqual(["c1"]);
    expect(recents[0].result?.products.map((p) => p.id)).toEqual(["c1a", "c1b"]);
  });

  it("persists only recents (no urls, loading, active comparison, functions)", async () => {
    const { useComparisonStore } = await launch();
    useComparisonStore.getState().setUrls(["https://a", "https://b"]);
    useComparisonStore.getState().addRecentComparison(comparison("c1") as any);
    await vi.waitFor(() => expect(stored()).not.toBeNull());
    expect(Object.keys(stored().state)).toEqual(["recentComparisons"]);
  });

  it("strips alternatives and spec explanations before storing", async () => {
    const { useComparisonStore } = await launch();
    useComparisonStore.getState().addRecentComparison(comparison("c1") as any);
    await vi.waitFor(() => expect(stored()).not.toBeNull());
    const r = stored().state.recentComparisons[0].result;
    expect(r.alternatives).toBeUndefined();
    expect(r.specExplanations).toBeUndefined();
  });

  it("dedupes by id, newest first, and keeps ordering after relaunch", async () => {
    const first = await launch();
    const add = first.useComparisonStore.getState().addRecentComparison;
    add(comparison("a") as any);
    add(comparison("b") as any);
    add({ ...comparison("a"), title: "A again" } as any);
    const second = await launch();
    const recents = second.useComparisonStore.getState().recentComparisons;
    expect(recents.map((c) => c.id)).toEqual(["a", "b"]);
    expect(recents[0].title).toBe("A again");
  });

  it("caps at 10 in memory and in storage", async () => {
    const first = await launch();
    for (let i = 0; i < 14; i++) first.useComparisonStore.getState().addRecentComparison(comparison(`c${i}`) as any);
    expect(first.useComparisonStore.getState().recentComparisons).toHaveLength(10);
    await vi.waitFor(() => expect(stored().state.recentComparisons).toHaveLength(10));
    const second = await launch();
    expect(second.useComparisonStore.getState().recentComparisons[0].id).toBe("c13");
  });

  it("keeps all three products for a 3-product compare", async () => {
    const first = await launch();
    first.useComparisonStore.getState().addRecentComparison(comparison("t", ["x", "y", "z"]) as any);
    const second = await launch();
    expect(second.useComparisonStore.getState().recentComparisons[0].result?.products).toHaveLength(3);
  });

  it("clear history wipes memory and storage, and stays empty after relaunch", async () => {
    const first = await launch();
    first.useComparisonStore.getState().addRecentComparison(comparison("c1") as any);
    await vi.waitFor(() => expect(stored()).not.toBeNull());
    first.useComparisonStore.getState().clearRecentComparisons();
    expect(first.useComparisonStore.getState().recentComparisons).toEqual([]);
    await vi.waitFor(() => expect(stored()?.state?.recentComparisons ?? []).toEqual([]));
    const second = await launch();
    expect(second.useComparisonStore.getState().recentComparisons).toEqual([]);
  });

  it("library remove (removeProductFromHistory) persists and drops empty comparisons", async () => {
    const first = await launch();
    first.useComparisonStore.getState().addRecentComparison(comparison("c1", ["p1"]) as any);
    first.useComparisonStore.getState().addRecentComparison(comparison("c2", ["p1", "p2"]) as any);
    first.useComparisonStore.getState().removeProductFromHistory("p1");
    const second = await launch();
    const recents = second.useComparisonStore.getState().recentComparisons;
    expect(recents.map((c) => c.id)).toEqual(["c2"]);
    expect(recents[0].result?.products.map((p) => p.id)).toEqual(["p2"]);
  });

  it("removing the last library product leaves library and recents empty after relaunch", async () => {
    const first = await launch();
    first.useComparisonStore.getState().addRecentComparison(comparison("c1", ["p1"]) as any);
    first.useComparisonStore.getState().removeProductFromHistory("p1");
    const second = await launch();
    expect(second.useComparisonStore.getState().recentComparisons).toEqual([]);
  });

  it("corrupt JSON falls back to empty without throwing", async () => {
    mem.set(KEY, "{not json");
    const { useComparisonStore } = await launch();
    expect(useComparisonStore.getState().recentComparisons).toEqual([]);
    expect(useComparisonStore.getState().hasHydrated).toBe(true);
  });

  it("wrong shape falls back to empty", async () => {
    mem.set(KEY, JSON.stringify({ state: { recentComparisons: "nope" }, version: 1 }));
    const { useComparisonStore } = await launch();
    expect(useComparisonStore.getState().recentComparisons).toEqual([]);
  });

  it("drops malformed entries but keeps valid ones", async () => {
    const good = comparison("ok");
    mem.set(
      KEY,
      JSON.stringify({
        state: { recentComparisons: [null, { id: 5 }, { id: "x", title: "t", urls: [], result: { products: "bad" } }, good, good] },
        version: 1,
      })
    );
    const { useComparisonStore } = await launch();
    expect(useComparisonStore.getState().recentComparisons.map((c) => c.id)).toEqual(["ok"]);
  });

  it("old version (0) is migrated safely", async () => {
    mem.set(KEY, JSON.stringify({ state: { recentComparisons: [comparison("old")] }, version: 0 }));
    const { useComparisonStore } = await launch();
    expect(useComparisonStore.getState().recentComparisons.map((c) => c.id)).toEqual(["old"]);
    mem.set(KEY, JSON.stringify({ state: { something: 1 }, version: 0 }));
    const again = await launch();
    expect(again.useComparisonStore.getState().recentComparisons).toEqual([]);
  });

  it("stored size for 10 realistic mock compares stays reasonable", async () => {
    const mod = await launch();
    const mocks = mod.MOCK_RECENT_COMPARISONS;
    for (let i = 0; i < 10; i++) {
      const m = mocks[i % mocks.length];
      mod.useComparisonStore.getState().addRecentComparison({ ...m, id: `m${i}` });
    }
    await vi.waitFor(() => expect(stored().state.recentComparisons).toHaveLength(10));
    const bytes = mem.get(KEY)!.length;
    console.log(`tw-recents size for 10 compares: ${(bytes / 1024).toFixed(1)} KB`);
    expect(bytes).toBeLessThan(500_000);
  });
});
