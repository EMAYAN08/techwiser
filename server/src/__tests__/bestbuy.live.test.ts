import { describe, expect, it } from "vitest";
import { scrapeBestBuyApi, extractBestBuySku } from "../services/scraper/bestbuy";

const IPHONE =
  "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154";
const PIXEL =
  "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094";

describe("Best Buy Canada live API scrape (read-only)", () => {
  it("scrapes iPhone 16 product payload with title, price, and specs text", async () => {
    expect(extractBestBuySku(IPHONE)).toBe("18391154");
    const data = await scrapeBestBuyApi(IPHONE);
    expect(data).not.toBeNull();
    expect(data!.title.toLowerCase()).toContain("iphone");
    expect(data!.priceText).toMatch(/\$\d/);
    expect(data!.rawText.length).toBeGreaterThan(80);
    expect(data!.rawText).toMatch(/SPECS:|Name:/);
  }, 30_000);

  it("scrapes Pixel 9a product payload", async () => {
    expect(extractBestBuySku(PIXEL)).toBe("19206094");
    const data = await scrapeBestBuyApi(PIXEL);
    expect(data).not.toBeNull();
    expect(data!.title.toLowerCase()).toMatch(/pixel/);
    expect(data!.priceText).toMatch(/\$\d/);
  }, 30_000);
});
