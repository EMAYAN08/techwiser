export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const SUPPORTED_RETAILERS = [
  "bestbuy.ca",
  "amazon.ca",
  "walmart.ca",
  "costco.ca",
  "canadacomputers.com",
  "memoryexpress.com",
  "newegg.ca",
  "staples.ca",
  "thesource.ca",
] as const;

export const NESTED_URL_PARAMS = [
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
] as const;

export const BARCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

export const RETAILER_COLORS: Record<string, string> = {
  bestbuy: "#003B64",
  amazon: "#FF9900",
  canadacomputers: "#E31837",
  memoryexpress: "#005BAA",
  newegg: "#E2241B",
  staples: "#CC0000",
  thesource: "#E4002B",
  costco: "#005BAA",
  walmart: "#0071CE",
};

export const NAME_STOP_WORDS = new Set([
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
