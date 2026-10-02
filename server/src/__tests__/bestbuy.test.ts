import { describe, expect, it } from "vitest";
import { extractBestBuySku, upgradeBestBuyImageUrl } from "../services/scraper/bestbuy";

describe("extractBestBuySku", () => {
  it("extracts SKU from bestbuy.ca product path", () => {
    expect(
      extractBestBuySku(
        "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154"
      )
    ).toBe("18391154");
  });

  it("extracts SKU from query params", () => {
    expect(extractBestBuySku("https://www.bestbuy.ca/en-ca/product/foo?sku=19206094")).toBe("19206094");
    expect(extractBestBuySku("https://www.bestbuy.ca/en-ca/product/foo?skuId=18481469")).toBe("18481469");
  });

  it("returns null for non–Best Buy hosts", () => {
    expect(extractBestBuySku("https://www.amazon.ca/dp/B0TEST")).toBeNull();
    expect(extractBestBuySku("not-a-url")).toBeNull();
  });
});

describe("upgradeBestBuyImageUrl", () => {
  it("upgrades product image size path to 1500x1500", () => {
    const input =
      "https://multimedia.bbycastatic.ca/multimedia/products/150x150/183/18391/18391154.jpg";
    expect(upgradeBestBuyImageUrl(input)).toContain("/products/1500x1500/");
  });

  it("rejects brand gifs and empty values", () => {
    expect(upgradeBestBuyImageUrl(null)).toBeNull();
    expect(upgradeBestBuyImageUrl("https://example.com/brand/logo.gif")).toBeNull();
  });
});
