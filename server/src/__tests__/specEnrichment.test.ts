import { describe, expect, it } from "vitest";
import {
  enrichComparisonSpecs,
  enrichProductSpecs,
  extractWeightKgFromText,
  inferLaptopWeightKg,
  inferResolutionFromModel,
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
