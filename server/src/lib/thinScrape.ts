/**
 * Shared guard: a dead or thin fetch must not inherit another URL's spec sheet.
 * Retailer adapters stay thin — this runs on compare inputs and the normalized result.
 */

export type ScrapeInput = {
  url?: string;
  title?: string;
  retailerText?: string;
  priceText?: string | null;
};

const BLANK_VALUE = /^(n\/a|na|unknown|none|null|undefined|—|–|-)$/i;
const FAIL_MARKERS =
  /failed to (extract|scrape)|page not found|product not found|http\s*404|\b404 not found\b|access denied|just a moment|attention required|pardon our interruption|are you a human|SCRAPE_STATUS:\s*thin|PAGE UNAVAILABLE/i;

export function isBlankSpecValue(value: unknown): boolean {
  const s = String(value ?? "").trim();
  return !s || BLANK_VALUE.test(s);
}

export function titleFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname
      .split("/")
      .filter((p) => p && !/^\d+$/.test(p) && !/^(en-ca|fr-ca|product|dp|p)$/i.test(p));
    const slug = parts.reduce((a, b) => (a.length > b.length ? a : b), "");
    return decodeURIComponent(slug).replace(/[-_+]+/g, " ").trim();
  } catch {
    return "";
  }
}

function tokenSet(value: string): string[] {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export function nameScore(a: string, b: string): number {
  const A = new Set(tokenSet(a));
  const B = new Set(tokenSet(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n += 1;
  return n / Math.max(A.size, B.size);
}

function normLabel(label: string): string {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normValue(value: string): string {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function valueInText(value: string, text: string): boolean {
  const v = String(value || "").toLowerCase().replace(/\s+/g, "");
  if (v.length < 3) return false;
  return String(text || "").toLowerCase().replace(/\s+/g, "").includes(v);
}

/**
 * True when this URL did not yield a usable product sheet:
 * explicit failure/404, near-empty body, or no price + no model + no spec rows.
 */
export function isThinScrape(input: ScrapeInput): boolean {
  const text = String(input.retailerText || "");
  const title = String(input.title || "");
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 80) return true;
  if (FAIL_MARKERS.test(title) || FAIL_MARKERS.test(trimmed.slice(0, 1500))) return true;
  if (/^failed\b/i.test(trimmed)) return true;

  const priceField = String(input.priceText || "").trim();
  const hasPrice =
    (!!priceField && !isBlankSpecValue(priceField) && /\d/.test(priceField)) ||
    /(?:META PRICE FOUND|\bPrice)\s*[: ]\s*[$£€]?\s?\d/i.test(text) ||
    /\$\s?\d{2,}(?:[.,]\d{2})?/.test(text);
  const hasModel = /\b(?:model(?:\s*(?:number|no\.?|#))?|mpn|sku)\b\s*[:#]?\s*[A-Za-z0-9][A-Za-z0-9._-]{2,}/i.test(text);
  const specLines = text.split(/\n/).filter((line) => /^[A-Za-z][^:\n]{1,48}:\s+\S+/.test(line.trim())).length;
  if (!hasPrice && !hasModel && specLines < 2) return true;
  return false;
}

/** Replace a thin/failed page with a title-only stub so a later step cannot mine sibling specs out of it. */
export function retailerTextForCompare(input: ScrapeInput): string {
  const text = String(input.retailerText || "");
  if (typeof input.retailerText === "string" && !isThinScrape(input)) return text;
  if (typeof input.retailerText !== "string") return text;
  const title = String(input.title || "").trim() || titleFromUrl(String(input.url || "")) || "Unknown product";
  return [
    "SCRAPE_STATUS: thin",
    "PAGE UNAVAILABLE (no product data for this URL).",
    `Title: ${title}`,
    `URL: ${input.url || ""}`,
    "Specs: Unknown",
    "Do not copy specifications, price, or identity from any other product in this request.",
  ].join("\n");
}

type SpecPair = { label?: string; value?: string };
type ProductLike = {
  name?: string;
  url?: string;
  price?: string;
  rawSpecs?: SpecPair[];
  description?: string;
  aiSummary?: string;
  userInsights?: string;
  userPros?: string[];
  userCons?: string[];
  badges?: string[];
  whatsInTheBox?: string[];
  scrapeStatus?: string;
};

function ownLabel(input: ScrapeInput): string {
  return String(input.title || "").trim() || titleFromUrl(String(input.url || ""));
}

function pairsFor(product: ProductLike | undefined, result: any, index: number): SpecPair[] {
  const raw = Array.isArray(product?.rawSpecs) ? product!.rawSpecs! : [];
  const concrete = raw.filter((s) => s && !isBlankSpecValue(s.value));
  if (concrete.length >= 3) return raw;
  const fromGroups: SpecPair[] = [];
  const grouped = result?.groupedSpecs && typeof result.groupedSpecs === "object" ? result.groupedSpecs : {};
  for (const specs of Object.values(grouped) as Array<Array<{ label?: string; values?: string[] }>>) {
    if (!Array.isArray(specs)) continue;
    for (const spec of specs) {
      fromGroups.push({ label: spec?.label, value: spec?.values?.[index] });
    }
  }
  return fromGroups.length ? fromGroups : raw;
}

function clonedFromSibling(
  mine: SpecPair[],
  sibling: SpecPair[],
  ownText: string,
  siblingText: string
): boolean {
  const concrete = mine.filter((s) => s?.label && !isBlankSpecValue(s.value));
  if (concrete.length < 3) return false;
  const sibByLabel = new Map<string, string>();
  for (const spec of sibling) {
    if (!spec?.label || isBlankSpecValue(spec.value)) continue;
    sibByLabel.set(normLabel(spec.label), normValue(String(spec.value)));
  }
  let shared = 0;
  let borrowed = 0;
  for (const spec of concrete) {
    const sv = sibByLabel.get(normLabel(String(spec.label)));
    if (!sv || sv !== normValue(String(spec.value))) continue;
    shared += 1;
    const raw = String(spec.value);
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 2 && !valueInText(raw, ownText) && valueInText(raw, siblingText)) borrowed += 1;
  }
  return shared / concrete.length >= 0.75 && shared >= 3 && borrowed >= 2;
}

function blankConcreteAt(result: any, index: number): number {
  let stripped = 0;
  const product: ProductLike | undefined = result.products?.[index];
  if (product && Array.isArray(product.rawSpecs)) {
    product.rawSpecs = product.rawSpecs.map((spec) => {
      if (!spec || isBlankSpecValue(spec.value)) return spec;
      stripped += 1;
      return { ...spec, value: "Unknown" };
    });
  }
  if (result.groupedSpecs && typeof result.groupedSpecs === "object") {
    for (const specs of Object.values(result.groupedSpecs) as Array<Array<{ values?: string[]; winnerIndex?: number }>>) {
      if (!Array.isArray(specs)) continue;
      for (const spec of specs) {
        if (!Array.isArray(spec?.values) || index >= spec.values.length) continue;
        if (!isBlankSpecValue(spec.values[index])) {
          spec.values[index] = "Unknown";
          stripped += 1;
        }
        if (spec.winnerIndex === index) spec.winnerIndex = -1;
      }
    }
  }
  if (Array.isArray(result.keyDifferences)) {
    for (const diff of result.keyDifferences) {
      if (!Array.isArray(diff?.values) || index >= diff.values.length) continue;
      if (!isBlankSpecValue(diff.values[index])) {
        diff.values[index] = "Unknown";
        stripped += 1;
      }
    }
  }
  return stripped;
}

/**
 * After normalize/enrich: thin fetches keep their own title and Unknown specs.
 * A sheet that matches a sibling URL (Mini 4 Pro inheriting Air 3S) is wiped.
 * An already-Unknown thin sheet (Bose/GoPro style) is left as Unknowns.
 */
export function guardThinScrapes(result: any, inputs?: ScrapeInput[]): void {
  if (!result || !Array.isArray(result.products) || !Array.isArray(inputs) || inputs.length === 0) return;
  if (!inputs.some((input) => typeof input?.retailerText === "string")) return;

  while (result.products.length < inputs.length) {
    const i = result.products.length;
    result.products.push({
      name: ownLabel(inputs[i] || {}) || `Product ${i + 1}`,
      url: inputs[i]?.url || "",
      price: "N/A",
      rawSpecs: [],
      scrapeStatus: "thin",
    });
  }

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i] || {};
    const product: ProductLike = result.products[i] || {};
    result.products[i] = product;
    const ownText = typeof input.retailerText === "string" ? input.retailerText : "";
    const thin = typeof input.retailerText === "string" && isThinScrape(input);
    const label = ownLabel(input);
    const name = String(product.name || "");
    const ownScore = Math.max(nameScore(name, label), nameScore(name, titleFromUrl(String(input.url || ""))));

    let sibScore = 0;
    let cloned = false;
    for (let j = 0; j < inputs.length; j++) {
      if (j === i) continue;
      const sibling: ProductLike = result.products[j] || {};
      const sibLabel = `${sibling.name || ""} ${ownLabel(inputs[j] || {})}`;
      sibScore = Math.max(sibScore, nameScore(name, sibLabel));
      const titlesDiffer = nameScore(label, ownLabel(inputs[j] || {})) < 0.45;
      if (
        titlesDiffer &&
        clonedFromSibling(
          pairsFor(product, result, i),
          pairsFor(sibling, result, j),
          ownText,
          typeof inputs[j]?.retailerText === "string" ? inputs[j].retailerText! : ""
        )
      ) {
        cloned = true;
      }
    }

    const identityStolen = sibScore >= 0.5 && ownScore < 0.4 && ownScore + 0.12 < sibScore;
    if (!thin && !cloned && !identityStolen) continue;

    if (label && (identityStolen || cloned || (thin && ownScore < 0.4))) {
      product.name = label;
    }
    if (input.url && (identityStolen || cloned || !product.url)) product.url = input.url;

    const stripped = thin || cloned || identityStolen ? blankConcreteAt(result, i) : 0;
    if (thin) {
      const priceDigits = String(product.price || "").replace(/\D/g, "");
      const textDigits = ownText.replace(/\D/g, "");
      if (!priceDigits || priceDigits.length < 3 || !textDigits.includes(priceDigits)) product.price = "N/A";
    }
    product.scrapeStatus = thin ? "thin" : "sibling-rejected";
    if (stripped > 0 || identityStolen || cloned) {
      product.description = "";
      product.userInsights = "";
      product.userPros = [];
      product.userCons = [];
      product.badges = [];
      product.whatsInTheBox = [];
      const shown = product.name || label || "This product";
      product.aiSummary = `${shown} did not return its own spec sheet. Values are Unknown instead of being copied from another product.`;
    }
  }
}
