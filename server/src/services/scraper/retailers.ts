import { BROWSER_UA } from "../../config/constants";
import { formatDisplayPrice, normalizeMoneyAmount, pricesFromOffers } from "../../lib/price";
import type { ScrapeResult } from "../../types/scrape";

const SKIP_SPEC_LABELS = /^(name|brand|title|price|url|description|overview|page text|sku|image)$/i;

export function countSpecRows(text: string): number {
  if (!text) return 0;
  let n = 0;
  for (const line of text.split(/\n/)) {
    const match = line.trim().match(/^([^:]{2,70}):\s+\S/);
    if (!match) continue;
    if (SKIP_SPEC_LABELS.test(match[1].trim())) continue;
    n += 1;
  }
  return n;
}

export function isChallengeText(value: string): boolean {
  return /access denied|just a moment|pardon our interruption|are you a human|robot check|captcha|attention required/i.test(
    value || ""
  );
}

/** Fast path is rich enough to skip Jina / Python / a second HTML fetch. */
export function isRichScrape(result: Pick<ScrapeResult, "rawText" | "title" | "priceText">): boolean {
  const title = String(result.title || "").trim();
  const text = String(result.rawText || "");
  if (title.length < 3 || isChallengeText(title) || isChallengeText(text.slice(0, 500))) return false;
  const rows = countSpecRows(text);
  const hasPrice = !!result.priceText && /\d/.test(String(result.priceText));
  const hasModel = /\b(model|sku|asin|mpn)\b\s*[:#]?\s*[A-Za-z0-9]/i.test(text);
  return rows >= 4 && (hasPrice || hasModel);
}

export function isUsableScrape(result: Pick<ScrapeResult, "rawText" | "title" | "priceText">): boolean {
  const title = String(result.title || "").trim();
  const text = String(result.rawText || "");
  if (title.length < 3 || isChallengeText(title) || isChallengeText(text.slice(0, 400))) return false;
  if (text.length < 180) return false;
  return countSpecRows(text) >= 2 || (!!result.priceText && /\d/.test(String(result.priceText)) && text.length >= 400);
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decode(String(value || "").replace(/<[^>]+>/g, " "));
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function shopifyProductJsonUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("leons.ca")) return null;
    if (!/\/products\/[^/]+/i.test(parsed.pathname)) return null;
    const path = parsed.pathname.replace(/\/$/, "").replace(/\.json$/i, "");
    return `${parsed.origin}${path}.json`;
  } catch {
    return null;
  }
}

export function extractAmazonAsin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("amazon.")) return null;
    const match = parsed.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

type Tagged = { label: string; value: string };

type ShopifyVariant = {
  id?: unknown;
  title?: unknown;
  price?: unknown;
  compare_at_price?: unknown;
};

/** Leon's JSON lists one variant per store. The shelf price is the most common on-sale amount, not variants[0]. */
export function pickShopifyShelfPrice(variants: ShopifyVariant[], pageUrl?: string): string | null {
  let requested: string | null = null;
  if (pageUrl) {
    try {
      const id = new URL(pageUrl).searchParams.get("variant");
      if (id) {
        const hit = variants.find((v) => String(v.id || "") === id);
        const amount = hit ? normalizeMoneyAmount(hit.price) : null;
        if (amount != null && amount > 0 && amount < 20_000) requested = formatDisplayPrice(hit?.price);
      }
    } catch {
      /* ignore bad variant urls */
    }
  }
  if (requested) return requested;

  const sane = variants.filter((v) => {
    const amount = normalizeMoneyAmount(v.price);
    if (amount == null || amount <= 1 || amount >= 20_000) return false;
    if (/registry|arvr/i.test(String(v.title || ""))) return false;
    return true;
  });
  const onSale = sane.filter((v) => {
    const price = normalizeMoneyAmount(v.price);
    const compare = normalizeMoneyAmount(v.compare_at_price);
    return price != null && compare != null && compare > price + 0.009;
  });
  const pool = onSale.length ? onSale : sane;
  const counts = new Map<string, number>();
  for (const variant of pool) {
    const display = formatDisplayPrice(variant.price);
    if (!display) continue;
    counts.set(display, (counts.get(display) || 0) + 1);
  }
  let best: string | null = null;
  let bestCount = -1;
  for (const [display, count] of counts) {
    const amount = normalizeMoneyAmount(display) || 0;
    const bestAmount = best ? normalizeMoneyAmount(best) || 0 : Number.POSITIVE_INFINITY;
    if (count > bestCount || (count === bestCount && amount < bestAmount)) {
      best = display;
      bestCount = count;
    }
  }
  return best;
}

