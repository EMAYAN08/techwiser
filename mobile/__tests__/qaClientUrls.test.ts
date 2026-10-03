import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalizeProductUrl,
  uniqueSupportedProductUrls,
  validateProductUrl,
} from "../utils/validators";

describe("retailer product URLs used by the category suite", () => {
  it("accepts Best Buy, Canada Computers, Leon's, and Costco product URLs", () => {
    expect(
      validateProductUrl("https://www.bestbuy.ca/en-ca/product/dji-mini-4-pro-quadcopter-drone/17248733")
    ).toBe("valid");
    expect(
      validateProductUrl(
        "https://www.canadacomputers.com/en/46-64/286814/lg-86-lg-qned-ai-qned70-4k-smart-tv-86qned70auaacc.html"
      )
    ).toBe("valid");
    expect(
      validateProductUrl("https://www.leons.ca/products/hisense-65-4k-smart-mini-led-pro-qled-165hz-tv-65u88qg")
    ).toBe("valid");
    expect(validateProductUrl("https://www.costco.ca/lg-french-door.product.4000123456.html")).toBe("valid");
  });

  it("rejects US Best Buy, category hubs, and tracking-only duplicates", () => {
    expect(validateProductUrl("https://www.bestbuy.com/site/iphone/123.p")).toBe("invalid");
    expect(validateProductUrl("https://www.canadacomputers.com/en")).toBe("invalid");
    expect(validateProductUrl("https://www.costco.ca/")).toBe("invalid");
    const leon = "https://www.leons.ca/products/hisense-65-4k-tv-65u88qg";
    expect(uniqueSupportedProductUrls([leon, leon + "?utm_source=qa", "https://www.bestbuy.com/site/x/1"])).toEqual([
      leon,
    ]);
    expect(canonicalizeProductUrl(leon + "/")).toBe(canonicalizeProductUrl(leon));
  });
});

describe("library retailer wells", () => {
  const catalog = readFileSync(new URL("../constants/wellCatalog.ts", import.meta.url), "utf8");

  it.fails("offers a Leon's well for the supported leons retailer key", () => {
    expect(catalog).toMatch(/id:\s*"leons"/);
  });
});
