import { describe, expect, it } from "vitest";
import { extractPriceFromText, formatDisplayPrice, isMissingPrice } from "../lib/price";

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

describe("formatDisplayPrice", () => {
  it("formats numeric prices with a dollar sign", () => {
    expect(formatDisplayPrice("1149.99")).toBe("$1149.99");
    expect(formatDisplayPrice("$1,149.99")).toBe("$1149.99");
    expect(formatDisplayPrice(599)).toBe("$599");
  });

  it("returns null for missing values", () => {
    expect(formatDisplayPrice(null)).toBeNull();
    expect(formatDisplayPrice("N/A")).toBeNull();
  });
});

describe("extractPriceFromText", () => {
  it("extracts META PRICE FOUND lines", () => {
    expect(extractPriceFromText("META PRICE FOUND: $899.00\nMore text")).toBe("$899");
  });

  it("extracts Price: lines", () => {
    expect(extractPriceFromText("Name: Widget\nPrice: $429.94\nBrand: Samsung")).toBe("$429.94");
  });

  it("returns null when no price pattern matches", () => {
    expect(extractPriceFromText("No pricing information here")).toBeNull();
  });
});
