import { Platform } from "react-native";
import {
  canonicalizeUrl,
  fetchUrlPreview,
  isSupportedHost,
  parseProductUrl,
  retailerFromHost,
  SUPPORTED_DOMAINS,
  type UrlPreview,
} from "./qr";
import { compactGtin, formatGtin, normalizeGtin } from "./barcode";

export type BarcodeOffer = {
  url: string;
  retailer: string;
  domain: string;
};

export type BarcodeLookup = {
  code: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  imageCandidates: string[];
  urls: BarcodeOffer[];
  source: string;
  asin?: string | null;
};

const cache = new Map<string, BarcodeLookup>();

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

function apiBase() {
  return (process.env.EXPO_PUBLIC_API_URL || "https://techwiser.onrender.com").replace(/\/$/, "");
}

function gtinVariants(code: string): string[] {
  const d = (code || "").replace(/\D/g, "");
  const out = new Set<string>();
  if (!d) return [];
  out.add(d);
  if (d.length === 13 && d.startsWith("0")) out.add(d.slice(1));
  if (d.length === 12) out.add("0" + d);
  if (d.length === 14 && d.startsWith("0")) out.add(d.slice(1));
  if (d.length === 14) out.add(d.slice(-13));
  if (d.length === 13) out.add("0" + d);
  return [...out];
}

