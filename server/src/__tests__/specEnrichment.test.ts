import { describe, expect, it } from "vitest";
import {
  alignMarketingResolution,
  enrichComparisonSpecs,
  enrichProductSpecs,
  extractWeightKgFromText,
  inferChipset,
  inferLaptopWeightKg,
  inferResolutionFromModel,
  isFaceIdOnlyDevice,
  normalizeWeightComparisons,
  shouldOverrideResolution,
} from "../lib/specEnrichment";

describe("inferResolutionFromModel", () => {
  it("maps LG 27LX6 / StanbyME 2 series to QHD", () => {
    const a = inferResolutionFromModel("27LX6TYGA.ACC");
    expect(a?.short).toMatch(/1440|QHD/i);
    const b = inferResolutionFromModel("LG 27 FHD StanbyME-2 TV - 27LX6TYGA.ACC");
    expect(b?.full).toMatch(/2560/);
  });

  it("returns null for unknown models", () => {
    expect(inferResolutionFromModel("Random Toaster 3000")).toBeNull();
  });
});

describe("shouldOverrideResolution", () => {
  it("overrides FHD/1080 when model implies QHD", () => {
    expect(shouldOverrideResolution("1080p", "1440p QHD")).toBe(true);
    expect(shouldOverrideResolution("FHD", "1440p QHD")).toBe(true);
  });

  it("keeps existing QHD values", () => {
    expect(shouldOverrideResolution("1440p", "1440p QHD")).toBe(false);
    expect(shouldOverrideResolution("2560 x 1440", "1440p QHD")).toBe(false);
  });
});

describe("enrichProductSpecs resolution", () => {
  it("replaces Leon-style FHD with QHD when model is 27LX6", () => {
    const specs = enrichProductSpecs(
      [
        { label: "Model", value: "27LX6TYGA.ACC" },
        { label: "Native Resolution", value: "1080p" },
      ],
      { title: 'LG 27" FHD StanbyME-2 TV' }
    );
    const res = specs.find((s) => /resolution/i.test(s.label));
    expect(res?.value).toMatch(/1440|QHD|2560/i);
  });
});

describe("laptop weight enrichment", () => {
  it("infers UX3405 weight from OEM map", () => {
    expect(inferLaptopWeightKg("UX3405CA-RS71T-CA")?.kg).toBe(1.28);
  });

  it("extracts kg from retailer text", () => {
    expect(extractWeightKgFromText("Weight (approximate): 1.28 kg (2.82 lb)")).toBe("1.28 kg");
  });

  it("fills Unknown weight for Zenbook model", () => {
    const specs = enrichProductSpecs(
      [
        { label: "Model", value: "UX3405CA-RS71T-CA" },
        { label: "Processor", value: "Intel Core Ultra 7 255H" },
        { label: "Weight", value: "Unknown" },
      ],
      { title: "ASUS Zenbook 14 OLED Windows Laptop" }
    );
    expect(specs.find((s) => s.label === "Weight")?.value).toBe("1.28 kg");
  });
});

describe("normalizeWeightComparisons", () => {
  it("aligns mixed with/without stand weights", () => {
    const result = {
      products: [
        {
          rawSpecs: [
            { label: "Weight with Stand", value: "15.2 kg" },
            { label: "Weight without Stand", value: "4.31 kg" },
          ],
        },
        {
          rawSpecs: [{ label: "Weight", value: "9.5 lb" }],
        },
      ],
      keyDifferences: [{ label: "Weight", values: ["15.2 kg", "9.5 lb"] }],
      groupedSpecs: {
        Design: [{ label: "Weight", values: ["15.2 kg", "9.5 lb"], winnerIndex: 0 }],
      },
    };
    normalizeWeightComparisons(result);
    expect(result.keyDifferences[0].label).toMatch(/without stand/i);
    expect(result.keyDifferences[0].values[0]).toMatch(/4\.31/);
  });
});

describe("enrichComparisonSpecs end-to-end", () => {
  it("updates product rawSpecs and keyDifferences resolution", () => {
    const result = {
      products: [
        {
          name: "Costco TV",
          rawSpecs: [
            { label: "Model", value: "27LX6TYGA.ACC" },
            { label: "Native Resolution", value: "1440p" },
          ],
        },
        {
          name: 'LG 27" FHD StanbyME-2 TV',
          rawSpecs: [
            { label: "Model", value: "27LX6TYGA.ACC" },
            { label: "Native Resolution", value: "1080p" },
          ],
        },
      ],
      keyDifferences: [{ label: "Native Resolution", values: ["1440p", "1080p"] }],
      groupedSpecs: {},
    };
    enrichComparisonSpecs(result);
    expect(result.products[1].rawSpecs.find((s: any) => /resolution/i.test(s.label)).value).toMatch(
      /1440|QHD|2560/i
    );
    expect(result.keyDifferences[0].values[1]).toMatch(/1440|QHD|2560/i);
  });
});

