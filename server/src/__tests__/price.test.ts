import { describe, expect, it } from "vitest";
import {
  extractPriceFromText,
  extractRankedPriceFromHtml,
  extractShopifyPriceFromHtml,
  formatDisplayPrice,
  isMissingPrice,
  looksLikeMinorCurrencyUnits,
  normalizeMoneyAmount,
  pickCurrentPrice,
  pricesFromOffers,
  resolveProductPrice,
} from "../lib/price";

describe("isMissingPrice", () => {
  it("treats nullish and placeholders as missing", () => {
    expect(isMissingPrice(null)).toBe(true);
    expect(isMissingPrice(undefined)).toBe(true);
    expect(isMissingPrice("")).toBe(true);
    expect(isMissingPrice("  ")).toBe(true);
    expect(isMissingPrice("N/A")).toBe(true);
    expect(isMissingPrice("n/a")).toBe(true);
    expect(isMissingPrice("unknown")).toBe(true);
    expect(isMissingPrice("-")).toBe(true);
    expect(isMissingPrice("\u2014")).toBe(true);
  });

  it("accepts real prices", () => {
    expect(isMissingPrice("$1149.99")).toBe(false);
    expect(isMissingPrice("599.97")).toBe(false);
  });
});

describe("Shopify / minor-unit normalization", () => {
  it("detects integer cents-scale amounts", () => {
    expect(looksLikeMinorCurrencyUnits(159900)).toBe(true);
    expect(looksLikeMinorCurrencyUnits(10000)).toBe(true);
    expect(looksLikeMinorCurrencyUnits(1998)).toBe(false);
    expect(looksLikeMinorCurrencyUnits(1149.99)).toBe(false);
  });

  it("maps Shopify cents to dollars", () => {
    expect(normalizeMoneyAmount(159900)).toBe(1599);
    expect(normalizeMoneyAmount("159900")).toBe(1599);
    expect(formatDisplayPrice(159900)).toBe("$1599");
    expect(formatDisplayPrice("199899")).toBe("$1998.99");
  });

  it("does not rescale ordinary dollar amounts", () => {
    expect(formatDisplayPrice(1149)).toBe("$1149");
    expect(formatDisplayPrice("1998.99")).toBe("$1998.99");
    expect(formatDisplayPrice("$1,149.99")).toBe("$1149.99");
    expect(formatDisplayPrice(599)).toBe("$599");
  });
});

describe("formatDisplayPrice", () => {
  it("returns null for missing values", () => {
    expect(formatDisplayPrice(null)).toBeNull();
    expect(formatDisplayPrice("N/A")).toBeNull();
    expect(formatDisplayPrice("—")).toBeNull();
  });
});

describe("extractShopifyPriceFromHtml", () => {
  it("reads price_min cents from Shopify HTML", () => {
    const html = `
      <html><script>var meta = {"product":{"id":1}};</script>
      <script src="https://cdn.shopify.com/s/files/theme.js"></script>
      {"price_min":159900,"price_max":161325,"price":159900}
    `;
    expect(extractShopifyPriceFromHtml(html)).toBe("$1599");
  });

  it("returns null for non-Shopify HTML", () => {
    expect(extractShopifyPriceFromHtml("<html><body>Price: $20</body></html>")).toBeNull();
  });
});

describe("extractPriceFromText", () => {
  it("extracts META PRICE FOUND lines", () => {
    expect(extractPriceFromText("META PRICE FOUND: $899.00\nMore text")).toBe("$899");
  });

  it("extracts Price: lines", () => {
    expect(extractPriceFromText("Name: Widget\nPrice: $429.94\nBrand: Samsung")).toBe("$429.94");
  });

  it("normalizes cents in JSON price fields", () => {
    expect(extractPriceFromText('{"price_min":159900,"title":"TV"}')).toBe("$1599");
  });

  it("returns null when no price pattern matches", () => {
    expect(extractPriceFromText("No pricing information here")).toBeNull();
  });
});

describe("resolveProductPrice", () => {
  it("prefers scraped over LLM when both exist", () => {
    expect(resolveProductPrice({ scrapedPrice: "$1998.99", llmPrice: "$1299.99" })).toBe("$1998.99");
  });

  it("fills missing LLM price from scraped Shopify cents", () => {
    expect(resolveProductPrice({ scrapedPrice: "159900", llmPrice: "—" })).toBe("$1599");
  });

  it("falls back to LLM when scrape missing", () => {
    expect(resolveProductPrice({ scrapedPrice: null, llmPrice: "$729" })).toBe("$729");
  });
});

describe("sale vs list price", () => {
  it("prefers JSON-LD current price over StrikethroughPrice", () => {
    const price = pricesFromOffers({
      price: 1999,
      priceCurrency: "CAD",
      priceSpecification: {
        price: 2299,
        priceType: "https://schema.org/StrikethroughPrice",
        priceCurrency: "CAD",
      },
    });
    expect(price).toBe("$1999");
  });

  it("keeps a single unlabeled price", () => {
    expect(pickCurrentPrice([{ amount: 1149.99, role: "unknown" }])).toBe("$1149.99");
    expect(pricesFromOffers({ price: "1998.99" })).toBe("$1998.99");
  });

  it("reads visible current price over a regular-price node", () => {
    const html = `
      <div class="current-price-value"><span itemprop="price">$1,999.00</span></div>
      <div class="regular-price"><span>$2,299.00</span></div>
    `;
    expect(extractRankedPriceFromHtml(html)).toBe("$1999");
  });
});
