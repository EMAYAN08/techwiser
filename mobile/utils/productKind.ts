import type { Product } from "../store/useComparisonStore";
import { RETAILER_NAMES } from "../constants/Colors";

export type ProductKind =
  | "laptop"
  | "pc"
  | "smartphone"
  | "tablet"
  | "tv"
  | "major"
  | "minor"
  | "other";

export type RetailerKey = keyof typeof RETAILER_NAMES | "other";

function haystack(product: Product): string {
  return [product.name, product.brand, product.description, product.url]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyProduct(product: Product): ProductKind {
  const t = haystack(product);

  if (/\b(ipad|tablet|galaxy tab|kindle fire|surface go|surface pro)\b/.test(t)) return "tablet";
  if (
    /\b(iphone|pixel \d|galaxy s\d|galaxy z|smartphone|smart phone)\b/.test(t) ||
    (/\bphone\b/.test(t) && !/\b(headphone|earphone|microphone|phone case)\b/.test(t))
  ) {
    return "smartphone";
  }
  if (
    /\b(macbook|laptop|notebook|chromebook|zenbook|thinkpad|gram)\b/.test(t) ||
    /galaxy\s*book/.test(t) ||
    /\bxps \d{2}\b/.test(t)
  ) {
    return "laptop";
  }
  if (
    /\b(imac|mac mini|mac studio|mac pro|desktop|gaming pc|workstation|tower)\b/.test(t) &&
    !/\blaptop\b/.test(t)
  ) {
    return "pc";
  }
  // Sticks, set-tops, and Switch/Book OLED are not televisions.
  if (/fire tv stick|\bchromecast\b|\bapple tv\b|\bnintendo switch\b/.test(t)) return "other";
  if (/\b(tv|oled|qled|television|bravia|fire tv)\b/.test(t) && !/\b(laptop|monitor|stick)\b/.test(t)) return "tv";
  if (
    (/\b(fridge|refrigerator|washer|washing machine|dryer|dishwasher|range|stove|freezer)\b/.test(t) &&
      !/\bzoom\b/.test(t) &&
      !/\b\d{2}-\d{2}mm\b/.test(t)) ||
    (/\boven\b/.test(t) && !/\btoaster\b/.test(t))
  ) {
    return "major";
  }
  if (
    /\b(microwave|toaster|blender|air fry?er|kettle|vacuum|coffee|espresso|mixer|air purifier|humidifier|instant pot)\b/.test(
      t
    )
  ) {
    return "minor";
  }
  return "other";
}

export function getRetailerKey(retailerName?: string): RetailerKey {
  if (!retailerName) return "other";
  const normalized = retailerName.toLowerCase().replace(/[^a-z]/g, "");
  for (const key of Object.keys(RETAILER_NAMES) as (keyof typeof RETAILER_NAMES)[]) {
    if (normalized.includes(key)) return key;
  }
  return "other";
}
