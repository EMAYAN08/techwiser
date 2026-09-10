import type { ScrapeResult } from "../../types/scrape";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decode(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
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

function firstImage(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string" && value.startsWith("http")) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImage(item);
      if (found) return found;
    }
  }
  if (typeof value === "object" && value && "url" in value) {
    return firstImage((value as { url?: unknown }).url);
  }
  return null;
}

function offerPrice(offers: unknown): string | null {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const price = (offer as { price?: unknown }).price;
    if (price == null || price === "") continue;
    const currency = String((offer as { priceCurrency?: string }).priceCurrency || "").toUpperCase();
    const amount = String(price).replace(/[^0-9.]/g, "");
    if (!amount) continue;
    return currency === "CAD" || currency === "USD" || !currency ? `$${amount}` : `${amount} ${currency}`;
  }
  return null;
}

function parseJsonLdProducts(html: string): any[] {
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
      // ignore broken JSON-LD
    }
  }
  return products;
}

function visibleText(html: string, max = 35_000): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, max);
}

function upgradeImage(url: string | null): string | null {
  if (!url) return null;
  return url
    .replace(/&/g, "&")
    .replace(/([?&]width=)\d+/i, "$11200")
    .replace(/([?&]w=)\d+/i, "$11200");
}

export async function scrapeDirectHtml(url: string): Promise<ScrapeResult | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-CA,en;q=0.9",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) {
    console.log(`[Direct HTML] HTTP ${response.status} for ${url}`);
    return null;
  }

  const html = await response.text();
  if (!html || html.length < 800) return null;
  const lower = html.toLowerCase();
  if (
    lower.includes("just a moment") ||
    lower.includes("access denied") ||
    lower.includes("pardon our interruption") ||
    lower.includes("are you a human")
  ) {
    console.log(`[Direct HTML] Blocked or challenge page for ${url}`);
    return null;
  }

  const product = parseJsonLdProducts(html)[0] || {};
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title =
    product.name ||
    metaContent(html, "og:title") ||
    (titleMatch ? decode(titleMatch[1].replace(/\s+/g, " ")) : "") ||
    "";

  const priceText =
    offerPrice(product.offers) ||
    metaContent(html, "product:price:amount") ||
    metaContent(html, "og:price:amount");

  const imageUrl = upgradeImage(
    firstImage(product.image) || metaContent(html, "og:image") || metaContent(html, "twitter:image")
  );

  const description = product.description || metaContent(html, "og:description") || metaContent(html, "description") || "";
  const brand =
    typeof product.brand === "string" ? product.brand : product.brand?.name || "";

  const parts = [
    "RETAILER DATA (DIRECT HTML)",
    title ? `Name: ${title}` : "",
    brand ? `Brand: ${brand}` : "",
    product.sku ? `SKU: ${product.sku}` : "",
    priceText ? `Price: ${priceText}` : "",
    description ? `Description: ${decode(String(description))}` : "",
    "PAGE TEXT:",
    visibleText(html),
  ].filter(Boolean);

  const rawText = parts.join("\n");
  if (rawText.length < 200 || !title) return null;

  console.log(`[Direct HTML] OK ${url}: ${rawText.length} chars, image=${Boolean(imageUrl)}, price=${priceText || "none"}`);
  return { rawText, title, imageUrl, priceText: priceText || null };
}
