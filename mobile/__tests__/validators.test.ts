import { describe, expect, it } from "vitest";
import {
  MAX_COMPARE_URLS,
  MIN_COMPARE_URLS,
  canonicalizeProductUrl,
  extractBestBuyCaSku,
  isSupportedProductUrl,
  looksLikeProductPage,
  uniqueSupportedProductUrls,
  validateProductUrl,
} from "../utils/validators";

describe("validateProductUrl", () => {
  it("marks empty as idle", () => {
    expect(validateProductUrl("")).toBe("idle");
    expect(validateProductUrl("   ")).toBe("idle");
  });

  it("accepts supported Canadian retailer product URLs", () => {
    expect(
      validateProductUrl(
        "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154"
      )
    ).toBe("valid");
    expect(validateProductUrl("https://www.amazon.ca/dp/B0D1XD1ZV3")).toBe("valid");
    expect(validateProductUrl("https://www.walmart.ca/en/ip/foo/123")).toBe("valid");
  });

  it("rejects unsupported domains, home pages, and garbage", () => {
    expect(validateProductUrl("https://www.bestbuy.com/site/foo/123")).toBe("invalid");
    expect(validateProductUrl("ftp://www.bestbuy.ca/en-ca/product/x/1")).toBe("invalid");
    expect(validateProductUrl("not a url")).toBe("invalid");
    expect(validateProductUrl("https://www.bestbuy.ca/")).toBe("invalid");
    expect(validateProductUrl("https://www.bestbuy.ca/en-ca")).toBe("invalid");
    expect(validateProductUrl("https://www.amazon.ca/")).toBe("invalid");
  });
});

describe("looksLikeProductPage", () => {
  it("requires a Best Buy product SKU path", () => {
    expect(
      looksLikeProductPage(
        "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094"
      )
    ).toBe(true);
    expect(looksLikeProductPage("https://www.bestbuy.ca/en-ca/category/phones/100")).toBe(false);
  });
});

describe("compare limits", () => {
  it("matches PRD 2–3 product range", () => {
    expect(MIN_COMPARE_URLS).toBe(2);
    expect(MAX_COMPARE_URLS).toBe(3);
  });
});

describe("extractBestBuyCaSku", () => {
  it("parses path and query SKUs", () => {
    expect(
      extractBestBuyCaSku(
        "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094"
      )
    ).toBe("19206094");
    expect(isSupportedProductUrl("https://www.bestbuy.ca/en-ca/product/x/19206094")).toBe(true);
  });
});

describe("uniqueSupportedProductUrls", () => {
  it("dedupes by host+path and drops invalids", () => {
    const a =
      "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154";
    const b =
      "https://bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154/";
    const c =
      "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094";
    expect(uniqueSupportedProductUrls([a, "garbage", b, c])).toEqual([a, c]);
    expect(canonicalizeProductUrl(a)).toBe(canonicalizeProductUrl(b));
  });
});
