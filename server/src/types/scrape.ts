export type ScrapeResult = {
  rawText: string;
  imageUrl: string | null;
  title: string;
  priceText?: string | null;
  priceSource?: "bestbuy-api" | "scrape" | "shopify-json" | "json-ld" | "retailer-html";
};

export type ScrapedProduct = {
  url: string;
  retailerText: string;
  imageUrl: string | null;
  title: string;
  priceText?: string | null;
  priceSource?: "bestbuy-api" | "scrape" | "shopify-json" | "json-ld" | "retailer-html";
};