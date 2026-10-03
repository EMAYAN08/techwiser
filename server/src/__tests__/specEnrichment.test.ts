import { describe, expect, it } from "vitest";
import {
  alignMarketingResolution,
  canonicalizeResolutionValue,
  enrichComparisonSpecs,
  enrichProductSpecs,
  extractWeightKgFromText,
  inferChipset,
  inferLaptopWeightKg,
  inferResolutionFromModel,
  isFaceIdOnlyDevice,
  normalizeWeightComparisons,
  sanitizeRefreshRate,
  shouldOverrideResolution,
  statedRefreshHz,
  brightnessClaimGrounded,
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

describe("do not invent refresh rates or pixel grids", () => {
  const ccPage = `
LG 86\" LG QNED AI QNED70 4k Smart TV
Screen Size: 86 in
Resolution: 3840 x 2160
TV Display Technology: QNED
VRR = Yes
Power Supply: AC 120v 50-60Hz
Output Power: 20W
`.trim();

  const hisensePage = `
Hisense 65\" 4K Smart Mini-LED Pro QLED 165Hz TV - 65U88QG
Screen Size: 65 in
Resolution: 4K
Display Type: Mini-LED
Refresh Rate: 165 Hz
Peak brightness: 5000 nits
`.trim();

  it("does not turn VRR=Yes into 120 Hz or 165 Hz", () => {
    expect(statedRefreshHz(ccPage)).toEqual([]);
    expect(sanitizeRefreshRate("120 Hz (VRR 165Hz)", ccPage)).toBe("VRR");
    const specs = enrichProductSpecs(
      [
        { label: "Resolution", value: "3840 x 2160" },
        { label: "Refresh Rate", value: "120 Hz (VRR 165Hz)" },
      ],
      { title: 'LG 86" LG QNED AI QNED70 4k Smart TV', retailerText: ccPage }
    );
    const refresh = specs.find((s) => /refresh/i.test(s.label))?.value || "";
    expect(refresh).toBe("VRR");
    expect(refresh).not.toMatch(/120|165/);
    expect(specs.find((s) => s.label === "Resolution")?.value).toBe("3840 x 2160");
  });

  it("snaps 3820×2160 to 3840×2160 when the page only says 4K and keeps stated 165 Hz", () => {
    expect(canonicalizeResolutionValue("3820 × 2160", hisensePage)).toBe("3840 x 2160");
    expect(canonicalizeResolutionValue("4K", hisensePage)).toBe("4K");
    expect(sanitizeRefreshRate("165 Hz", hisensePage)).toBe("165 Hz");
    const specs = enrichProductSpecs(
      [
        { label: "Native Resolution (Pixels)", value: "3820 x 2160" },
        { label: "Refresh Rate", value: "165 Hz" },
      ],
      {
        title: 'Hisense 65" 4K Smart Mini-LED Pro QLED 165Hz TV - 65U88QG',
        retailerText: hisensePage,
      }
    );
    const res = specs.find((s) => /resolution/i.test(s.label))?.value || "";
    expect(res).toBe("3840 x 2160");
    expect(res).not.toMatch(/3820/);
    expect(specs.find((s) => /refresh/i.test(s.label))?.value).toBe("165 Hz");
  });

  it("keeps 120 Hz and VRR 165 Hz when both numbers are on the page", () => {
    const page = "Native refresh rate 120 Hz. VRR up to 165 Hz. Resolution 4K.";
    expect(statedRefreshHz(page).sort((a, b) => a - b)).toEqual([120, 165]);
    expect(sanitizeRefreshRate("120 Hz (VRR 165Hz)", page)).toBe("120 Hz (VRR 165Hz)");
  });

  it("prefers a page refresh over a conflicting guess and ignores mains 60 Hz", () => {
    const page = "Refresh Rate: 144 Hz\nPower Supply AC 120v 50-60Hz";
    expect(statedRefreshHz(page)).toEqual([144]);
    expect(sanitizeRefreshRate("120 Hz", page)).toBe("144 Hz");
  });

  it("does not rewrite 1920x1200 or a bare 4K, and still snaps a bare 3820 typo", () => {
    expect(canonicalizeResolutionValue("1920 x 1200", "4K display")).toBe("1920 x 1200");
    expect(canonicalizeResolutionValue("3820×2160")).toBe("3840 x 2160");
    expect(sanitizeRefreshRate("120 Hz (VRR 165Hz)", "")).toBe("120 Hz (VRR 165Hz)");
  });

  it("pushes the corrected refresh and resolution into key differences", () => {
    const result: any = {
      products: [
        {
          name: 'LG 86" QNED70 4K',
          rawSpecs: [
            { label: "Resolution", value: "3840 x 2160" },
            { label: "Refresh Rate", value: "120 Hz (VRR 165Hz)" },
          ],
        },
        {
          name: 'Hisense 65" 4K Smart Mini-LED Pro QLED 165Hz TV - 65U88QG',
          rawSpecs: [
            { label: "Native Resolution (Pixels)", value: "3820 × 2160" },
            { label: "Refresh Rate", value: "165 Hz" },
          ],
        },
      ],
      keyDifferences: [
        { label: "Resolution", values: ["3840 x 2160", "3820 × 2160"] },
        { label: "Refresh Rate", values: ["120 Hz (VRR 165Hz)", "165 Hz"] },
      ],
      groupedSpecs: {
        Display: [
          { label: "Refresh Rate", values: ["120 Hz (VRR 165Hz)", "165 Hz"], winnerIndex: 1 },
        ],
      },
    };
    enrichComparisonSpecs(result, [
      { title: 'LG 86" QNED70 4K', retailerText: ccPage },
      { title: 'Hisense 65" 4K 165Hz', retailerText: hisensePage },
    ]);
    expect(result.products[0].rawSpecs.find((s: any) => /refresh/i.test(s.label)).value).toBe("VRR");
    expect(result.products[1].rawSpecs.find((s: any) => /resolution/i.test(s.label)).value).toBe("3840 x 2160");
    expect(result.keyDifferences[0].values[1]).toBe("3840 x 2160");
    expect(result.keyDifferences[1].values[0]).toBe("VRR");
    expect(result.keyDifferences[1].values[1]).toBe("165 Hz");
    expect(result.groupedSpecs.Display[0].values[0]).toBe("VRR");
  });
});

  it("does not keep a 48 Hz film rate when the page states 165 Hz", () => {
    const page = "Refresh Rate: 48 Hz - 165 Hz native panel";
    const specs = enrichProductSpecs([{ label: "Refresh Rate", value: "48 Hz" }], { retailerText: page, title: "Hisense 65 TV" });
    expect(specs.find((s) => /refresh/i.test(s.label))?.value).toBe("165 Hz");
  });

describe("display resolution vs camera megapixels", () => {
  it("keeps the pixel grid on Display Resolution instead of the first camera MP row", () => {
    const result: any = {
      products: [
        {
          name: "Apple iPhone 16",
          rawSpecs: [
            { label: "Front-Facing Camera Resolution", value: "12MP" },
            { label: "Display Resolution", value: "12MP" },
          ],
        },
        {
          name: "Google Pixel 9a",
          rawSpecs: [
            { label: "Front-Facing Camera Resolution", value: "13MP" },
            { label: "Display Resolution", value: "13MP" },
          ],
        },
      ],
      groupedSpecs: {
        Display: [{ label: "Display Resolution", values: ["12MP", "13MP"], winnerIndex: 0 }],
      },
      keyDifferences: [],
    };
    enrichComparisonSpecs(result, [
      { title: "iPhone 16", retailerText: "Display Resolution: 2556 x 1179\nFront Camera: 12MP" },
      { title: "Pixel 9a", retailerText: "Display Resolution: 1080 x 2424\nFront Camera: 13MP" },
    ]);
    expect(result.groupedSpecs.Display[0].values[0]).toMatch(/2556/);
    expect(result.groupedSpecs.Display[0].values[1]).toMatch(/1080/);
    expect(result.groupedSpecs.Display[0].values.join(" ")).not.toMatch(/\d+MP/);
  });

  it("drops nits that are not in that product's retailer text", () => {
    expect(brightnessClaimGrounded("5000 nits", "Peak brightness: 5,000 nits")).toBe(true);
    expect(brightnessClaimGrounded("5000 nits", "Resolution: 3840 x 2160 Refresh Rate: 165 Hz")).toBe(false);
    const result: any = {
      products: [
        { name: "Best Buy U88", rawSpecs: [{ label: "Peak Brightness", value: "5000 nits" }] },
        { name: "Leon's U88", rawSpecs: [{ label: "Peak Brightness", value: "5000 nits" }] },
      ],
      groupedSpecs: {
        Display: [{ label: "Peak Brightness", values: ["5000 nits", "5000 nits"], winnerIndex: -1 }],
      },
      keyDifferences: [{ label: "Peak Brightness", values: ["5000 nits", "5000 nits"] }],
    };
    enrichComparisonSpecs(result, [
      { title: "Best Buy", retailerText: "Resolution: 3840 x 2160\nRefresh Rate: 165 Hz" },
      { title: "Leon's", retailerText: "Brightness: Up to 5,000 nits\nRefresh Rate: 165 Hz" },
    ]);
    expect(result.products[0].rawSpecs.find((s: any) => /bright/i.test(s.label)).value).toBe("—");
    expect(result.products[1].rawSpecs.find((s: any) => /bright/i.test(s.label)).value).toMatch(/5000/);
    expect(result.groupedSpecs.Display[0].values[0]).toBe("—");
    expect(result.groupedSpecs.Display[0].values[1]).toMatch(/5000/);
  });
});
