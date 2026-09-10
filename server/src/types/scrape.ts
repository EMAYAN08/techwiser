export type ScrapeResult = {
  rawText: string;
  imageUrl: string | null;
  title: string;
};

export type ScrapedProduct = {
  url: string;
  retailerText: string;
  imageUrl: string | null;
  title: string;
};
