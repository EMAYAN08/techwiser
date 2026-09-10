import { fetchJson } from "../../lib/http";
import type { BarcodeOffer, ProductFacts, UpcItemRecord } from "../../types/barcode";
import { similarName } from "./matching";
import { offerFromUrl, resolveOfferUrl } from "./offers";

function digits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function gtinVariants(code: string): string[] {
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

export async function lookupUpcItemDb(code: string): Promise<UpcItemRecord | null> {
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

export async function lookupOpenFacts(code: string): Promise<ProductFacts | null> {
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

export async function lookupMicrolinkPages(code: string): Promise<any | null> {
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
      const m = (title + desc + (json.data.url || "")).match(/[A-Z0-9]{10}/);
      if (m) asin = m[0];

      if (!title && !image && !asin) continue;
      return {
        title: title.replace(/\s*\|\s*upcitemdb\.com/i, "").replace(/\s*-?\s*UPC\s+\d+.*$/i, ""),
        imageUrl: image,
        asin: asin,
      };
    } catch {}
  }
  return null;
}

export async function searchBestBuy(query: string, expectedTitle?: string): Promise<BarcodeOffer[]> {
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

export async function searchAmazonCaForAsin(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.amazon.ca/s?k=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/data-asin="([A-Z0-9]{10})"/);
    if (match) return match[1];
  } catch (e) {}
  return null;
}
