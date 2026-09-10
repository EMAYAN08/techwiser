const BB_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function extractBestBuySku(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("bestbuy.ca")) return null;
    const skuParam = parsed.searchParams.get("sku") || parsed.searchParams.get("skuId");
    if (skuParam && /^\d{5,}$/.test(skuParam)) return skuParam;
    const pathMatch = parsed.pathname.match(/\/(\d{5,})\/?$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(", ");
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSpecs(specs: unknown): string[] {
  if (!Array.isArray(specs)) return [];
  const rows: string[] = [];
  for (const spec of specs) {
    if (!spec || typeof spec !== "object") continue;
    const row = spec as { group?: string; name?: string; value?: unknown; specs?: unknown };
    if (Array.isArray(row.specs)) {
      const nested = formatSpecs(row.specs);
      rows.push(...nested.map((line) => (row.name ? `[${row.name}] ${line}` : line)));
      continue;
    }
    const name = asText(row.name);
    const value = asText(row.value);
    if (!name || !value) continue;
    const group = asText(row.group);
    rows.push(group ? `[${group}] ${name}: ${value}` : `${name}: ${value}`);
  }
  return rows;
}

export async function scrapeBestBuyApi(url: string): Promise<{
  rawText: string;
  title: string;
  imageUrl: string | null;
  priceText: string | null;
} | null> {
  const sku = extractBestBuySku(url);
  if (!sku) return null;

  const apiUrl = `https://www.bestbuy.ca/api/v2/json/product/${sku}`;
  console.log(`[BestBuy API] Fetching SKU ${sku}`);

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": BB_UA,
      "Accept-Language": "en-CA",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    console.log(`[BestBuy API] HTTP ${response.status} for SKU ${sku}`);
    return null;
  }

  const data: any = await response.json();
  const name = asText(data.name);
  if (!name) return null;

  const priceNum = data.salePrice ?? data.regularPrice;
  const priceText = priceNum != null && priceNum !== "" ? `$${priceNum}` : null;
  const imageUrl =
    asText(data.highResImage) ||
    asText(data.thumbnailImage) ||
    asText(data.additionalMedia?.[0]?.url) ||
    null;

  const specLines = formatSpecs(data.specs);
  const boxItems = Array.isArray(data.whatsInTheBox)
    ? data.whatsInTheBox.map(asText).filter(Boolean)
    : asText(data.whatsInTheBox)
      ? [asText(data.whatsInTheBox)]
      : [];

  const parts = [
    "BEST BUY API PRODUCT",
    `Name: ${name}`,
    data.brandName ? `Brand: ${asText(data.brandName)}` : "",
    priceText ? `Price: ${priceText}` : "",
    data.customerRating != null ? `Customer rating: ${data.customerRating} (${data.customerReviewCount || 0} reviews)` : "",
    data.shortDescription ? `Overview: ${stripHtml(String(data.shortDescription))}` : "",
    data.longDescription ? `Description: ${stripHtml(String(data.longDescription))}` : "",
    boxItems.length ? `What's in the box: ${boxItems.join(", ")}` : "",
    specLines.length ? `SPECS:\n${specLines.join("\n")}` : "",
  ].filter(Boolean);

  const rawText = parts.join("\n");
  if (rawText.length < 80) return null;

  console.log(`[BestBuy API] OK ${sku}: ${specLines.length} specs, image=${Boolean(imageUrl)}`);
  return { rawText, title: name, imageUrl, priceText };
}