describe("chipset and biometric enrichment", () => {
  it("fills iPhone 16 chipset and clears false fingerprint when Face ID is present", () => {
    const specs = enrichProductSpecs(
      [
        { label: "Fingerprint Scanning", value: "Yes" },
        { label: "Face ID", value: "Yes" },
      ],
      { title: "Apple iPhone 16 128GB" }
    );
    expect(specs.find((s) => /chipset/i.test(s.label))?.value).toMatch(/A18/i);
    expect(specs.find((s) => /chipset/i.test(s.label))?.value).not.toMatch(/Pro/);
    expect(specs.find((s) => /fingerprint/i.test(s.label))?.value).toBe("No");
    expect(specs.find((s) => /face id/i.test(s.label))?.value).toBe("Yes");
  });

  it("maps Pixel 9a to Tensor G4 and does not strip fingerprint", () => {
    expect(inferChipset("Google Pixel 9a 128GB")).toMatch(/Tensor G4/i);
    const specs = enrichProductSpecs(
      [{ label: "Fingerprint Scanning", value: "Yes" }],
      { title: "Google Pixel 9a" }
    );
    expect(specs.find((s) => /fingerprint/i.test(s.label))?.value).toBe("Yes");
    expect(specs.find((s) => /chipset/i.test(s.label))?.value).toMatch(/Tensor G4/i);
  });

  it("keeps Touch ID / iPhone SE fingerprint", () => {
    expect(isFaceIdOnlyDevice("Apple iPhone SE (3rd generation)")).toBe(false);
    const specs = enrichProductSpecs(
      [{ label: "Fingerprint Scanning", value: "Yes" }, { label: "Touch ID", value: "Yes" }],
      { title: "Apple iPhone SE" }
    );
    expect(specs.find((s) => /fingerprint/i.test(s.label))?.value).toBe("Yes");
  });

  it("does not replace an existing laptop processor", () => {
    const specs = enrichProductSpecs(
      [{ label: "Processor", value: "Intel Core Ultra 7 255H" }, { label: "Model", value: "UX3405CA-RS71T-CA" }],
      { title: "ASUS Zenbook 14" }
    );
    expect(specs.find((s) => s.label === "Processor")?.value).toMatch(/Ultra 7/);
  });
});

describe("shared resolution wording", () => {
  it("rewrites an FHD title and display when the model is QHD", () => {
    const result: any = {
      products: [
        {
          name: 'LG 27" FHD StanbyME-2 TV',
          rawSpecs: [
            { label: "Model", value: "27LX6TYGA.ACC" },
            { label: "Native Resolution", value: "1080p" },
            { label: "Display", value: "27 inch FHD" },
          ],
        },
      ],
      keyDifferences: [{ label: "Native Resolution", values: ["1080p"] }],
    };
    enrichComparisonSpecs(result);
    expect(result.products[0].name).toMatch(/QHD/i);
    expect(result.products[0].name).not.toMatch(/\bFHD\b/);
    expect(result.products[0].rawSpecs.find((s: any) => s.label === "Display").value).toMatch(/QHD/i);
    expect(result.keyDifferences[0].values[0]).toMatch(/1440|QHD/i);
  });

  it("does not rewrite 1920x1200 laptop panels", () => {
    expect(alignMarketingResolution("14 inch 1920 x 1200", "1440p QHD")).toBe("14 inch 1920 x 1200");
    const specs = enrichProductSpecs(
      [{ label: "Display", value: "14 inch 1920 x 1200" }, { label: "Model", value: "UX3405CA" }],
      { title: "ASUS Zenbook 14 OLED" }
    );
    expect(specs.find((s) => s.label === "Display")?.value).toBe("14 inch 1920 x 1200");
  });

  it("prefers OEM laptop weight over a heavier shipping kg in text", () => {
    const specs = enrichProductSpecs(
      [
        { label: "Model", value: "UX3405CA-RS71T-CA" },
        { label: "Processor", value: "Intel Core Ultra 7 255H" },
        { label: "Weight", value: "Unknown" },
      ],
      { title: "ASUS Zenbook 14 OLED", retailerText: "Shipping weight 2.454 kg" }
    );
    expect(specs.find((s) => s.label === "Weight")?.value).toBe("1.28 kg");
  });
});
