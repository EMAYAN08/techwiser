import { describe, expect, it } from "vitest";
import { RETAILER_COLORS, SUPPORTED_RETAILERS } from "../config/constants";

describe("SUPPORTED_RETAILERS", () => {
  it("includes Canada-first Best Buy and peer retailers", () => {
    expect(SUPPORTED_RETAILERS).toContain("bestbuy.ca");
    expect(SUPPORTED_RETAILERS).toContain("amazon.ca");
    expect(SUPPORTED_RETAILERS).toContain("walmart.ca");
    expect(SUPPORTED_RETAILERS.length).toBeGreaterThanOrEqual(7);
  });
});

describe("RETAILER_COLORS", () => {
  it("maps bestbuy to brand navy", () => {
    expect(RETAILER_COLORS.bestbuy).toBe("#003B64");
  });
});
