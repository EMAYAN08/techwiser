import { describe, expect, it } from "vitest";
import {
  applyCategoryTemplates,
  classifyProductTitle,
  classifyTitles,
  groupForLabel,
} from "../lib/categoryTemplates";
import { enrichProductSpecs } from "../lib/specEnrichment";
import { normalizeComparisonResult } from "../services/openai/merge";

describe("classifyProductTitle", () => {
  it("classifies fridges, washers, and mixed appliances as appliance, not other", () => {
    expect(classifyProductTitle("LG 36 inch French Door Refrigerator").deviceType).toBe("appliance");
    expect(classifyProductTitle("LG 36 inch French Door Refrigerator").subtype).toBe("fridge");
    expect(classifyProductTitle("Samsung Front Load Washer 5.0 cu ft")).toMatchObject({
      deviceType: "appliance",
      subtype: "washer",
    });
    expect(classifyProductTitle("Bosch 24 inch Dishwasher")).toMatchObject({ subtype: "dishwasher" });
    const mixed = classifyTitles([
      "Panasonic 1.2 cu ft Microwave",
      "Dyson Stick Vacuum",
      "Bosch Dishwasher",
    ]);
    expect(mixed.deviceType).toBe("appliance");
    expect(mixed.mixedSubtypes).toBe(true);
  });

  it("classifies drones, soundbars, cameras, and headphones ahead of phone/TV traps", () => {
    expect(classifyProductTitle("DJI Mini 4 Pro Fly More Combo").deviceType).toBe("drone");
    expect(classifyProductTitle("Samsung HW-Q990D soundbar").deviceType).toBe("soundbar");
    expect(classifyProductTitle("Sony a7 IV mirrorless camera").deviceType).toBe("camera");
    expect(classifyProductTitle("Bose QuietComfort Ultra noise-cancelling Bluetooth over-ear").deviceType).toBe(
      "headphones"
    );
    expect(classifyProductTitle("Sony WH-1000XM5 Headphones").deviceType).toBe("headphones");
    expect(classifyProductTitle("Apple iPhone 16 128GB").deviceType).toBe("smartphone");
    expect(classifyProductTitle("ASUS Zenbook 14 OLED").deviceType).toBe("laptop");
    expect(classifyProductTitle('LG 65 inch OLED TV').deviceType).toBe("television");
  });
});

describe("title enrichment", () => {
  it("fills ANC, Bluetooth, and over-ear from the title when those fields are Unknown", () => {
    const specs = enrichProductSpecs(
      [
        { label: "Noise Cancelling", value: "Unknown" },
        { label: "Bluetooth", value: "Unknown" },
        { label: "Price", value: "$449.99" },
      ],
      { title: "Bose QuietComfort Ultra noise-cancelling Bluetooth over-ear headphones" }
    );
    expect(specs.find((s) => /noise cancell/i.test(s.label))?.value).toBe("Yes");
    expect(specs.find((s) => /bluetooth/i.test(s.label))?.value).toBe("Yes");
    expect(specs.find((s) => /form factor/i.test(s.label))?.value).toBe("Over-ear");
    expect(specs.find((s) => s.label === "Price")?.value).toBe("$449.99");
  });

  it("does not overwrite a real Bluetooth version or an explicit No", () => {
    const specs = enrichProductSpecs(
      [
        { label: "Noise Cancelling", value: "No" },
        { label: "Bluetooth", value: "5.3" },
      ],
      { title: "Sony noise-cancelling Bluetooth 5.3 over-ear headphones" }
    );
    expect(specs.find((s) => /noise cancell/i.test(s.label))?.value).toBe("No");
    expect(specs.find((s) => /bluetooth/i.test(s.label))?.value).toBe("5.3");
    expect(specs.find((s) => /form factor/i.test(s.label))?.value).toBe("Over-ear");
  });
});