function decodeKeepLines(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&\w+;/g, " ");
}

function htmlToSpecText(html: string): string {
  return decodeKeepLines(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d|td|th|section|ul|ol)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n");
}

function proseDisplayFacts(text: string): Tagged[] {
  const out: Tagged[] = [];
  const hz = text.match(/\b(\d{2,3})\s*Hz\b/i);
  if (hz && Number(hz[1]) >= 48 && Number(hz[1]) <= 540) out.push({ label: "Refresh Rate", value: `${hz[1]} Hz` });
  const nits = text.match(/(\d[\d,]*)\s*-?\s*nits?\b/i);
  if (nits) out.push({ label: "Peak Brightness", value: `${nits[1].replace(/,/g, "")} nits` });
  const zones = text.match(/\b(\d{3,5})\s+(?:dimming\s+)?zones\b/i);
  if (zones) out.push({ label: "Local Dimming Zones", value: zones[1] });
  return out;
}

/** Pull Label: value rows out of a retailer spec block (Leon’s PDP is not a real table). */
export function parseLabeledSpecHtml(html: string, startMarker: RegExp, stopMarker?: RegExp): string[] {
  const start = html.search(startMarker);
  if (start < 0) return [];
  let chunk = html.slice(start, start + 40_000);
  if (stopMarker) {
    const stop = chunk.search(stopMarker);
    if (stop > 400) chunk = chunk.slice(0, stop);
  }
  const pairs: Tagged[] = [];
  for (const line of htmlToSpecText(chunk).split("\n")) {
    const match = line.trim().match(/^([^:]{2,80}):\s+(\S.*)$/);
    if (!match) continue;
    pairs.push({ label: match[1], value: match[2].slice(0, 240) });
  }
  return linesFromPairs(pairs);
}

/**
 * Canada Computers sometimes shifts picture rows by one cell.
 * Promote values that are obviously a resolution, refresh, or HDR list.
 */
export function promoteMislabeledDisplaySpecs(pairs: Tagged[]): Tagged[] {
  const extra: Tagged[] = [];
  const has = (label: RegExp) =>
    pairs.concat(extra).some((pair) => label.test(stripTags(pair.label)) && stripTags(pair.value).length > 0);
  for (const pair of pairs) {
    const value = stripTags(pair.value);
    if (!value) continue;
    const grid = value.match(/(\d{1,2}[,.]?\d{3})\s*[x×]\s*(\d{1,2}[,.]?\d{3})/i);
    if (grid && !has(/^(resolution|native resolution|display resolution|screen resolution)$/i)) {
      const px = (part: string) => part.replace(/[^\d]/g, "");
      extra.push({ label: "Resolution", value: `${px(grid[1])} x ${px(grid[2])}` });
    }
    const hz = value.match(/\b(\d{2,3})\s*Hz\b/i);
    if (hz && value.length <= 32 && Number(hz[1]) >= 48 && !has(/^refresh rate$/i)) {
      extra.push({ label: "Refresh Rate", value: `${hz[1]} Hz` });
    }
    if (/dolby vision|hdr10|\bhlg\b/i.test(value) && value.length <= 90 && !/gaming/i.test(value) && !has(/\bhdr\b/i)) {
      extra.push({ label: "HDR", value: value });
    }
  }
  return pairs.concat(extra);
}

