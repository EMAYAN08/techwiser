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

/**
 * Validate that a string is an http(s) product URL on a supported CA retailer.
 */
export function validateProductUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return "invalid";
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    return SUPPORTED_DOMAINS.some((d) => host === d || host.endsWith("." + d))
      ? "valid"
      : "invalid";
  } catch {
    return "invalid";
  }
}

export function isSupportedProductUrl(url: string): boolean {
  return validateProductUrl(url) === "valid";
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
