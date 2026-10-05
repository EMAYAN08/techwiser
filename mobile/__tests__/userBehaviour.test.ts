import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractBarcodePayload, isValidGtin, MAX_BARCODE_PRODUCTS } from "../utils/barcode";
import { canonicalizeUrl, extractQrPayload, MAX_QR_PRODUCTS, parseProductUrl } from "../utils/qr";
import {
  canStartUrlCompare,
  filterSavedProducts,
  libraryCountLabel,
  libraryEmptyCopy,
  normalizeThemePreference,
  RECENT_EMPTY_COPY,
  recentComparisonTitle,
  shouldShowPrice,
  uniqueProductsById,
  userFacingCompareError,
} from "../utils/userFlows";
import {
  MAX_COMPARE_URLS,
  canonicalizeProductUrl,
  uniqueSupportedProductUrls,
  validateProductUrl,
} from "../utils/validators";
import { useComparisonStore, type Product } from "../store/useComparisonStore";
import { useSettingsStore } from "../store/useSettingsStore";

vi.mock("../constants/Colors", () => ({
  RETAILER_NAMES: {
    bestbuy: "Best Buy",
    amazon: "Amazon",
    canadacomputers: "Canada Computers",
    memoryexpress: "Memory Express",
    newegg: "Newegg",
    staples: "Staples",
    thesource: "The Source",
    costco: "Costco",
    leons: "Leon's",
    walmart: "Walmart",
  },
}));

const BB = "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154";
const BB2 = "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094";
const CC = "https://www.canadacomputers.com/en/product/sony-wh-1000xm5";
const COSTCO = "https://www.costco.ca/sony-wh-1000xm5.product.123.html";
const LEONS = "https://www.leons.ca/products/lg-27-fhd-stanbyme-2-tv-27lx6tygaacc";

function product(partial: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    brand: "",
    retailer: "bestbuy",
    retailerColor: "#003B64",
    url: BB,
    specs: [],
    ...partial,
  };
}

describe("Home URL compare gate", () => {
  it("enables compare for two or three distinct supported product URLs", () => {
    expect(canStartUrlCompare({ urls: [BB, BB2], inputMode: "url" }).ready).toBe(true);
    expect(canStartUrlCompare({ urls: [BB, CC, COSTCO], inputMode: "url" }).urls).toHaveLength(3);
    expect(canStartUrlCompare({ urls: [`  ${LEONS}  `, BB], inputMode: "url" }).ready).toBe(true);
  });

  it("stays off for empty, single, loading, and QR mode", () => {
    expect(canStartUrlCompare({ urls: ["", ""], inputMode: "url" }).reason).toBe("need-two");
    expect(canStartUrlCompare({ urls: [BB, ""], inputMode: "url" }).reason).toBe("need-two");
    expect(canStartUrlCompare({ urls: [BB, BB2], inputMode: "url", isLoading: true }).reason).toBe("loading");
    expect(canStartUrlCompare({ urls: [BB, BB2], inputMode: "qr" }).reason).toBe("wrong-mode");
  });

  it("rejects unsupported retailers, home pages, and non-http schemes", () => {
    expect(validateProductUrl("https://www.bestbuy.com/site/foo/123.p")).toBe("invalid");
    expect(validateProductUrl("https://www.amazon.com/dp/B0D1XD1ZV3")).toBe("invalid");
    expect(validateProductUrl("https://www.costco.ca/")).toBe("invalid");
    expect(validateProductUrl("javascript:alert(1)")).toBe("invalid");
    expect(validateProductUrl("file:///tmp/product.html")).toBe("invalid");
    expect(canStartUrlCompare({ urls: ["not a url", "https://example.com/a/b"], inputMode: "url" }).reason).toBe(
      "unsupported"
    );
  });

  it("collapses tracking duplicates so two copies of one product cannot compare", () => {
    const duped = `${BB}?utm_source=email&utm_medium=cpc`;
    const gate = canStartUrlCompare({ urls: [BB, duped], inputMode: "url" });
    expect(gate.ready).toBe(false);
    expect(gate.reason).toBe("duplicates-collapsed");
    expect(canonicalizeProductUrl(BB)).toBe(canonicalizeProductUrl(duped));
    expect(uniqueSupportedProductUrls([BB, BB2, `${BB}/`])).toHaveLength(2);
  });

  it("accepts the other launch retailers as product pages", () => {
    expect(validateProductUrl(CC)).toBe("valid");
    expect(validateProductUrl(COSTCO)).toBe("valid");
    expect(validateProductUrl(LEONS)).toBe("valid");
    expect(validateProductUrl("https://www.memoryexpress.com/Products/MX00123456")).toBe("valid");
    expect(validateProductUrl("https://www.newegg.ca/p/N82E16819113777")).toBe("valid");
    expect(validateProductUrl("https://www.staples.ca/products/hp-laptop-123")).toBe("valid");
    expect(validateProductUrl("https://www.thesource.ca/en-ca/products/sony-headphones")).toBe("valid");
  });
});

