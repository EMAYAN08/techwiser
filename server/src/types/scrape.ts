export type ScrapeResult = {
  rawText: string;
  imageUrl: string | null;
  title: string;
  priceText?: string | null;
  priceSource?: "bestbuy-api" | "scrape";
};

export type ScrapedProduct = {
  url: string;
  retailerText: string;
  imageUrl: string | null;
  title: string;
  priceText?: string | null;
  priceSource?: "bestbuy-api" | "scrape";
};