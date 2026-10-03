import { describe, expect, it } from "vitest";
import { applyCategoryTemplates, classifyProductTitle, classifyTitles } from "../lib/categoryTemplates";
import { canonicalizeResolutionValue, enrichComparisonSpecs, sanitizeRefreshRate, statedRefreshHz } from "../lib/specEnrichment";
import { isThinScrape, retailerTextForCompare } from "../lib/thinScrape";
import { normalizeComparisonResult } from "../services/openai/merge";

describe("category classification guards that already hold", () => {
  it("keeps OLED laptops and monitors out of the TV bucket", () => {
    expect(classifyProductTitle("ASUS Zenbook 14 OLED").deviceType).toBe("laptop");
    expect(classifyProductTitle("Samsung Odyssey OLED G8 monitor").deviceType).toBe("monitor");
  });

  it("orders drone, soundbar, dishwasher, and headphones ahead of broader tokens", () => {
    expect(classifyProductTitle("DJI Mini 4 Pro Fly More Combo").deviceType).toBe("drone");
    expect(classifyProductTitle("Samsung HW-Q990D soundbar").deviceType).toBe("soundbar");
    expect(classifyProductTitle("Bosch 24 inch Dishwasher").subtype).toBe("dishwasher");
    expect(classifyProductTitle("Bose QuietComfort Headphones").deviceType).toBe("headphones");
    expect(classifyProductTitle("Apple iPhone 16 128GB").deviceType).toBe("smartphone");
  });

  it("marks a TV plus a fridge as mixed instead of forcing one template", () => {
    const mixed = classifyTitles(['LG 65" OLED TV', "LG French Door Refrigerator"]);
    expect(mixed.mixed).toBe(true);
    expect(mixed.deviceType).toBe("other");
  });
});

describe("compare templates for non-phone categories", () => {
  it("leads a soundbar compare with channels and drops chipset", () => {
    const result: any = {
      deviceType: "other",
      products: [
        { name: "Samsung HW-Q990D soundbar", rawSpecs: [{ label: "Channels", value: "11.1.4" }, { label: "Chipset", value: "A" }] },
        { name: "Sonos Arc soundbar", rawSpecs: [{ label: "Channels", value: "5.1.2" }, { label: "Chipset", value: "B" }] },
      ],
      keyDifferences: [{ label: "Chipset", values: ["A", "B"] }],
      groupedSpecs: {},
    };
    applyCategoryTemplates(result);
    expect(result.deviceType).toBe("soundbar");
    expect(result.keyDifferences[0].label).toMatch(/channel/i);
    expect(result.keyDifferences.map((d: { label: string }) => d.label).join(" ")).not.toMatch(/chipset/i);
  });

  it("leads a camera compare with sensor size and does not use a phone RAM diff", () => {
    const result: any = {
      deviceType: "other",
      products: [
        { name: "Sony a7 IV mirrorless camera", rawSpecs: [{ label: "Sensor", value: "33 MP" }, { label: "RAM", value: "8 GB" }] },
        { name: "Canon EOS R6 camera", rawSpecs: [{ label: "Sensor", value: "20 MP" }, { label: "RAM", value: "6 GB" }] },
      ],
      keyDifferences: [{ label: "RAM", values: ["8 GB", "6 GB"] }],
      groupedSpecs: {},
    };
    applyCategoryTemplates(result);
    expect(result.deviceType).toBe("camera");
    expect(result.keyDifferences[0].label).toMatch(/sensor/i);
    expect(result.keyDifferences.map((d: { label: string }) => d.label).join(" ")).not.toMatch(/\bram\b/i);
  });

  it("normalizes a 3-up TV compare and blanks only the thin middle URL", () => {
    const rich = (name: string, hz: string) =>
      [
        `Name: ${name}`,
        "Price: $1299.99",
        "Model: OLED65C4",
        "Resolution: 3840 x 2160",
        `Refresh Rate: ${hz}`,
        "HDMI: 4",
      ].join("\n");
    const result = normalizeComparisonResult(
      {
        deviceType: "other",
        products: [
          { name: 'LG C4 65" OLED TV', price: "$1299.99", rawSpecs: [{ label: "Resolution", value: "3840 x 2160" }, { label: "Refresh Rate", value: "120 Hz" }] },
          { name: 'Samsung S90D 65" OLED TV', price: "$1499.99", rawSpecs: [{ label: "Resolution", value: "3840 x 2160" }, { label: "Refresh Rate", value: "144 Hz" }] },
          { name: 'Sony Bravia 65" OLED TV', price: "$1399.99", rawSpecs: [{ label: "Resolution", value: "3840 x 2160" }, { label: "Refresh Rate", value: "120 Hz" }] },
        ],
        keyDifferences: [{ label: "Refresh Rate", values: ["120 Hz", "144 Hz", "120 Hz"] }],
        groupedSpecs: {
          Display: [{ label: "Refresh Rate", values: ["120 Hz", "144 Hz", "120 Hz"], winnerIndex: 1 }],
        },
      },
      3,
      [
        { url: "https://www.bestbuy.ca/en-ca/product/lg-c4/1", title: 'LG C4 65" OLED TV', retailerText: rich("LG C4", "120 Hz") },
        { url: "https://www.bestbuy.ca/en-ca/product/samsung-s90d/2", title: 'Samsung S90D 65" OLED TV', retailerText: "HTTP 404 not found" },
        { url: "https://www.bestbuy.ca/en-ca/product/sony-bravia/3", title: 'Sony Bravia 65" OLED TV', retailerText: rich("Sony Bravia", "120 Hz") },
      ]
    );
    expect(result.products).toHaveLength(3);
    expect(result.products[1].scrapeStatus).toBe("thin");
    expect(result.products[1].name).toMatch(/S90D/i);
    expect(result.products[1].price).toBe("N/A");
    expect(result.groupedSpecs.Display[0].values[1]).toBe("Unknown");
    expect(result.groupedSpecs.Display[0].values[0]).toBe("120 Hz");
    expect(result.groupedSpecs.Display[0].values[2]).toBe("120 Hz");
    expect(result.deviceType).toBe("television");
  });
});

