/** True when a price string is absent or a known placeholder. */
export function isMissingPrice(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  return !s || /^(n\/a|na|unknown|none|null|undefined|—|–|-)$/i.test(s);
}

/**
 * Shopify and some commerce APIs store money in minor units (cents).
 * Whole-dollar CAD shelf prices rarely hit 5+ integer digits, so integer
 * amounts >= 10000 are treated as cents (159900 → $1599.00).
 */
export function looksLikeMinorCurrencyUnits(amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (!Number.isInteger(amount)) return false;
  return amount >= 10_000;
}

/** Parse a raw price into a major-unit number (dollars), or null. */
export function normalizeMoneyAmount(raw: unknown): number | null {
  if (isMissingPrice(raw)) return null;
  const s = String(raw).trim().replace(/,/g, "");
  const match = s.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hadDecimal = match[1].includes(".");
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!hadDecimal && looksLikeMinorCurrencyUnits(n)) return n / 100;
  return n;
}

export function formatDisplayPrice(raw: unknown): string | null {
  const n = normalizeMoneyAmount(raw);
  if (n == null) {
    if (isMissingPrice(raw)) return null;
    const s = String(raw).trim();
    return s.startsWith("$") ? s : `$${s}`;
  }
  const pretty = Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(2);
  return `$${pretty}`;
}

/**
 * Pull Shopify storefront prices (often integer cents) from HTML.
 * Works across Shopify-based CA retailers (e.g. Leon's).
 */
export function extractShopifyPriceFromHtml(html: string): string | null {
  if (!html || html.length < 40) return null;
  const looksShopify =
    /cdn\.shopify\.com/i.test(html) ||
    /Shopify\.theme/i.test(html) ||
    /gid:\/\/shopify\/Product\//i.test(html) ||
    (/Shopify/i.test(html) && /"price_min"\s*:/i.test(html));
  if (!looksShopify) return null;

  const candidates: number[] = [];
  const patterns = [
    /"price_min"\s*:\s*(\d+)/gi,
    /"price"\s*:\s*(\d{4,})/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) candidates.push(n);
    }
  }
  if (!candidates.length) return null;

  candidates.sort((a, b) => a - b);
  // Prefer the lower half (list price vs inflated compare-at) — take median of lower half.
  const lower = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
  const pick = lower[Math.floor((lower.length - 1) / 2)] ?? candidates[0];
  return formatDisplayPrice(pick);
}

export function extractPriceFromText(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /META PRICE FOUND:\s*(\$?[\d,.]+)/i,
    /"price_min"\s*:\s*(\d+)/i,
    /"price"\s*:\s*"?\$?([\d,.]+)"?/i,
    /\bPrice:\s*\$?\s*([\d,.]+)/i,
    /salePrice["\s:]*\$?\s*([\d,.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const formatted = formatDisplayPrice(match[1]);
      if (formatted) return formatted;
    }
  }
  return null;
}

/**
 * Prefer a scraped retailer price over an LLM price when both exist.
 * Prevents Costco/LLM drift and fills Shopify "—" gaps.
 */
export function resolveProductPrice(opts: {
  scrapedPrice?: string | null;
  llmPrice?: string | null;
  preferScraped?: boolean;
}): string {
  const scraped = formatDisplayPrice(opts.scrapedPrice);
  const llm = formatDisplayPrice(opts.llmPrice);
  const prefer = opts.preferScraped !== false;

  if (scraped && (prefer || isMissingPrice(opts.llmPrice))) return scraped;
  if (llm) return llm;
  if (scraped) return scraped;
  return "N/A";
}
