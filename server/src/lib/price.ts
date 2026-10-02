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


export type PriceRole = "current" | "list" | "unknown";

/** Classify schema.org / merchant price types without retailer-specific branches. */
export function priceRoleFromType(priceType: unknown): PriceRole {
  const s = String(priceType || "").toLowerCase();
  if (/strikethrough|list\s*price|listprice|msrp|regular\s*price|was\s*price|compare/.test(s)) return "list";
  if (/sale|invoice|current|minimumadvertised|special/.test(s)) return "current";
  return "unknown";
}

/**
 * When both a current/sale amount and a higher list/strikethrough exist, keep the current price.
 * A lone price (any role) is returned as-is so single-price pages are unchanged.
 */
export function pickCurrentPrice(candidates: Array<{ amount: unknown; role?: PriceRole }>): string | null {
  const parsed = candidates
    .map((c) => ({
      role: c.role || "unknown",
      display: formatDisplayPrice(c.amount),
      n: normalizeMoneyAmount(c.amount),
    }))
    .filter((c): c is { role: PriceRole; display: string; n: number } => Boolean(c.display) && c.n != null);

  if (!parsed.length) return null;

  const currents = parsed.filter((c) => c.role === "current").sort((a, b) => a.n - b.n);
  const lists = parsed.filter((c) => c.role === "list");
  const unknowns = parsed.filter((c) => c.role === "unknown").sort((a, b) => a.n - b.n);

  if (currents.length) return currents[0].display;

  if (unknowns.length && lists.length) {
    const sale = unknowns[0];
    const listHigh = Math.max(...lists.map((l) => l.n));
    if (sale.n < listHigh) return sale.display;
  }

  if (unknowns.length === 1) return unknowns[0].display;
  if (unknowns.length > 1 && lists.length === 0) {
    // Multiple unlabeled amounts: do not guess the minimum (could be a fee). Prefer the first.
    return unknowns[0].display;
  }
  if (lists.length) {
    lists.sort((a, b) => a.n - b.n);
    return lists[0].display;
  }
  return unknowns[0]?.display || null;
}

function pushOfferPrices(offer: Record<string, unknown>, out: Array<{ amount: unknown; role: PriceRole }>): void {
  if (offer.lowPrice != null) out.push({ amount: offer.lowPrice, role: "current" });
  if (offer.highPrice != null && offer.lowPrice != null) out.push({ amount: offer.highPrice, role: "list" });
  if (offer.price != null) out.push({ amount: offer.price, role: "current" });
  const specs = offer.priceSpecification;
  const list = Array.isArray(specs) ? specs : specs ? [specs] : [];
  for (const spec of list) {
    if (!spec || typeof spec !== "object") continue;
    const rec = spec as Record<string, unknown>;
    if (rec.price == null || rec.price === "") continue;
    const role = priceRoleFromType(rec.priceType);
    out.push({ amount: rec.price, role: role === "unknown" ? "list" : role });
  }
}

/** JSON-LD Offer / AggregateOffer → display price, preferring sale over strikethrough list. */
export function pricesFromOffers(offers: unknown): string | null {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const candidates: Array<{ amount: unknown; role: PriceRole }> = [];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    pushOfferPrices(offer as Record<string, unknown>, candidates);
  }
  return pickCurrentPrice(candidates);
}

/**
 * Visible price nodes: itemprop/current-price win over regular/was/strikethrough classes.
 */
export function extractRankedPriceFromHtml(html: string): string | null {
  if (!html) return null;
  const candidates: Array<{ amount: unknown; role: PriceRole }> = [];
  const currentPatterns = [
    /itemprop=["']price["'][^>]*>\s*\$?\s*([0-9][0-9,]*(?:\.\d{2})?)/gi,
    /class=["'][^"']*current-price-value[^"']*["'][^>]*>[\s\S]{0,220}?\$\s*([0-9][0-9,]*(?:\.\d{2})?)/gi,
    /class=["'][^"']*(?:sale-price|special-price|product-price-current)[^"']*["'][^>]*>[\s\S]{0,220}?\$\s*([0-9][0-9,]*(?:\.\d{2})?)/gi,
  ];
  const listPatterns = [
    /class=["'][^"']*(?:regular-price|was-price|compare-at-price|old-price|price--compare)[^"']*["'][^>]*>[\s\S]{0,220}?\$\s*([0-9][0-9,]*(?:\.\d{2})?)/gi,
  ];
  for (const pattern of currentPatterns) {
    for (const match of html.matchAll(pattern)) candidates.push({ amount: match[1], role: "current" });
  }
  for (const pattern of listPatterns) {
    for (const match of html.matchAll(pattern)) candidates.push({ amount: match[1], role: "list" });
  }
  return pickCurrentPrice(candidates);
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
