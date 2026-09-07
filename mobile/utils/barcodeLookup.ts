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

function apiBase() {
  return (process.env.EXPO_PUBLIC_API_URL || "https://techwiser.onrender.com").replace(/\/$/, "");
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

function asOffer(url: string): BarcodeOffer | null {
  try {
    const parsed = parseProductUrl(url);
    if (!parsed.url) return null;
    const host = parsed.host || hostOf(parsed.url);
    if (!isSupportedHost(host)) return null;
    return {
      url: canonicalizeUrl(parsed.url),
      retailer: parsed.retailer || retailerFromHost(host),
      domain: host,
    };
  } catch {
    return null;
  }
}

function amazonScore(o: BarcodeOffer): number {
  return o.domain.includes("amazon.ca") && /\/dp\//i.test(o.url) ? 0 : 1;
}

function uniqueOffers(list: BarcodeOffer[]): BarcodeOffer[] {
  const seen = new Set<string>();
  const out: BarcodeOffer[] = [];
  for (const o of list) {
    if (!o || seen.has(o.url)) continue;
    seen.add(o.url);
    out.push(o);
  }
  return out.sort((a, b) => amazonScore(a) - amazonScore(b));
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
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function lookupFromPayload(code: string, data: any, source: string): BarcodeLookup | null {
  if (!data || typeof data !== "object") return null;
  const urls = uniqueOffers(
    [
      ...(Array.isArray(data.urls) ? data.urls : [])
        .map((u: any) => (typeof u === "string" ? asOffer(u) : asOffer(u?.url)))
        .filter(Boolean) as BarcodeOffer[],
      amazonFromAsin(data.asin),
    ].filter(Boolean) as BarcodeOffer[]
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
    asin: data.asin || null,
  };
}

async function postBarcode(url: string, code: string): Promise<any | null> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
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
    const parsed = lookupFromPayload(code, json?.data, endpoint.startsWith("http") && endpoint.includes("onrender.com") ? "server" : "local");
    if (parsed) return parsed;
  }
  return null;
}

async function fromOpenFacts(code: string): Promise<Partial<BarcodeLookup> | null> {
  const variants = Array.from(
    new Set([code, compactGtin(code), code.length === 13 && code.startsWith("0") ? code.slice(1) : ""])
  ).filter(Boolean);
  const hosts = [
    "https://world.openfoodfacts.org",
    "https://world.openproductsfacts.org",
    "https://world.openbeautyfacts.org",
  ];
  for (const host of hosts) {
    for (const id of variants) {
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
      const image = (typeof json.data.image === "string" ? json.data.image : json.data.image?.url) || null;
      if (!title && !image) continue;
      return {
        title: title || `Product ${formatGtin(code)}`,
        brand: null,
        imageUrl: image && !/favicon|upcitemdb\.com\/favicon/i.test(image) ? image : null,
        source: "microlink",
      };
    } catch {
      /* next */
    }
  }
  return null;
}

function amazonFromAsin(asin?: string | null): BarcodeOffer | null {
  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) return null;
  return asOffer(`https://www.amazon.ca/dp/${asin.toUpperCase()}`);
}

export async function lookupBarcode(rawCode: string): Promise<BarcodeLookup> {
  const code = normalizeGtin(rawCode) || onlyKeepDigits(rawCode);
  const cached = cache.get(code);
  if (cached) return cached;

  const server = await fromServer(code);
  if (server && server.urls.length > 0) {
    cache.set(code, server);
    return server;
  }

  const [facts, micro] = await Promise.all([fromOpenFacts(code), fromMicrolinkPages(code)]);
  const title = server?.title || facts?.title || micro?.title || `UPC ${formatGtin(code)}`;
  const brand = server?.brand || facts?.brand || null;
  const imageUrl = server?.imageUrl || facts?.imageUrl || micro?.imageUrl || null;
  const urls = uniqueOffers(
    [...(server?.urls || []), amazonFromAsin(server?.asin)].filter(Boolean) as BarcodeOffer[]
  );

  const result: BarcodeLookup = {
    code,
    title,
    brand,
    imageUrl,
    imageCandidates: imageUrl ? [imageUrl] : [],
    urls,
    source: server?.source || facts?.source || micro?.source || "none",
    asin: server?.asin || null,
  };
  if (urls.length > 0) cache.set(code, result);
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