function serverEndpoints(): string[] {
  const urls: string[] = [];
  if (Platform.OS === "web") {
    urls.push("/api/barcode");
    if (typeof window !== "undefined" && window.location?.origin) {
      urls.push(`${window.location.origin.replace(/\/$/, "")}/api/barcode`);
    }
  }
  urls.push(`${apiBase()}/api/barcode`);
  return [...new Set(urls)];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
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

function harvestAsin(...parts: Array<string | null | undefined>): string | null {
  const blob = parts.filter(Boolean).join(" ");
  const m =
    blob.match(/\b(B0[A-Z0-9]{8})\b/i) ||
    blob.match(/\bASIN[:\s#]*([A-Z0-9]{10})\b/i);
  return m ? m[1].toUpperCase() : null;
}

function asOffer(url: string): BarcodeOffer | null {
  try {
    const cleaned = toAmazonCa(url.trim());
    const parsed = parseProductUrl(cleaned);
    if (!parsed.url) return null;
    const host = parsed.host || hostOf(parsed.url);
    if (!isSupportedHost(host)) return null;
    if (/\/s\?/.test(parsed.url) || /\/search/i.test(parsed.url)) return null;
    if (/norob|\/alink\//i.test(parsed.url)) return null;
    return {
      url: canonicalizeUrl(parsed.url),
      retailer: parsed.retailer || retailerFromHost(host),
      domain: host,
    };
  } catch {
    return null;
  }
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
    const offer = asOffer(url);
    if (offer) return offer;
  }
  return null;
}

async function hopHeaders(url: string, timeoutMs = 4500): Promise<string[]> {
  const found: string[] = [];
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual" as RequestRedirect,
      headers: { Accept: "*/*" },
      ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    const loc = res.headers.get("location") || res.headers.get("Location");
    if (loc) found.push(loc);
    if (res.url) found.push(res.url);
  } catch {
    /* CORS / RN / timeout */
  } finally {
    if (timer) clearTimeout(timer);
  }
  return found;
}

async function resolveOfferUrl(url: string): Promise<BarcodeOffer | null> {
  if (!url) return null;
  const direct = pickOffer(url);
  if (direct) return direct;
  const hops = await hopHeaders(url);
  for (const hop of hops) {
    const offer = pickOffer(hop);
    if (offer) return offer;
  }
  return null;
}

function amazonFromAsin(asin?: string | null): BarcodeOffer | null {
  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) return null;
  return asOffer(`https://www.amazon.ca/dp/${asin.toUpperCase()}`);
}

function offerRank(o: BarcodeOffer): number {
  if (o.domain.includes("amazon.ca") && /\/dp\//i.test(o.url)) return 0;
  if (o.domain.includes("bestbuy.ca") && /\/product\//i.test(o.url)) return 1;
  if (o.domain.includes("walmart.ca") && /\/ip\//i.test(o.url)) return 2;
  return 3;
}

function uniqueOffers(list: BarcodeOffer[]): BarcodeOffer[] {
  const seen = new Set<string>();
  const out: BarcodeOffer[] = [];
  for (const o of list) {
    if (!o || seen.has(o.url)) continue;
    seen.add(o.url);
    out.push(o);
  }
  return out.sort((a, b) => offerRank(a) - offerRank(b));
}

function titleFromMicrolink(raw: string | undefined, code: string): string {
  if (!raw) return "";
  let t = raw
    .replace(/\s*\|\s*upcitemdb\.com/i, "")
    .replace(/\s*—\s*UPC\s+\d+.*$/i, "")
    .replace(/\s*—\s*Go-UPC.*$/i, "")
    .replace(/^UPC\s+\d+\s*-\s*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
  if (!t || t.toLowerCase() === compactGtin(code) || /^\d+$/.test(t)) return "";
  return t;
}

async function fetchJson(url: string, timeoutMs = 5000): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function lookupFromPayload(code: string, data: any, source: string): Promise<BarcodeLookup | null> {
  if (!data || typeof data !== "object") return null;
  const asin = data.asin || harvestAsin(data.title, JSON.stringify(data.urls || []));
  const incoming = Array.isArray(data.urls) ? data.urls : [];
  const resolved = await Promise.all(
    incoming.map((u: any) => resolveOfferUrl(typeof u === "string" ? u : u?.url || ""))
  );
  const urls = uniqueOffers(
    [...resolved, amazonFromAsin(asin)].filter(Boolean) as BarcodeOffer[]
  );
  const title = data.title || "";
  if (!urls.length && !title) return null;
  return {
    code,
    title: title || `UPC ${formatGtin(code)}`,
    brand: data.brand || null,
    imageUrl: data.imageUrl || null,
    imageCandidates: Array.isArray(data.imageCandidates) ? data.imageCandidates : [],
    urls,
    source,
    asin: asin || null,
  };
}

async function postBarcode(url: string, code: string): Promise<any | null> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 5000) : null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code }),
      ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok) return null;
    if (!/json/i.test(ctype)) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fromServer(code: string): Promise<BarcodeLookup | null> {
  for (const endpoint of serverEndpoints()) {
    const json = await postBarcode(endpoint, code);
    const parsed = await lookupFromPayload(
      code,
      json?.data,
      endpoint.includes("onrender.com") ? "server" : "local"
    );
    if (parsed && (parsed.urls.length > 0 || parsed.title)) return parsed;
  }
  return null;
}

async function fromUpcItemDb(code: string): Promise<Partial<BarcodeLookup> | null> {
  for (const id of gtinVariants(code)) {
    const json = await fetchJson(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(id)}`,
      6000
    );
    if (!json || json.code === "TOO_FAST") continue;
    const item = json?.items?.[0];
    if (!item) continue;
    const images: string[] = Array.isArray(item.images)
      ? item.images.filter((x: unknown) => typeof x === "string")
      : [];
    const asin = item.asin || harvestAsin(item.title, item.description, JSON.stringify(item.offers || []));
    const resolved = await Promise.all(
      ((item.offers || []) as any[]).map((o) => resolveOfferUrl(o?.link || o?.url || ""))
    );
    const urls = uniqueOffers(
      [amazonFromAsin(asin), ...resolved].filter(Boolean) as BarcodeOffer[]
    );
    return {
      title: item.title || "",
      brand: item.brand || null,
      imageUrl: images[0] || null,
      imageCandidates: images,
      urls,
      asin: asin || null,
      source: "upcitemdb",
    };
  }
  return null;
}

const STOP = new Set([
  "the", "and", "for", "with", "pack", "pk", "can", "cans", "oz", "fl", "ml",
  "soda", "drink", "soft", "bottle", "bottles", "count", "ct", "size", "new", "from",
  "each", "item", "free", "live",
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

function similarName(query: string, candidate: string): boolean {
  const q = tokens(query);
  const cList = tokens(candidate);
  const c = new Set(cList);
  if (q.length === 0 || cList.length === 0) return false;

  const qYears = q.filter((t) => /^20\d{2}$/.test(t));
  const cYears = new Set(cList.filter((t) => /^20\d{2}$/.test(t)));
  if (qYears.length > 0 && !qYears.some((y) => cYears.has(y))) return false;

  const qModels = q.filter(isModelToken);
  const cModels = new Set(cList.filter(isModelToken));
  if (qModels.length > 0) return qModels.some((t) => cModels.has(t));

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

async function fromBestBuy(query: string, expectedTitle?: string): Promise<BarcodeOffer[]> {
  if (!query.trim()) return [];
  const json = await fetchJson(
    `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(query)}&lang=en-CA&page=1&pageSize=5`,
    6000
  );
  const products = json?.products;
  if (!Array.isArray(products) || products.length === 0) return [];
  const out: BarcodeOffer[] = [];
  for (const p of products.slice(0, 5)) {
    const path = p.productUrl || p.url;
    const name = String(p.name || "");
    if (!path || typeof path !== "string") continue;
    if (expectedTitle && (!name || !similarName(expectedTitle, name))) continue;
    const url = path.startsWith("http") ? path : `https://www.bestbuy.ca${path}`;
    const o = asOffer(url);
    if (o) out.push(o);
  }
  return out;
}