describe("paste and compare error copy", () => {
  it("maps offline and timeout failures to the network message", () => {
    const offline = userFacingCompareError("Failed to fetch");
    expect(offline).toMatch(/timed out/i);
    expect(userFacingCompareError("Network request timed out")).toBe(offline);
    expect(userFacingCompareError("")).toMatch(/extract specs/i);
    expect(userFacingCompareError("A maximum of 3 product URLs is allowed.")).toMatch(/maximum of 3/i);
  });
});

describe("price chip and recent title", () => {
  it("hides missing and N/A prices", () => {
    expect(shouldShowPrice("$348")).toBe(true);
    expect(shouldShowPrice("  $1,799.95  ")).toBe(true);
    expect(shouldShowPrice("N/A")).toBe(false);
    expect(shouldShowPrice("")).toBe(false);
    expect(shouldShowPrice(null)).toBe(false);
    expect(shouldShowPrice(undefined)).toBe(false);
  });

  it("builds a recent title from up to three product names", () => {
    expect(recentComparisonTitle(["Sony WH-1000XM5", "AirPods Max"])).toBe("Sony WH-1000XM5 vs AirPods Max");
    expect(recentComparisonTitle(["A", "B", "C"])).toBe("A vs B vs C");
    expect(recentComparisonTitle(["A", "B", "C", "D"])).toBe("A vs B vs C");
    expect(recentComparisonTitle(["Only one"])).toBe("Only one");
    expect(recentComparisonTitle(["", "  "])).toBe("Comparison");
  });
});

