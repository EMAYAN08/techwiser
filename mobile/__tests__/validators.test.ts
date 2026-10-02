import { describe, expect, it } from "vitest";
import {
  MAX_COMPARE_URLS,
  MIN_COMPARE_URLS,
  extractBestBuyCaSku,
  isSupportedProductUrl,
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
    expect(validateProductUrl("https://www.amazon.ca/dp/B0EXAMPLE")).toBe("valid");
    expect(validateProductUrl("https://www.walmart.ca/en/ip/foo/123")).toBe("valid");
  });

  it("rejects unsupported domains and bad protocols", () => {
    expect(validateProductUrl("https://www.bestbuy.com/site/foo/123")).toBe("invalid");
    expect(validateProductUrl("ftp://www.bestbuy.ca/en-ca/product/x/1")).toBe("invalid");
    expect(validateProductUrl("not a url")).toBe("invalid");
  });
});

describe("compare limits", () => {
  it("matches PRD 2–4 product range", () => {
    expect(MIN_COMPARE_URLS).toBe(2);
    expect(MAX_COMPARE_URLS).toBe(4);
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
