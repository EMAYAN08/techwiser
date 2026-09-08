const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SUPPORTED = [
  "bestbuy.ca",
  "amazon.ca",
  "walmart.ca",
  "costco.ca",
  "canadacomputers.com",
  "memoryexpress.com",
  "newegg.ca",
  "staples.ca",
  "thesource.ca",
];

export type BarcodeOffer = {
  url: string;
  retailer: string;
  domain: string;
};

export type BarcodeLookupResult = {
  code: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  imageCandidates: string[];
  asin: string | null;
  urls: BarcodeOffer[];
};

const cache = new Map<string, { at: number; value: BarcodeLookupResult }>();
const TTL = 1000 * 60 * 60 * 12;

function digits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

function gtinVariants(code: string): string[] {
  const d = digits(code);
  const out = new Set<string>();
  if (!d) return [];
  out.add(d);
  if (d.length === 13 && d.startsWith("0")) out.add(d.slice(1));
  if (d.length === 12) out.add("0" + d);
  if (d.length === 14 && d.startsWith("0")) out.add(d.slice(1));
  if (d.length === 14) out.add(d.slice(-13));
  return [...out];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function retailerFromHost(host: string): string {
  if (host.includes("bestbuy")) return "Best Buy";
  if (host.includes("amazon")) return "Amazon";
  if (host.includes("walmart")) return "Walmart";
  if (host.includes("costco")) return "Costco";
  if (host.includes("canadacomputers")) return "Canada Computers";
  if (host.includes("memoryexpress")) return "Memory Express";
  if (host.includes("newegg")) return "Newegg";
  if (host.includes("staples")) return "Staples";
  if (host.includes("thesource")) return "The Source";
  return host;
}

function isSupported(host: string): boolean {
  return SUPPORTED.some((d) => host === d || host.endsWith("." + d));
}

function toAmazonCa(url: string): string {
  try {
    const u = new URL(url);
    if (/(^|\.)amazon\.(com|co\.uk|de|fr|it|es)$/i.test(u.hostname)) {
      const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (m) return `https://www.amazon.ca/dp/${m[1].toUpperCase()}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function offerFromUrl(url: string): BarcodeOffer | null {
  const cleaned = toAmazonCa(url.trim());
  if (!/^https?:\/\//i.test(cleaned)) return null;
  const host = hostOf(cleaned);
  if (!isSupported(host)) return null;
  if (/\/s\?/.test(cleaned) || /\/search/i.test(cleaned)) return null;
  return { url: cleaned, retailer: retailerFromHost(host), domain: host };
}

function mergeOffers(list: Array<BarcodeOffer | null | undefined>): BarcodeOffer[] {
  const seen = new Set<string>();
  const out: BarcodeOffer[] = [];
  for (const o of list.filter(Boolean) as BarcodeOffer[]) {
    if (seen.has(o.url)) continue;
    seen.add(o.url);
    out.push(o);
  }
  return out;
}

async function fetchJson(url: string, timeoutMs = 7000, headers: Record<string, string> = {}): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function lookupUpcItemDb(code: string): Promise<{
  title: string;
  brand: string | null;
  imageUrl: string | null;
  images: string[];
  asin: string | null;
  urls: BarcodeOffer[];
} | null> {
  for (const id of gtinVariants(code)) {
    const json = await fetchJson(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(id)}`);
    if (!json || json.code === "TOO_FAST") continue;
    const item = json?.items?.[0];
    if (!item) continue;
    const urls: BarcodeOffer[] = [];
    if (item.asin) {
      const amazon = offerFromUrl(`https://www.amazon.ca/dp/${String(item.asin).toUpperCase()}`);
      if (amazon) urls.push(amazon);
    }
    for (const offer of item.offers || []) {
      const link = offer?.link || offer?.url;
      if (typeof link === "string") {
        const o = offerFromUrl(link);
        if (o) urls.push(o);
      }
    }
    const images: string[] = Array.isArray(item.images) ? item.images.filter((x: unknown) => typeof x === "string") : [];
    return {
      title: item.title || "",
      brand: item.brand || null,
      imageUrl: images[0] || null,
      images,
      asin: item.asin || null,
      urls,
    };
  }
  return null;
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "pack",
  "pk",
  "can",
  "cans",
  "oz",
  "fl",
  "ml",
  "soda",
  "drink",
  "soft",
  "bottle",
  "bottles",
  "count",
  "ct",
  "size",
  "new",
  "from",
  "each",
  "item",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

function isModelToken(t: string): boolean {
  return /[a-z]/.test(t) && /\d/.test(t) && t.length >= 4;
}

export function similarName(query: string, candidate: string): boolean {
  const q = tokens(query);
  const cList = tokens(candidate);
  const c = new Set(cList);
  if (q.length === 0 || cList.length === 0) return false;

  const qModels = q.filter(isModelToken);
  const cModels = new Set(cList.filter(isModelToken));
  if (qModels.length > 0) {
    return qModels.some((t) => cModels.has(t));
  }

  const hits = q.filter((t) => c.has(t));
  const need = Math.min(2, q.length);
  if (hits.length < need) return false;
  return hits.length / q.length >= 0.5;
}

async function searchBestBuy(query: string, expectedTitle?: string): Promise<BarcodeOffer[]> {
  if (!query.trim()) return [];
  const json = await fetchJson(
    `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(query)}&lang=en-CA&page=1&pageSize=5`
  );
  const products = json?.products;
  if (!Array.isArray(products) || products.length === 0) return [];
  const out: BarcodeOffer[] = [];
  for (const p of products.slice(0, 5)) {
    const path = p.productUrl || p.url;
    const name = String(p.name || "");
    if (!path || typeof path !== "string") continue;
    if (expectedTitle) {
      if (!name || !similarName(expectedTitle, name)) continue;
    }
    const url = path.startsWith("http") ? path : `https://www.bestbuy.ca${path}`;
    const o = offerFromUrl(url);
    if (o) out.push(o);
  }
  return out;
}

async function lookupOpenFacts(code: string): Promise<{ title: string; brand: string | null; imageUrl: string | null } | null> {
  const ids = Array.from(new Set([code, code.length === 13 && code.startsWith("0") ? code.slice(1) : ""])).filter(
    Boolean
  );
  const hosts = [
    "https://world.openfoodfacts.org",
    "https://world.openproductsfacts.org",
    "https://world.openbeautyfacts.org",
  ];
  for (const host of hosts) {
    for (const id of ids) {
      const json = await fetchJson(`${host}/api/v0/product/${id}.json`, 4500);
      if (json?.status !== 1 || !json.product) continue;
      const p = json.product;
      const title = p.product_name || p.generic_name;
      if (!title) continue;
      return {
        title,
        brand: p.brands || null,
        imageUrl: p.image_front_url || p.image_url || null,
      };
    }
  }
  return null;
}

function cleanQuery(title: string): string {
  return title
    .replace(/\b(\d+\s?pk|\d+\s?pack|fridge pack|cans?|fl oz|ml|l)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function lookupBarcode(raw: string): Promise<BarcodeLookupResult> {
  const code = digits(raw);
  const cached = cache.get(code);
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  const [upc, facts] = await Promise.all([lookupUpcItemDb(code), lookupOpenFacts(code)]);
  const title = upc?.title || facts?.title || "";
  const brand = upc?.brand || facts?.brand || null;
  const imageUrl = upc?.imageUrl || facts?.imageUrl || null;
  const images = upc?.images || (imageUrl ? [imageUrl] : []);
  const asin = upc?.asin || null;

  // Amazon ASIN is a verified product page. Skip fuzzy retailer search when we already have it.
  let bb: BarcodeOffer[] = [];
  if (!asin && title) {
    bb = await searchBestBuy(code, title);
    if (bb.length === 0) bb = await searchBestBuy(cleanQuery(title), title);
  }

  const urls = mergeOffers([asin ? offerFromUrl(`https://www.amazon.ca/dp/${asin}`) : null, ...(upc?.urls || []), ...bb]);

  const value: BarcodeLookupResult = {
    code,
    title: title || `UPC ${code}`,
    brand,
    imageUrl,
    imageCandidates: images,
    asin,
    urls,
  };
  cache.set(code, { at: Date.now(), value });
  return value;
}