describe("Library filters and empty states", () => {
  const saved = [
    product({ id: "1", name: "Apple iPhone 16", retailer: "bestbuy" }),
    product({ id: "1", name: "Apple iPhone 16 duplicate", retailer: "bestbuy" }),
    product({ id: "2", name: "LG OLED C3 65 TV", retailer: "costco", url: COSTCO }),
    product({ id: "3", name: "Apple MacBook Pro 14", retailer: "canadacomputers", url: "https://www.canadacomputers.com/en/product/macbook-pro-14" }),
  ];

  it("dedupes saved products by id", () => {
    expect(uniqueProductsById(saved).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("filters by retailer and product type only while wells are open", () => {
    const unique = uniqueProductsById(saved);
    expect(filterSavedProducts(unique, { wellsOpen: false, filterBy: "retailer", selectedId: "costco" })).toHaveLength(3);
    expect(
      filterSavedProducts(unique, { wellsOpen: true, filterBy: "retailer", selectedId: "costco" }).map((p) => p.id)
    ).toEqual(["2"]);
    expect(
      filterSavedProducts(unique, { wellsOpen: true, filterBy: "type", selectedId: "laptop" }).map((p) => p.id)
    ).toEqual(["3"]);
    expect(filterSavedProducts(unique, { wellsOpen: true, filterBy: "type", selectedId: "all" })).toHaveLength(3);
  });

  it("picks empty-state copy and count labels", () => {
    expect(libraryEmptyCopy(0, false).title).toBe("No saved products");
    expect(libraryEmptyCopy(4, true).title).toBe("Nothing in this filter");
    expect(libraryCountLabel(1, 4, true)).toBe("1 of 4");
    expect(libraryCountLabel(1, 1, false)).toBe("1 saved product");
    expect(libraryCountLabel(2, 2, false)).toBe("2 saved products");
  });

  it("uses clear copy for the empty Home recent list", () => {
    expect(RECENT_EMPTY_COPY.title).toBe("No recent comparisons yet");
    expect(RECENT_EMPTY_COPY.subtitle).toMatch(/2–3 products/);
  });
});

describe("appearance preference normalization", () => {
  it("keeps system, light, and dark and falls back otherwise", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("neon")).toBe("light");
    expect(normalizeThemePreference(null)).toBe("light");
  });
});

describe("comparison slot store", () => {
  beforeEach(() => {
    useComparisonStore.setState({
      urls: ["", ""],
      isLoading: false,
      loadingMessage: "Analyzing products...",
      loadPhase: "loading",
      activeComparison: null,
      recentComparisons: [],
    });
    useSettingsStore.setState({ hapticsEnabled: true });
  });

  it("adds a third slot and refuses a fourth", () => {
    const { addUrl } = useComparisonStore.getState();
    addUrl();
    expect(useComparisonStore.getState().urls).toHaveLength(MAX_COMPARE_URLS);
    addUrl();
    expect(useComparisonStore.getState().urls).toHaveLength(MAX_COMPARE_URLS);
  });

  it("keeps two slots when the last extra product is removed", () => {
    useComparisonStore.getState().addUrl();
    useComparisonStore.getState().updateUrl(2, BB);
    useComparisonStore.getState().removeUrl(2);
    expect(useComparisonStore.getState().urls).toEqual(["", ""]);
  });

  it("caps history at 10, drops bulky extras, and clears from Settings", () => {
    for (let i = 0; i < 12; i++) {
      useComparisonStore.getState().addRecentComparison({
        id: `c${i}`,
        title: `Run ${i}`,
        date: "Just now",
        urls: [BB, BB2],
        result: {
          id: `c${i}`,
          products: [product({ id: `p${i}`, name: `Phone ${i}` })],
          keyDifferences: [],
          aiSummary: "",
          createdAt: "2026-10-03T00:00:00.000Z",
          alternatives: { alternatives: [] },
          specExplanations: { ram: { concept: "x", breakdowns: [] } },
        },
      });
    }
    const recent = useComparisonStore.getState().recentComparisons;
    expect(recent).toHaveLength(10);
    expect(recent[0].id).toBe("c11");
    expect(recent[0].result?.alternatives).toBeUndefined();
    expect(recent[0].result?.specExplanations).toBeUndefined();
    useComparisonStore.getState().clearRecentComparisons();
    expect(useComparisonStore.getState().recentComparisons).toEqual([]);
  });

  it("removes a saved product and drops comparisons left empty", () => {
    useComparisonStore.getState().addRecentComparison({
      id: "mix",
      title: "Mix",
      date: "Just now",
      urls: [],
      result: {
        id: "mix",
        products: [product({ id: "keep", name: "Keep" }), product({ id: "drop", name: "Drop" })],
        keyDifferences: [],
        aiSummary: "",
        createdAt: "2026-10-03T00:00:00.000Z",
      },
    });
    useComparisonStore.getState().removeProductFromHistory("drop");
    expect(useComparisonStore.getState().recentComparisons[0].result?.products.map((p) => p.id)).toEqual(["keep"]);
    useComparisonStore.getState().removeProductFromHistory("keep");
    expect(useComparisonStore.getState().recentComparisons).toEqual([]);
  });

  it("ignores alternatives for a different comparison id", () => {
    useComparisonStore.setState({
      activeComparison: {
        id: "live",
        products: [],
        keyDifferences: [],
        aiSummary: "",
        createdAt: "2026-10-03T00:00:00.000Z",
      },
    });
    useComparisonStore.getState().setComparisonAlternatives("other", { alternatives: [] });
    expect(useComparisonStore.getState().activeComparison?.alternatives).toBeUndefined();
    useComparisonStore.getState().setComparisonAlternatives("live", { alternatives: [] });
    expect(useComparisonStore.getState().activeComparison?.alternatives).toEqual({ alternatives: [] });
  });
});

describe("settings toggles", () => {
  it("defaults haptics on and remembers an off toggle in memory", () => {
    useSettingsStore.setState({ hapticsEnabled: true });
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
    useSettingsStore.getState().setHapticsEnabled(false);
    expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
  });
});

describe("QR scan behaviour", () => {
  it("pulls a product URL out of a retailer QR", () => {
    const extracted = extractQrPayload(`See this\n${BB}?utm_source=qr`);
    expect(extracted.kind).toBe("url");
    expect(extracted.urls[0]).toContain("bestbuy.ca");
    const parsed = parseProductUrl(extracted.urls[0]);
    expect(parsed.valid).toBe(true);
    expect(parsed.retailer).toBe("Best Buy");
    expect(canonicalizeUrl(extracted.urls[0])).not.toContain("utm_source");
  });

  it("rejects wifi, contact, javascript, and empty QRs", () => {
    expect(extractQrPayload("").kind).toBe("empty");
    expect(extractQrPayload("WIFI:T:WPA;S:Cafe;;").kind).toBe("wifi");
    expect(extractQrPayload("BEGIN:VCARD\nFN:Ada\nEND:VCARD").kind).toBe("vcard");
    expect(extractQrPayload("javascript:alert(1)").message).toMatch(/not a product/i);
    expect(parseProductUrl("https://www.bestbuy.com/site/x/1").valid).toBe(false);
  });

  it("caps QR and barcode batches at 3", () => {
    expect(MAX_QR_PRODUCTS).toBe(3);
    expect(MAX_BARCODE_PRODUCTS).toBe(3);
    expect(MAX_COMPARE_URLS).toBe(3);
  });
});

describe("barcode scan behaviour", () => {
  it("accepts a valid EAN-13 and a URL sticker", () => {
    expect(isValidGtin("036000291452")).toBe(true);
    const gtin = extractBarcodePayload("036000291452");
    expect(gtin.kind).toBe("gtin");
    const url = extractBarcodePayload(`box ${BB}`);
    expect(url.kind).toBe("url");
    if (url.kind === "url") expect(url.url).toContain("bestbuy.ca");
  });

  it("rejects empty, wifi, and bad check digits", () => {
    const empty = extractBarcodePayload("");
    expect(empty.kind === "invalid" && /empty/i.test(empty.message)).toBe(true);
    expect(extractBarcodePayload("WIFI:T:WPA;S:Cafe;;").kind).toBe("qr");
    const damaged = extractBarcodePayload("036000291453");
    expect(damaged.kind === "invalid" && /damaged/i.test(damaged.message)).toBe(true);
    const other = extractBarcodePayload("HELLO-CODE");
    expect(other.kind === "invalid" && /UPC or EAN/i.test(other.message)).toBe(true);
  });
});

describe("theme preference survives a cold start on web storage", () => {
  function memoryStorage(seed: Record<string, string> = {}) {
    const data = { ...seed };
    return {
      getItem: (key: string) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
      setItem: (key: string, value: string) => {
        data[key] = String(value);
      },
      removeItem: (key: string) => {
        delete data[key];
      },
      dump: () => data,
    };
  }

  async function boot(seed?: string) {
    vi.resetModules();
    const storage = memoryStorage(seed ? { "tw-theme": seed } : {});
    vi.stubGlobal("window", { localStorage: storage });
    const mod = await import("../store/useThemeStore");
    return { store: mod.useThemeStore, storage };
  }

  it("rehydrates dark, light, and system", async () => {
    for (const pref of ["dark", "light", "system"] as const) {
      const { store } = await boot(pref);
      expect(store.getState().preference).toBe(pref);
    }
  });

  it("rehydrates the persisted JSON envelope", async () => {
    vi.resetModules();
    const storage = memoryStorage({
      "tw-theme": JSON.stringify({ state: { preference: "dark" }, version: 0 }),
    });
    vi.stubGlobal("window", { localStorage: storage });
    const mod = await import("../store/useThemeStore");
    expect(mod.useThemeStore.getState().preference).toBe("dark");
  });

  it("ignores a corrupt stored value", async () => {
    const { store } = await boot("neon");
    expect(store.getState().preference).toBe("light");
  });

  it("writes the next choice before the next launch", async () => {
    const { store, storage } = await boot("light");
    store.getState().setPreference("dark");
    expect(store.getState().preference).toBe("dark");
    const raw = storage.dump()["tw-theme"];
    const saved = raw === "dark" ? raw : JSON.parse(raw).state.preference;
    expect(saved).toBe("dark");
    vi.unstubAllGlobals();
  });
});
