import type { Product } from "../store/useComparisonStore";
import { classifyProduct, getRetailerKey } from "./productKind";
import {
  MIN_COMPARE_URLS,
  uniqueSupportedProductUrls,
} from "./validators";

export type HomeInputMode = "url" | "qr";

export type CompareGate = {
  ready: boolean;
  urls: string[];
  reason?:
    | "loading"
    | "wrong-mode"
    | "need-two"
    | "duplicates-collapsed"
    | "unsupported";
};

/**
 * Whether Home should enable Compare and which URLs would be sent.
 * Mirrors Home: unique supported product pages, min 2, URL mode only, not while loading.
 */
export function canStartUrlCompare(input: {
  urls: string[];
  inputMode: HomeInputMode;
  isLoading?: boolean;
}): CompareGate {
  const filled = (input.urls || [])
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter(Boolean);
  const urls = uniqueSupportedProductUrls(filled);
  if (input.isLoading) return { ready: false, urls, reason: "loading" };
  if (input.inputMode !== "url") return { ready: false, urls, reason: "wrong-mode" };
  if (urls.length >= MIN_COMPARE_URLS) return { ready: true, urls };
  const supportedCount = filled.filter((u) => uniqueSupportedProductUrls([u]).length === 1).length;
  if (supportedCount >= MIN_COMPARE_URLS && urls.length < MIN_COMPARE_URLS) {
    return { ready: false, urls, reason: "duplicates-collapsed" };
  }
  if (filled.length > 0 && supportedCount === 0) {
    return { ready: false, urls, reason: "unsupported" };
  }
  return { ready: false, urls, reason: "need-two" };
}

/** Copy shown on the extraction-failed screen for transport failures. */
export function userFacingCompareError(message: string | undefined | null): string {
  const msg = (message || "").trim();
  if (!msg) return "Failed to extract specs.";
  if (msg.includes("Network request timed out") || msg.includes("Failed to fetch")) {
    return "The connection timed out. Please ensure your backend server is running and accessible on the same network.";
  }
  return msg;
}

export function recentComparisonTitle(productNames: string[]): string {
  const names = productNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return "Comparison";
  if (names.length === 1) return names[0];
  return `${names[0]} vs ${names[1]}`;
}

export function shouldShowPrice(price?: string | null): boolean {
  return Boolean(price && price.trim() && price.trim() !== "N/A");
}

export function uniqueProductsById(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) {
    if (!map.has(p.id)) map.set(p.id, p);
  }
  return Array.from(map.values());
}

export function filterSavedProducts(
  products: Product[],
  opts: { wellsOpen: boolean; filterBy: "retailer" | "type"; selectedId: string }
): Product[] {
  if (!opts.wellsOpen || opts.selectedId === "all") return products;
  if (opts.filterBy === "retailer") {
    return products.filter((p) => getRetailerKey(p.retailer) === opts.selectedId);
  }
  return products.filter((p) => classifyProduct(p) === opts.selectedId);
}

export function libraryEmptyCopy(allCount: number, isFiltered: boolean): { title: string; subtitle: string } {
  if (allCount === 0) {
    return {
      title: "No saved products",
      subtitle: "Products you compare will show up here.",
    };
  }
  if (isFiltered) {
    return {
      title: "Nothing in this filter",
      subtitle: "Try another well, or tap All to see everything you’ve saved.",
    };
  }
  return {
    title: "No saved products",
    subtitle: "Products you compare will show up here.",
  };
}

export function libraryCountLabel(filtered: number, all: number, isFiltered: boolean): string {
  if (isFiltered) return `${filtered} of ${all}`;
  return `${all} saved product${all === 1 ? "" : "s"}`;
}

const THEME_PREFS = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFS)[number];

export function normalizeThemePreference(value: unknown): ThemePreference {
  return THEME_PREFS.includes(value as ThemePreference) ? (value as ThemePreference) : "light";
}
