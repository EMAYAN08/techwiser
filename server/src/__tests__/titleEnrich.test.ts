import { describe, expect, it } from "vitest";
import {
  applyTitleEnrichment,
  bluetoothFromTitle,
  enrichProductTitles,
  formFactorFromTitle,
  noiseCancellingFromTitle,
} from "../lib/titleEnrich";

describe("title token parsers", () => {
  it("reads a Bluetooth version and falls back to Yes", () => {
    expect(bluetoothFromTitle("Sony WH-1000XM5 Bluetooth 5.3 headphones")).toBe("Bluetooth 5.3");
    expect(bluetoothFromTitle("Bose QuietComfort Bluetooth headphones")).toBe("Yes");
    expect(bluetoothFromTitle("wired studio headphones")).toBeNull();
  });

  it("detects ANC wording without matching unrelated tokens", () => {
    expect(noiseCancellingFromTitle("Bose noise-cancelling headphones")).toBe("Yes");
    expect(noiseCancellingFromTitle("Sony noise canceling headphones")).toBe("Yes");
    expect(noiseCancellingFromTitle("Active Noise Cancellation")).toBe("Yes");
    expect(noiseCancellingFromTitle("ANC over-ear")).toBe("Yes");
    expect(noiseCancellingFromTitle("Samsung France QLED TV")).toBeNull();
    expect(noiseCancellingFromTitle("model ANC5-panel")).toBeNull();
  });

  it("prefers over-ear when a title mentions both, and maps earbuds", () => {
    expect(formFactorFromTitle("over-ear and in-ear combo")).toBe("Over-ear");
    expect(formFactorFromTitle("Sony on-ear headphones")).toBe("On-ear");
    expect(formFactorFromTitle("Galaxy Buds FE earbuds")).toBe("In-ear");
    expect(formFactorFromTitle("true wireless earbuds")).toBe("In-ear");
    expect(formFactorFromTitle("true wireless speaker")).toBeNull();
  });
});

describe("applyTitleEnrichment", () => {
  it("fills blank ANC, Bluetooth version, and form factor and leaves price alone", () => {
    const specs = applyTitleEnrichment(
      [
        { label: "Noise Cancelling", value: "Unknown" },
        { label: "Bluetooth", value: "—" },
        { label: "Price", value: "$449.99" },
      ],
      "Bose QuietComfort Ultra noise-cancelling Bluetooth 5.3 over-ear headphones"
    );
    expect(specs.find((s) => /noise/i.test(s.label))?.value).toBe("Yes");
    expect(specs.find((s) => /bluetooth/i.test(s.label))?.value).toBe("Bluetooth 5.3");
    expect(specs.find((s) => /form factor/i.test(s.label))?.value).toBe("Over-ear");
    expect(specs.find((s) => s.label === "Price")?.value).toBe("$449.99");
  });

  it("does not invent audio fields from a TV title", () => {
    const specs = applyTitleEnrichment([], 'LG 86" QNED70 4K Smart TV');
    expect(specs).toEqual([]);
  });

  it("does not overwrite an explicit No or a real Bluetooth version", () => {
    const specs = applyTitleEnrichment(
      [
        { label: "Noise Cancelling", value: "No" },
        { label: "Bluetooth", value: "5.2" },
        { label: "Form Factor", value: "On-ear" },
      ],
      "noise-cancelling Bluetooth 5.4 over-ear headphones"
    );
    expect(specs.map((s) => s.value)).toEqual(["No", "5.2", "On-ear"]);
  });

  it("re-applies title tokens on a product list after fields were blanked", () => {
    const products = [
      {
        name: "Apple AirPods Pro 2 with Active Noise Cancellation Bluetooth",
        rawSpecs: [{ label: "Noise Cancelling", value: "Unknown" }],
      },
    ];
    enrichProductTitles(products);
    expect(products[0].rawSpecs?.find((s) => /noise/i.test(s.label))?.value).toBe("Yes");
    expect(products[0].rawSpecs?.find((s) => /bluetooth/i.test(s.label))?.value).toBe("Yes");
  });

  it("leaves products with an empty title unchanged", () => {
    const products = [{ name: "   ", rawSpecs: [{ label: "Bluetooth", value: "Unknown" }] }];
    enrichProductTitles(products);
    expect(products[0].rawSpecs).toEqual([{ label: "Bluetooth", value: "Unknown" }]);
  });
});