describe("thin pages and invented numbers", () => {
  it("treats Costco interruption and empty bodies as thin and keeps a priced sheet", () => {
    const blocked = "Pardon Our Interruption\nAre you a human?\n" + "x".repeat(40);
    expect(isThinScrape({ url: "https://www.costco.ca/.product.1.html", title: "Fridge", retailerText: blocked })).toBe(true);
    expect(isThinScrape({ url: "https://www.leons.ca/products/x", title: "Washer", retailerText: "" })).toBe(true);
    const sheet = "Name: Hisense TV\nPrice: $899.99\nModel: 65U88QG\nResolution: 4K\nRefresh Rate: 165 Hz\n";
    expect(isThinScrape({ url: "https://www.leons.ca/products/hisense", title: "Hisense 65 inch 4K TV", retailerText: sheet })).toBe(false);
    const stub = retailerTextForCompare({
      url: "https://www.canadacomputers.com/en/46-64/1/missing.html",
      title: "",
      retailerText: "Failed to extract text.",
    });
    expect(stub).toContain("SCRAPE_STATUS: thin");
    expect(stub.toLowerCase()).toContain("missing");
  });

  it("does not treat nits or mains frequency as a panel refresh rate", () => {
    const page = "Peak brightness: 165 nits\nPower Supply: AC 120V 50-60Hz\nVRR = Yes\nResolution: 4K";
    expect(statedRefreshHz(page)).toEqual([]);
    expect(sanitizeRefreshRate("165 Hz", page)).toBe("VRR");
    expect(sanitizeRefreshRate("60 Hz", page)).toBe("VRR");
  });

  it("snaps a near-miss 8K grid and leaves a printed 1920x1200 laptop panel", () => {
    expect(canonicalizeResolutionValue("7660 x 4320", "8K display")).toBe("7680 x 4320");
    expect(canonicalizeResolutionValue("1920 x 1200", "laptop panel 1920 x 1200")).toBe("1920 x 1200");
  });

  it("propagates a sanitized refresh into a 2-up key diff without touching the stated rate", () => {
    const result: any = {
      products: [
        { name: 'LG 86" QNED70 4K TV', rawSpecs: [{ label: "Refresh Rate", value: "120 Hz (VRR 165Hz)" }] },
        { name: 'Hisense 65" 4K 165Hz TV', rawSpecs: [{ label: "Refresh Rate", value: "165 Hz" }] },
      ],
      keyDifferences: [{ label: "Refresh Rate", values: ["120 Hz (VRR 165Hz)", "165 Hz"] }],
      groupedSpecs: {},
    };
    enrichComparisonSpecs(result, [
      { title: result.products[0].name, retailerText: "VRR = Yes\nResolution: 3840 x 2160\nPower Supply AC 120v 50-60Hz" },
      { title: result.products[1].name, retailerText: "Refresh Rate: 165 Hz\nResolution: 4K" },
    ]);
    expect(result.keyDifferences[0].values).toEqual(["VRR", "165 Hz"]);
  });
});