async function fromOpenFacts(code: string): Promise<Partial<BarcodeLookup> | null> {
  const hosts = [
    "https://world.openfoodfacts.org",
    "https://world.openproductsfacts.org",
    "https://world.openbeautyfacts.org",
  ];
  for (const host of hosts) {
    for (const id of gtinVariants(code)) {
      const json = await fetchJson(`${host}/api/v0/product/${id}.json`, 4500);
      if (!json || json.status !== 1 || !json.product) continue;
      const p = json.product;
      const title = p.product_name || p.generic_name || p.abbreviated_product_name;
      if (!title) continue;
      const image =
        p.image_front_url || p.image_url || p.image_small_url || p.selected_images?.front?.display?.en || null;
      return {
        title,
        brand: p.brands || p.brand || null,
        imageUrl: image,
        source: "openfacts",
      };
    }
  }
  return null;
}

async function fromMicrolinkPages(code: string): Promise<Partial<BarcodeLookup> | null> {
  const compact = compactGtin(code);
  const pages = [`https://www.upcitemdb.com/upc/${compact}`, `https://go-upc.com/search?q=${compact}`];
  for (const page of pages) {
    try {
      const json = await fetchJson(`https://api.microlink.io/?url=${encodeURIComponent(page)}`, 5000);
      if (json?.status !== "success" || !json.data) continue;
      const title = titleFromMicrolink(json.data.title, code);
      const desc = typeof json.data.description === "string" ? json.data.description : "";
      const image = (typeof json.data.image === "string" ? json.data.image : json.data.image?.url) || null;
      const asin = harvestAsin(title, desc, json.data.url);
      if (!title && !image && !asin) continue;
      return {
        title: title || `Product ${formatGtin(code)}`,
        brand: null,
        imageUrl: image && !/favicon|upcitemdb\.com\/favicon/i.test(image) ? image : null,
        urls: amazonFromAsin(asin) ? [amazonFromAsin(asin)!] : [],
        asin: asin || null,
        source: "microlink",
      };
    } catch {
      /* next */
    }
  }
  return null;
}