function appendSpecLines(result: ScrapeResult, lines: string[]): ScrapeResult {
  if (!lines.length) return result;
  const have = new Set(
    result.rawText.split("\n").map((line) => line.split(":")[0].trim().toLowerCase())
  );
  const add = lines.filter((line) => !have.has(line.split(":")[0].trim().toLowerCase()));
  if (!add.length) return result;
  const rawText = result.rawText.includes("SPECS:")
    ? `${result.rawText}\n${add.join("\n")}`
    : `${result.rawText}\nSPECS:\n${add.join("\n")}`;
  return { ...result, rawText };
}


function linesFromPairs(pairs: Tagged[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const pair of pairs) {
    const label = stripTags(pair.label).replace(/[:\s]+$/g, "").trim();
    const value = stripTags(pair.value);
    if (!label || !value || label.length > 80 || value.length > 240) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${label}: ${value}`);
  }
  return out;
}

export function parseShopifyProductJson(data: unknown, pageUrl?: string): ScrapeResult | null {
  const product = (data as { product?: Record<string, unknown> })?.product;
  if (!product || typeof product !== "object") return null;
  const title = String(product.title || "").trim();
  if (!title) return null;
  const variants = Array.isArray(product.variants) ? (product.variants as ShopifyVariant[]) : [];
  const variant = (variants[0] || {}) as ShopifyVariant & { sku?: unknown; barcode?: unknown };
  const priceText = pickShopifyShelfPrice(variants, pageUrl);
  const images = Array.isArray(product.images) ? product.images : [];
  const imageUrl =
    (typeof product.image === "object" && product.image && "src" in product.image
      ? String((product.image as { src?: string }).src || "")
      : "") ||
    (images[0] && typeof images[0] === "object" ? String((images[0] as { src?: string }).src || "") : "") ||
    null;
  const tags = String(product.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tagPairs: Tagged[] = [];
  for (const tag of tags) {
    const idx = tag.indexOf(":");
    if (idx <= 0) continue;
    const label = tag.slice(0, idx).trim();
    const value = tag.slice(idx + 1).trim();
    if (/^(banner|clearance|collection|menu|item type|prod_cat|brand)$/i.test(label)) continue;
    if (/clearance-store/i.test(label)) continue;
    tagPairs.push({ label, value });
  }
  const description = stripTags(String(product.body_html || "")).slice(0, 1800);
  const prosePairs = proseDisplayFacts(description);
  const parts = [
    "RETAILER DATA (SHOPIFY JSON)",
    `Name: ${title}`,
    product.vendor ? `Brand: ${product.vendor}` : "",
    variant.sku ? `SKU: ${variant.sku}` : "",
    variant.barcode ? `Barcode: ${variant.barcode}` : "",
    priceText ? `Price: ${priceText}` : "",
    description ? `Description: ${description}` : "",
    tagPairs.length || prosePairs.length ? "SPECS:" : "",
    ...linesFromPairs([...tagPairs, ...prosePairs]),
  ].filter(Boolean);
  return {
    rawText: parts.join("\n"),
    title,
    imageUrl: imageUrl && imageUrl.startsWith("http") ? imageUrl : null,
    priceText,
    priceSource: priceText ? "shopify-json" : undefined,
  };
}

function tablePairs(html: string, scope?: RegExp): Tagged[] {
  const chunk = scope ? html.match(scope)?.[0] || html : html;
  const pairs: Tagged[] = [];
  const rows = chunk.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1]);
    if (cells.length < 2) continue;
    pairs.push({ label: cells[0], value: cells[1] });
  }
  return pairs;
}

function jsonLdProducts(html: string): any[] {
  const products: any[] = [];
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const items = Array.isArray(parsed) ? parsed : parsed?.["@graph"] ? parsed["@graph"] : [parsed];
      for (const item of items) {
        const type = item?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.includes("Product")) products.push(item);
      }
    } catch {
      /* ignore broken JSON-LD */
    }
  }
  return products;
}

function packResult(
  source: string,
  title: string,
  extras: string[],
  specLines: string[],
  imageUrl: string | null,
  priceText: string | null,
  priceSource: ScrapeResult["priceSource"]
): ScrapeResult {
  const parts = [`RETAILER DATA (${source})`, title ? `Name: ${title}` : "", ...extras, specLines.length ? "SPECS:" : "", ...specLines].filter(
    Boolean
  );
  return { rawText: parts.join("\n"), title, imageUrl, priceText, priceSource: priceText ? priceSource : undefined };
}

export function parseCanadaComputersHtml(html: string): ScrapeResult | null {
  if (!html || html.length < 500 || isChallengeText(html.slice(0, 1500))) return null;
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = (h1 ? stripTags(h1[1]) : "") || metaContent(html, "og:title") || "";
  if (!title) return null;
  const priceText =
    formatDisplayPrice(metaContent(html, "product:price:amount")) ||
    formatDisplayPrice(metaContent(html, "og:price:amount"));
  const specLines = linesFromPairs(
    promoteMislabeledDisplaySpecs(tablePairs(html, /class=["'][^"']*pi-specs-table[^"']*["'][\s\S]*?<\/table>/i))
  );
  const imageUrl = metaContent(html, "og:image");
  const brand = metaContent(html, "product:brand") || "";
  return packResult(
    "CANADA COMPUTERS HTML",
    title.replace(/\s*-\s*Canada Computers.*$/i, "").trim(),
    [brand ? `Brand: ${brand}` : "", priceText ? `Price: ${priceText}` : ""],
    specLines,
    imageUrl,
    priceText,
    "retailer-html"
  );
}

export function parseCostcoHtml(html: string): ScrapeResult | null {
  if (!html || html.length < 500 || isChallengeText(html.slice(0, 1500))) return null;
  const product = jsonLdProducts(html)[0] || {};
  const title = String(product.name || metaContent(html, "og:title") || "").trim();
  if (!title) return null;
  const priceText = pricesFromOffers(product.offers) || formatDisplayPrice(metaContent(html, "product:price:amount"));
  const image =
    (typeof product.image === "string" && product.image) ||
    (Array.isArray(product.image) && product.image[0]) ||
    metaContent(html, "og:image") ||
    null;
  const specLines = linesFromPairs(
    tablePairs(html, /id=["']ProductSpecifications[\s\S]*?<\/table>/i).concat(
      tablePairs(html, /ProductSpecifications[\s\S]{0,80000}/i)
    )
  );
  const brand = typeof product.brand === "string" ? product.brand : product.brand?.name || "";
  const description = stripTags(String(product.description || "")).slice(0, 800);
  return packResult(
    "COSTCO HTML",
    title,
    [
      brand ? `Brand: ${brand}` : "",
      product.sku ? `SKU: ${product.sku}` : "",
      product.mpn ? `Model: ${product.mpn}` : "",
      priceText ? `Price: ${priceText}` : "",
      description ? `Description: ${description}` : "",
    ],
    specLines,
    typeof image === "string" ? image : null,
    priceText,
    "json-ld"
  );
}

export function parseAmazonHtml(html: string, url: string): ScrapeResult | null {
  if (!html || html.length < 180) return null;
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleTag ? stripTags(titleTag[1]) : "";
  if (isChallengeText(titleText) || isChallengeText(html.slice(0, 800))) return null;
  const productTitle = html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
  const title = (productTitle ? stripTags(productTitle[1]) : "") || titleText;
  if (!title || /robot check|sorry!/i.test(title)) return null;
  const asin = extractAmazonAsin(url);
  const bullets = [...html.matchAll(/id=["']feature-bullets["'][\s\S]{0,6000}/gi)]
    .flatMap((block) => [...block[0].matchAll(/<span[^>]*>([^<]{12,220})<\/span>/gi)])
    .map((m) => stripTags(m[1]))
    .filter((t) => t && !/see more/i.test(t))
    .slice(0, 8);
  const detailRows = linesFromPairs([
    ...tablePairs(html, /id=["']productDetails_techSpec_section_1["'][\s\S]*?<\/table>/i),
    ...[...html.matchAll(/<span class=["']a-text-bold["']>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>/gi)].map(
      (m) => ({ label: m[1], value: m[2] })
    ),
  ]).slice(0, 24);
  const priceBlock =
    html.match(/id=["']corePriceDisplay_desktop_feature_div["'][\s\S]{0,1800}/i)?.[0] ||
    html.match(/id=["']corePrice_feature_div["'][\s\S]{0,1800}/i)?.[0] ||
    html.match(/class=["'][^"']*priceToPay[^"']*["'][\s\S]{0,600}/i)?.[0] ||
    "";
  const offscreen = priceBlock.match(/a-offscreen["']?\s*>\s*(\$[^<]{1,16})/i);
  const whole = priceBlock.match(/a-price-whole["']?>(\d[\d,]*)/);
  const frac = priceBlock.match(/a-price-fraction["']?>(\d{2})/);
  const priceText =
    formatDisplayPrice(offscreen?.[1]) ||
    (whole ? formatDisplayPrice(`${whole[1]}.${frac?.[1] || "00"}`) : null) ||
    formatDisplayPrice(metaContent(html, "product:price:amount"));
  const image =
    html.match(/id=["']landingImage["'][^>]+(?:data-old-hires|src)=["'](https:[^"']+)["']/i)?.[1] ||
    html.match(/"hiRes"\s*:\s*"(https:[^"]+)"/i)?.[1] ||
    metaContent(html, "og:image");
  const featureLines = bullets.map((b, i) => `Highlight ${i + 1}: ${b}`);
  return packResult(
    "AMAZON HTML",
    title,
    [asin ? `ASIN: ${asin}` : "", priceText ? `Price: ${priceText}` : ""],
    [...detailRows, ...featureLines],
    image,
    priceText,
    "retailer-html"
  );
}

async function fetchText(url: string, timeoutMs: number, accept: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: accept,
      "Accept-Language": "en-CA,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;
  const text = await response.text();
  return text || null;
}

export async function scrapeRetailerFastPath(url: string): Promise<ScrapeResult | null> {
  const host = hostOf(url);
  try {
    if (host.includes("leons.ca")) {
      const jsonUrl = shopifyProductJsonUrl(url);
      const [body, html] = await Promise.all([
        jsonUrl ? fetchText(jsonUrl, 8_000, "application/json") : Promise.resolve(null),
        fetchText(url, 12_000, "text/html,application/xhtml+xml"),
      ]);
      let parsed: ScrapeResult | null = null;
      if (body) {
        try {
          parsed = parseShopifyProductJson(JSON.parse(body), url);
        } catch {
          parsed = null;
        }
      }
      const htmlLines = html
        ? parseLabeledSpecHtml(html, /product-specs-pdp/i, />\s*Reviews\b/i)
        : [];
      if (!parsed && htmlLines.length && html) {
        const title = metaContent(html, "og:title") || "";
        parsed = packResult("LEONS HTML", title, [], htmlLines, metaContent(html, "og:image"), null, "retailer-html");
      } else if (parsed) {
        parsed = appendSpecLines(parsed, htmlLines);
      }
      if (parsed) console.log(`[Retailer] Leon's ${parsed.title.slice(0, 60)} price=${parsed.priceText || "none"} specs=${countSpecRows(parsed.rawText)}`);
      return parsed;
    }
    if (host.includes("canadacomputers.com") || host.includes("costco.ca") || host.includes("amazon.")) {
      const html = await fetchText(url, 12_000, "text/html,application/xhtml+xml");
      if (!html) return null;
      const parsed = host.includes("canadacomputers.com")
        ? parseCanadaComputersHtml(html)
        : host.includes("costco.ca")
          ? parseCostcoHtml(html)
          : parseAmazonHtml(html, url);
      if (parsed) {
        console.log(
          `[Retailer] ${host} ${parsed.rawText.length} chars price=${parsed.priceText || "none"} rich=${isRichScrape(parsed)}`
        );
      }
      return parsed;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[Retailer] fast path failed for ${url}: ${message}`);
  }
  return null;
}