describe("key-diff priority", () => {
  it("leads a washer compare with capacity, not hoses or model numbers, and drops the Camera bucket", () => {
    const result: any = {
      deviceType: "other",
      products: [
        {
          name: "LG Front Load Washer",
          rawSpecs: [
            { label: "Inlet Hose", value: "HOSE-A" },
            { label: "Model Number", value: "WM4000" },
            { label: "Capacity", value: "5.0 cu. ft." },
            { label: "Chipset", value: "Snapdragon" },
          ],
        },
        {
          name: "Samsung Front Load Washer",
          rawSpecs: [
            { label: "Inlet Hose", value: "HOSE-B" },
            { label: "Model Number", value: "WF53" },
            { label: "Capacity", value: "4.5 cu. ft." },
            { label: "Chipset", value: "Exynos" },
          ],
        },
      ],
      keyDifferences: [
        { label: "Inlet Hose", values: ["HOSE-A", "HOSE-B"] },
        { label: "Model Number", values: ["WM4000", "WF53"] },
        { label: "Chipset", values: ["Snapdragon", "Exynos"] },
      ],
      groupedSpecs: {
        Camera: [{ label: "Sensor Dry", values: ["Yes", "No"], winnerIndex: 0 }],
        Design: [{ label: "Capacity", values: ["5.0 cu. ft.", "4.5 cu. ft."], winnerIndex: 0 }],
      },
      groupIcons: { Camera: "camera", Design: "design" },
    };

    applyCategoryTemplates(result);

    expect(result.deviceType).toBe("appliance");
    expect(result.subcategory).toBe("washer");
    expect(result.keyDifferences[0].label).toMatch(/capacity/i);
    expect(result.keyDifferences.map((d: { label: string }) => d.label).join(" ")).not.toMatch(/hose|model|chipset/i);
    expect(result.groupedSpecs.Camera).toBeUndefined();
    expect(result.groupedSpecs.Capacity.some((row: { label: string }) => row.label === "Capacity")).toBe(true);
    expect(groupForLabel("Sensor Dry", "appliance").group).not.toBe("Camera");
  });

  it("keeps mixed appliances on capacity and off Camera", () => {
    const result: any = {
      deviceType: "other",
      products: [
        { name: "Panasonic Microwave Oven", rawSpecs: [{ label: "Capacity", value: "1.2 cu. ft." }] },
        { name: "Dyson Stick Vacuum", rawSpecs: [{ label: "Suction", value: "230 AW" }] },
        { name: "Bosch Dishwasher", rawSpecs: [{ label: "Capacity", value: "16 place settings" }] },
      ],
      keyDifferences: [{ label: "RAM", values: ["4 GB", "2 GB", "1 GB"] }],
      groupedSpecs: {
        Camera: [{ label: "Sensor Cook", values: ["Yes", "—", "—"], winnerIndex: 0 }],
        Design: [{ label: "Dimensions", values: ['20"', '10"', '24"'], winnerIndex: -1 }],
      },
    };
    applyCategoryTemplates(result);
    expect(result.deviceType).toBe("appliance");
    expect(result.groupedSpecs.Camera).toBeUndefined();
    expect(result.keyDifferences.map((d: { label: string }) => d.label).join(" ")).not.toMatch(/\bram\b/i);
  });

  it("ranks drone flight time ahead of chipset and model", () => {
    const result: any = {
      deviceType: "other",
      products: [
        {
          name: "DJI Mini 4 Pro",
          rawSpecs: [
            { label: "Model Number", value: "MT4PD" },
            { label: "Chipset", value: "A" },
            { label: "Max Flight Time", value: "34 min" },
          ],
        },
        {
          name: "DJI Air 3S",
          rawSpecs: [
            { label: "Model Number", value: "AIR3S" },
            { label: "Chipset", value: "B" },
            { label: "Max Flight Time", value: "45 min" },
          ],
        },
      ],
      keyDifferences: [
        { label: "Model Number", values: ["MT4PD", "AIR3S"] },
        { label: "Chipset", values: ["A", "B"] },
      ],
      groupedSpecs: {},
    };
    applyCategoryTemplates(result);
    expect(result.deviceType).toBe("drone");
    expect(result.keyDifferences[0].label).toMatch(/flight/i);
    expect(result.keyDifferences.map((d: { label: string }) => d.label).join(" ")).not.toMatch(/chipset|model/i);
  });

  it("normalizes a washer compare end to end", () => {
    const result = normalizeComparisonResult(
      {
        deviceType: "other",
        products: [
          {
            name: "LG Front Load Washer",
            rawSpecs: [
              { label: "Inlet Hose", value: "HOSE-A" },
              { label: "Capacity", value: "5.0 cu. ft." },
            ],
          },
          {
            name: "Samsung Front Load Washer",
            rawSpecs: [
              { label: "Inlet Hose", value: "HOSE-B" },
              { label: "Capacity", value: "4.5 cu. ft." },
            ],
          },
        ],
        keyDifferences: [{ label: "Inlet Hose", values: ["HOSE-A", "HOSE-B"] }],
        groupedSpecs: {
          Camera: [{ label: "Sensor Dry", values: ["Yes", "No"], winnerIndex: 0 }],
        },
      },
      2
    );
    expect(result.deviceType).toBe("appliance");
    expect(result.keyDifferences[0].label).toMatch(/capacity/i);
    expect(result.groupedSpecs.Camera).toBeUndefined();
  });
});
