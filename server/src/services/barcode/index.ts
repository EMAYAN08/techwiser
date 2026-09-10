import { BARCODE_CACHE_TTL_MS } from "../../config/constants";
import type { BarcodeLookupResult, BarcodeOffer } from "../../types/barcode";
import { cleanQuery, searchQueryFromTitle, similarName } from "./matching";
import { mergeOffers, offerFromUrl } from "./offers";
import {
  lookupMicrolinkPages,
  lookupOpenFacts,
  lookupUpcItemDb,
  searchAmazonCaForAsin,
  searchBestBuy,
} from "./sources";

export type { BarcodeLookupResult, BarcodeOffer } from "../../types/barcode";
export { similarName };

const cache = new Map<string, { at: number; value: BarcodeLookupResult }>();

function digits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export async function lookupBarcode(raw: string): Promise<BarcodeLookupResult> {
  const code = digits(raw);
  const cached = cache.get(code);
  if (cached && Date.now() - cached.at < BARCODE_CACHE_TTL_MS) return cached.value;

  const [upc, facts, micro] = await Promise.all([
    lookupUpcItemDb(code),
    lookupOpenFacts(code),
    typeof lookupMicrolinkPages !== "undefined" ? lookupMicrolinkPages(code) : Promise.resolve(null),
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

export async function resolveProductNames(names: string[]): Promise<string[]> {
  const resolvedUrls: string[] = [];
  console.log(`[resolveProductNames] Starting resolution for names:`, names);
  for (const name of names) {
    if (!name.trim()) continue;

    console.log(`[resolveProductNames] Searching Best Buy natively for: "${name}"`);
    // We search best buy using the name. We don't provide expectedTitle so it just takes the top result.
    const offers = await searchBestBuy(name);

    if (offers && offers.length > 0) {
      console.log(`[resolveProductNames] Found match for "${name}" -> ${offers[0].url}`);
      resolvedUrls.push(offers[0].url);
    } else {
      console.warn(`[resolveProductNames] No match found for "${name}" on Best Buy. Trying Amazon CA...`);
      const asin = await searchAmazonCaForAsin(name);
      if (asin) {
        const amzUrl = `https://www.amazon.ca/dp/${asin}`;
        console.log(`[resolveProductNames] Found match on Amazon CA -> ${amzUrl}`);
        resolvedUrls.push(amzUrl);
      } else {
        console.warn(`[resolveProductNames] Exhausted all search options for "${name}".`);
      }
    }
  }

  console.log(`[resolveProductNames] Finished resolution. Found ${resolvedUrls.length} valid URLs.`);
  return resolvedUrls;
}
