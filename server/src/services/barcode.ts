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

const NESTED_PARAMS = [
  "murl",
  "url",
  "u",
  "dest",
  "destination",
  "redirect",
  "redir",
  "to",
  "target",
  "link",
  "newurl",
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
    if (/(^|\.)amazon\.(com|co\.uk|de|fr|it|es|ca)$/i.test(u.hostname)) {
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
  if (/norob|\/alink\//i.test(cleaned)) return null;
  return { url: cleaned, retailer: retailerFromHost(host), domain: host };
}

function decodeMaybe(raw: string): string {
  let s = raw;
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s;
}

function candidateUrls(raw: string): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    const s = decodeMaybe(value.trim());
    if (/^https?:\/\//i.test(s)) out.push(s);
  };
  push(raw);
  try {
    const u = new URL(raw);
    for (const key of NESTED_PARAMS) push(u.searchParams.get(key));
  } catch {
    /* ignore */
  }
  const re = /https?:\/\/[^\s"'<>\\]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) push(m[0]);
  return [...new Set(out)];
}

function pickOffer(raw: string): BarcodeOffer | null {
  for (const url of candidateUrls(raw)) {
    const offer = offerFromUrl(url);
    if (offer) return offer;
  }
  return null;
}

async function hopLocation(url: string, timeoutMs = 4500): Promise<string[]> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const found: string[] = [];
    const loc = res.headers.get("location");
    if (loc) found.push(loc);
    if (res.url) found.push(res.url);
    return found;
  } catch {
    return [];
  }
}

async function resolveOfferUrl(url: string): Promise<BarcodeOffer | null> {
  if (!url) return null;
  const direct = pickOffer(url);
  if (direct) return direct;
  const hops = await hopLocation(url);
  for (const hop of hops) {
    const offer = pickOffer(hop);
    if (offer) return offer;
  }
  return null;
}

function offerRank(o: BarcodeOffer): number {
  if (o.domain.includes("amazon.ca") && /\/dp\//i.test(o.url)) return 0;
  if (o.domain.includes("bestbuy.ca") && /\/product\//i.test(o.url)) return 1;
  if (o.domain.includes("walmart.ca") && /\/ip\//i.test(o.url)) return 2;
  return 3;
}

function mergeOffers(list: Array<BarcodeOffer | null | undefined>): BarcodeOffer[] {
  const seen = new Set<string>();
  const out: BarcodeOffer[] = [];
  for (const o of list.filter(Boolean) as BarcodeOffer[]) {
    if (seen.has(o.url)) continue;
    seen.add(o.url);
    out.push(o);
  }
  return out.sort((a, b) => offerRank(a) - offerRank(b));
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
    const resolved = await Promise.all(
      (item.offers || []).map((offer: { link?: string; url?: string }) =>
        resolveOfferUrl(offer?.link || offer?.url || "")
      )
    );
    for (const o of resolved) if (o) urls.push(o);
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
  "free",
  "live",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function isModelToken(t: string): boolean {
  return /[a-z]/.test(t) && /\d/.test(t) && t.length >= 4;
}

export function similarName(query: string, candidate: string): boolean {
  const q = tokens(query);
  const cList = tokens(candidate);
  const c = new Set(cList);
  if (q.length === 0 || cList.length === 0) return false;

  const qYears = q.filter((t) => /^20\d{2}$/.test(t));
  const cYears = new Set(cList.filter((t) => /^20\d{2}$/.test(t)));
  if (qYears.length > 0 && !qYears.some((y) => cYears.has(y))) return false;

  const qModels = q.filter(isModelToken);
  const cModels = new Set(cList.filter(isModelToken));
  if (qModels.length > 0) {
    return qModels.some((t) => cModels.has(t));
  }

  const hits = q.filter((t) => c.has(t));
  const need = Math.min(2, q.length);
  if (hits.length < need) return false;
  return hits.length / q.length >= 0.45;
}

function searchQueryFromTitle(title: string): string {
  const t = title.replace(/[®™]/g, " ").replace(/\s+/g, " ").trim();
  const head = t.split(/\s*[-|–—,:]\s*/)[0].trim();
  return (head.split(/\s+/).length >= 3 ? head : t).slice(0, 80);
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

  const [upc, facts, micro] = await Promise.all([
    lookupUpcItemDb(code), 
    lookupOpenFacts(code),
    typeof lookupMicrolinkPages !== 'undefined' ? lookupMicrolinkPages(code) : Promise.resolve(null)
  ]);
  const title = upc?.title || micro?.title || facts?.title || "";
  const brand = upc?.brand || facts?.brand || null;
  const imageUrl = upc?.imageUrl || micro?.imageUrl || facts?.imageUrl || null;
  const images = upc?.images || (imageUrl ? [imageUrl] : []);
  const asin = upc?.asin || micro?.asin || null;

  let bb: BarcodeOffer[] = await searchBestBuy(code);
  
  if (bb.length === 0 && title && !/^UPC\s/i.test(title)) {
    bb = await searchBestBuy(searchQueryFromTitle(title), title);
    if (bb.length === 0) bb = await searchBestBuy(cleanQuery(title), title);
  }

  const urls = mergeOffers([
    asin ? offerFromUrl(`https://www.amazon.ca/dp/${asin}`) : null,
    ...(upc?.urls || []),
    ...bb,
  ]);

  const value: BarcodeLookupResult = {
    code,
    title: title || `UPC ${code}`,
    brand,
    imageUrl,
    imageCandidates: images,
    asin,
    urls,
  };
  if (urls.length > 0) cache.set(code, { at: Date.now(), value });
  return value;
}

async function lookupMicrolinkPages(code: string): Promise<any | null> {
  const pages = [`https://www.upcitemdb.com/upc/${code}`, `https://go-upc.com/search?q=${code}`];
  for (const page of pages) {
    try {
      const json = await fetchJson(`https://api.microlink.io/?url=${encodeURIComponent(page)}`, 5000);
      if (json?.status !== "success" || !json.data) continue;
      const title = json.data.title || "";
      const desc = typeof json.data.description === "string" ? json.data.description : "";
      let image = (typeof json.data.image === "string" ? json.data.image : json.data.image?.url) || null;
      if (image && /favicon|upcitemdb\.com\/favicon/i.test(image)) image = null;
      
      let asin = null;
      const m = (title + desc + (json.data.url||"")).match(/[A-Z0-9]{10}/);
      if (m) asin = m[0];

      if (!title && !image && !asin) continue;
      return {
        title: title.replace(/\s*\|\s*upcitemdb\.com/i, "").replace(/\s*-?\s*UPC\s+\d+.*$/i, ""),
        imageUrl: image,
        asin: asin
      };
    } catch { }
  }
  return null;
}
