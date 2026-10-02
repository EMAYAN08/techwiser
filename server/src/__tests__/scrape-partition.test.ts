import { describe, expect, it } from "vitest";
import { partitionScrapeResults } from "../services/scraper";
import type { ScrapeResult } from "../types/scrape";

describe("partitionScrapeResults", () => {
  it("separates fulfilled scrapes from failures", () => {
    const urls = ["https://a.example/1", "https://a.example/2", "https://a.example/3"];
    const results: PromiseSettledResult<ScrapeResult>[] = [
      { status: "fulfilled", value: { rawText: "ok", imageUrl: null, title: "A", priceText: "$10" } },
      { status: "rejected", reason: new Error("boom") },
      {
        status: "fulfilled",
        value: {
          rawText: "ok2",
          imageUrl: "https://img",
          title: "B",
          priceText: null,
          priceSource: "bestbuy-api",
        },
      },
    ];

    const { scrapedData, failedUrls } = partitionScrapeResults(urls, results);
    expect(scrapedData).toHaveLength(2);
    expect(scrapedData[0].url).toBe(urls[0]);
    expect(scrapedData[0].priceText).toBe("$10");
    expect(scrapedData[1].priceSource).toBe("bestbuy-api");
    expect(failedUrls).toEqual([urls[1]]);
  });
});
