import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../constants/Colors", () => ({
  RETAILER_NAMES: {
    bestbuy: "Best Buy",
    amazon: "Amazon",
    canadacomputers: "Canada Computers",
    memoryexpress: "Memory Express",
    newegg: "Newegg",
    staples: "Staples",
    thesource: "The Source",
    costco: "Costco",
    walmart: "Walmart",
  },
}));

type MiniProduct = {
  id: string;
  name: string;
  brand: string;
  retailer: string;
  retailerColor: string;
  url: string;
  specs: [];
  description?: string;
};

function product(partial: Partial<MiniProduct> & Pick<MiniProduct, "name">): MiniProduct {
  return {
    id: "t",
    brand: "",
    retailer: "bestbuy",
    retailerColor: "#003B64",
    url: "https://www.bestbuy.ca/en-ca/product/x/1",
    specs: [],
    ...partial,
  };
}

describe("classifyProduct / getRetailerKey", () => {
  let classifyProduct: (p: MiniProduct) => string;
  let getRetailerKey: (name?: string) => string;

  beforeAll(async () => {
    const mod = await import("../utils/productKind");
    classifyProduct = mod.classifyProduct as typeof classifyProduct;
    getRetailerKey = mod.getRetailerKey as typeof getRetailerKey;
  });

  it("classifies phones, laptops, TVs, and appliances", () => {
    expect(classifyProduct(product({ name: "Apple iPhone 16 128GB" }))).toBe("smartphone");
    expect(classifyProduct(product({ name: "MacBook Pro 14 M3" }))).toBe("laptop");
    expect(classifyProduct(product({ name: "LG OLED C3 65 TV" }))).toBe("tv");
    expect(classifyProduct(product({ name: "Samsung Bespoke Fridge" }))).toBe("major");
    expect(classifyProduct(product({ name: "Dyson V15 Vacuum" }))).toBe("minor");
    expect(classifyProduct(product({ name: "Apple iPad Pro 12.9" }))).toBe("tablet");
  });

  it("normalizes retailer names", () => {
    expect(getRetailerKey("Best Buy")).toBe("bestbuy");
    expect(getRetailerKey("Amazon.ca")).toBe("amazon");
    expect(getRetailerKey("Mystery Mart")).toBe("other");
  });
});
