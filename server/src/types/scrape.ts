export type ScrapeResult = {
  rawText: string;
  imageUrl: string | null;
  title: string;
  priceText?: string | null;
};

export type ScrapedProduct = {
  url: string;
  retailerText: string;
  imageUrl: string | null;
  title: string;
  priceText?: string | null;
};