function toLookup(
  code: string,
  parts: Array<Partial<BarcodeLookup> | null | undefined>,
  extraUrls: BarcodeOffer[] = []
): BarcodeLookup {
  const title =
    parts.find((p) => p?.title && !/^UPC\s/i.test(p.title))?.title ||
    parts.find((p) => p?.title)?.title ||
    `UPC ${formatGtin(code)}`;
  const brand = parts.find((p) => p?.brand)?.brand || null;
  const imageUrl = parts.find((p) => p?.imageUrl)?.imageUrl || null;
  const imageCandidates =
    parts.find((p) => p?.imageCandidates && p.imageCandidates.length)?.imageCandidates ||
    (imageUrl ? [imageUrl] : []);
  const asin = parts.find((p) => p?.asin)?.asin || harvestAsin(title) || null;
  const urls = uniqueOffers(
    [
      amazonFromAsin(asin),
      ...extraUrls,
      ...parts.flatMap((p) => p?.urls || []),
    ].filter(Boolean) as BarcodeOffer[]
  );
  const source = parts.find((p) => p?.urls && p.urls.length)?.source || parts.find((p) => p?.source)?.source || "none";
  return { code, title, brand, imageUrl, imageCandidates, urls, source, asin };
}

export async function lookupBarcode(rawCode: string): Promise<BarcodeLookup> {
  const code = normalizeGtin(rawCode) || onlyKeepDigits(rawCode);
  const cached = cache.get(code);
  if (cached) return cached;

  // Native can call upcitemdb directly. Web is CORS-blocked, so Metro /api/barcode goes first.
  const firstFn = Platform.OS === "web" ? fromServer : fromUpcItemDb;
  const secondFn = Platform.OS === "web" ? fromUpcItemDb : fromServer;

  const first = await firstFn(code);
  const firstLookup = first
    ? toLookup(code, [first])
    : null;
  if (firstLookup && firstLookup.urls.length > 0) {
    cache.set(code, firstLookup);
    return firstLookup;
  }

  const second = await secondFn(code);
  const merged = toLookup(code, [first, second]);
  if (merged.urls.length > 0) {
    cache.set(code, merged);
    return merged;
  }

  const title = merged.title;
  const [facts, micro] = await Promise.all([fromOpenFacts(code), fromMicrolinkPages(code)]);
  const named = toLookup(code, [first, second, facts, micro]);
  let bb: BarcodeOffer[] = [];
  if (!named.asin && named.title && !/^UPC\s/i.test(named.title)) {
    bb = await fromBestBuy(searchQueryFromTitle(named.title), named.title);
    if (bb.length === 0) bb = await fromBestBuy(named.title.slice(0, 80), named.title);
  } else if (!named.asin) {
    bb = await fromBestBuy(code);
  }

  const result = toLookup(code, [named, facts, micro], bb);
  if (result.urls.length > 0) cache.set(code, result);
  return result;
}

function onlyKeepDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function primaryOffer(lookup: BarcodeLookup): BarcodeOffer | null {
  return lookup.urls[0] || null;
}

export function preferLookupTitle(previewTitle: string | undefined, foundTitle: string, fallback: string): string {
  const t = (previewTitle || "").trim();
  if (
    !t ||
    t.length < 8 ||
    /page not found|not found|error 404|access denied|robot check/i.test(t) ||
    /^(amazon\.ca|amazon|best buy|walmart|product link)/i.test(t)
  ) {
    return foundTitle || fallback || t;
  }
  return t;
}

export async function previewForOffer(offer: BarcodeOffer, fallbackTitle: string, fallbackImage: string | null) {
  const preview: UrlPreview = await fetchUrlPreview(offer.url).catch(() => ({
    title: fallbackTitle,
    description: null,
    imageUrl: fallbackImage,
    imageCandidates: fallbackImage ? [fallbackImage] : [],
  }));
  if (!preview.title) preview.title = fallbackTitle;
  if (!preview.imageUrl && fallbackImage) preview.imageUrl = fallbackImage;
  return preview;
}

export { SUPPORTED_DOMAINS };
