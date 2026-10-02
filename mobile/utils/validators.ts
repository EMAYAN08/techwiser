/** Supported Canadian retailer domains (Canada-first). */
export const SUPPORTED_DOMAINS = [
  "bestbuy.ca",
  "amazon.ca",
  "canadacomputers.com",
  "memoryexpress.com",
  "newegg.ca",
  "staples.ca",
  "thesource.ca",
  "costco.ca",
  "walmart.ca",
] as const;

export type UrlValidationState = "idle" | "valid" | "invalid";

/** Max products in a single comparison (PRD F-001.1). */
export const MAX_COMPARE_URLS = 4;

/** Min products required to run a comparison. */
export const MIN_COMPARE_URLS = 2;

const LANG_SEGMENTS = new Set(["en", "en-ca", "fr", "fr-ca", "ca"]);

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

function isSupportedHost(host: string): boolean {
  return SUPPORTED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

/**
 * Best Buy Canada product path: /en-ca/product/.../<sku>
 * Also accepts ?sku= / ?skuId=
 */
export function extractBestBuyCaSku(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.toLowerCase().includes("bestbuy.ca")) return null;
    const skuParam = parsed.searchParams.get("sku") || parsed.searchParams.get("skuId");
    if (skuParam && /^\d{5,}$/.test(skuParam)) return skuParam;
    const pathMatch = parsed.pathname.match(/\/(\d{5,})\/?$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}

/** True when the URL looks like a product detail page (not home/search/category). */
export function looksLikeProductPage(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = hostOf(parsed);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean);
    const meaningful = segments.filter((s) => !LANG_SEGMENTS.has(s.toLowerCase()));

    if (host.includes("bestbuy.ca")) {
      return Boolean(extractBestBuyCaSku(url)) && /\/product\//i.test(path);
    }
    if (host.includes("amazon.ca")) {
      return /\/(?:dp|gp\/product|d)\/[A-Z0-9]{10}(?:[/?]|$)/i.test(path + (parsed.search || ""));
    }
    if (host.includes("walmart.ca")) {
      return /\/(?:en\/)?ip\//i.test(path) || /\/product\//i.test(path);
    }
    if (host.includes("newegg.ca")) {
      return /\/p\//i.test(path) || /Product\//i.test(path) || meaningful.length >= 2;
    }
    if (host.includes("memoryexpress.com")) {
      return /\/Products\//i.test(path) || meaningful.length >= 2;
    }
    if (host.includes("canadacomputers.com")) {
      return meaningful.length >= 2;
    }
    if (host.includes("staples.ca") || host.includes("thesource.ca") || host.includes("costco.ca")) {
      return /product/i.test(path) || meaningful.length >= 2;
    }
    // Generic: reject bare roots / language-only paths
    return meaningful.length >= 2;
  } catch {
    return false;
  }
}

/**
 * Validate that a string is an http(s) product URL on a supported CA retailer.
 */
export function validateProductUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return "invalid";
    const host = hostOf(parsed);
    if (!isSupportedHost(host)) return "invalid";
    return looksLikeProductPage(url) ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

export function isSupportedProductUrl(url: string): boolean {
  return validateProductUrl(url) === "valid";
}

/** Canonical key for duplicate detection (host + path, no trailing slash / tracking). */
export function canonicalizeProductUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const host = hostOf(u);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Deduplicate while preserving order; invalid/blank entries dropped. */
export function uniqueSupportedProductUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== "string" || !isSupportedProductUrl(raw)) continue;
    const key = canonicalizeProductUrl(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
  }
  return out;
}
