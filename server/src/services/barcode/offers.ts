import { BROWSER_UA, NESTED_URL_PARAMS, SUPPORTED_RETAILERS } from "../../config/constants";
import type { BarcodeOffer } from "../../types/barcode";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function retailerFromHost(host: string): string {
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
  return SUPPORTED_RETAILERS.some((d) => host === d || host.endsWith("." + d));
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

export function offerFromUrl(url: string): BarcodeOffer | null {
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
    for (const key of NESTED_URL_PARAMS) push(u.searchParams.get(key));
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
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
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

export async function resolveOfferUrl(url: string): Promise<BarcodeOffer | null> {
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

export function mergeOffers(list: Array<BarcodeOffer | null | undefined>): BarcodeOffer[] {
  const seen = new Set<string>();
  const out: BarcodeOffer[] = [];
  for (const o of list.filter(Boolean) as BarcodeOffer[]) {
    if (seen.has(o.url)) continue;
    seen.add(o.url);
    out.push(o);
  }
  return out.sort((a, b) => offerRank(a) - offerRank(b));
}
