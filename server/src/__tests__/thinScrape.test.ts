import { describe, expect, it } from "vitest";
import { isThinScrape, retailerTextForCompare } from "../lib/thinScrape";
import { alignHarvestToInputs, alignListToInputs, normalizeComparisonResult } from "../services/openai/merge";

const MINI_URL = "https://www.bestbuy.ca/en-ca/product/dji-mini-4-pro-drone/17248733";
const AIR_URL = "https://www.bestbuy.ca/en-ca/product/dji-air-3s-drone/18900001";

const AIR_SPECS = [
  { label: "Weight", value: "720 g" },
  { label: "Max Speed", value: "75 km/h" },
  { label: "Flight Time", value: "45 min" },
  { label: "Camera", value: "1-inch CMOS" },
];

function airSheet(name = "DJI Air 3S") {
  return {
    name,
    brand: "DJI",
    url: AIR_URL,
    price: "$1,599.99",
    rawSpecs: AIR_SPECS.map((s) => ({ ...s })),
    aiSummary: "The Air 3S is a fast folding drone.",
    userPros: ["Fast"],
    badges: ["Long flight"],
  };
}

describe("isThinScrape / retailerTextForCompare", () => {
  it("treats a Best Buy JSON 404 as thin and strips the body", () => {
    const retailerText = "Failed to extract text. HTTP 404 not found. Related: DJI Air 3S Weight: 720 g";
    expect(isThinScrape({ url: MINI_URL, title: "Page not found", retailerText, priceText: null })).toBe(true);
    const stub = retailerTextForCompare({ url: MINI_URL, title: "", retailerText, priceText: null });
    expect(stub).toContain("SCRAPE_STATUS: thin");
    expect(stub.toLowerCase()).toContain("mini 4 pro");
    expect(stub).not.toContain("720");
    expect(stub).not.toContain("Air 3S");
  });

  it("leaves a real spec sheet untouched", () => {
    const retailerText = [
      "Name: DJI Air 3S",
      "Price: $1599.99",
      "Model: CP.MA.00000846.01",
      "Weight: 720 g",
      "Max Speed: 75 km/h",
      "Flight Time: 45 min",
    ].join("\n");
    expect(isThinScrape({ url: AIR_URL, title: "DJI Air 3S", retailerText })).toBe(false);
    expect(retailerTextForCompare({ url: AIR_URL, title: "DJI Air 3S", retailerText })).toBe(retailerText);
  });
});

describe("alignListToInputs sibling slots", () => {
  it("does not clone the only harvested product onto a second URL", () => {
    const inputs = [
      { url: MINI_URL, title: "DJI Mini 4 Pro" },
      { url: AIR_URL, title: "DJI Air 3S" },
    ];
    const { aligned, sourceIndex } = alignListToInputs(
      [{ name: "DJI Air 3S", brand: "DJI", specs: AIR_SPECS }],
      inputs,
      { name: (p) => `${p.name} ${p.brand}` }
    );
    expect(sourceIndex[1]).toBe(0);
    expect(aligned[1]?.name).toBe("DJI Air 3S");
    expect(aligned[0]).toBeUndefined();
    expect(sourceIndex[0]).toBe(-1);

    const harvest = { products: [{ name: "DJI Air 3S", brand: "DJI", specs: AIR_SPECS }] };
    alignHarvestToInputs(harvest, inputs);
    expect(harvest.products?.[0].specs).toEqual([]);
    expect(harvest.products?.[0].name).toMatch(/Mini 4 Pro/i);
    expect(harvest.products?.[1].specs?.map((s) => s.value)).toContain("720 g");
  });
});

describe("normalizeComparisonResult thin-scrape guard", () => {
  it("drops a sibling Air 3S sheet copied onto a Mini 4 Pro 404", () => {
    const miniText = "Failed to extract text. HTTP 404 not found";
    const airText = [
      "Name: DJI Air 3S",
      "Price: $1599.99",
      "Model: CP.MA.00000846.01",
      "Weight: 720 g",
      "Max Speed: 75 km/h",
      "Flight Time: 45 min",
      "Camera: 1-inch CMOS",
    ].join("\n");
    const result = normalizeComparisonResult(
      {
        aiSummary: "Air vs Air",
        products: [airSheet(), airSheet()],
        keyDifferences: [{ label: "Weight", values: ["720 g", "720 g"] }],
        groupedSpecs: {
          Design: [{ label: "Weight", values: ["720 g", "720 g"], winnerIndex: 0 }],
          Performance: [
            { label: "Max Speed", values: ["75 km/h", "75 km/h"], winnerIndex: 0 },
            { label: "Flight Time", values: ["45 min", "45 min"], winnerIndex: -1 },
          ],
        },
      },
      2,
      [
        { url: MINI_URL, title: "DJI Mini 4 Pro", retailerText: miniText },
        { url: AIR_URL, title: "DJI Air 3S", retailerText: airText },
      ]
    );

    expect(result.products[0].name).toMatch(/Mini 4 Pro/i);
    expect(result.products[0].name).not.toMatch(/Air 3S/i);
    expect(result.products[0].scrapeStatus).toBe("thin");
    expect(result.products[0].price).toBe("N/A");
    const miniWeight = result.products[0].rawSpecs.find((s: { label: string }) => s.label === "Weight");
    expect(miniWeight.value).toBe("Unknown");
    expect(JSON.stringify(result.products[0])).not.toMatch(/720|75 km\/h|45 min/);
    expect(result.groupedSpecs.Design[0].values[0]).toBe("Unknown");
    // Identical sibling values are dropped as a tie before the guard; none may remain as 720 g.
    expect(JSON.stringify(result.keyDifferences)).not.toMatch(/720/);

    expect(result.products[1].name).toMatch(/Air 3S/);
    expect(result.products[1].rawSpecs.find((s: { label: string }) => s.label === "Weight").value).toBe("720 g");
    expect(result.groupedSpecs.Design[0].values[1]).toBe("720 g");
    expect(result.products[1].scrapeStatus).toBeUndefined();
  });

  it("keeps a thin Bose sheet as title + Unknown instead of borrowing Sony specs", () => {
    const result = normalizeComparisonResult(
      {
        products: [
          {
            name: "Bose QuietComfort Headphones",
            url: "https://www.bestbuy.ca/en-ca/product/bose-quietcomfort/111",
            price: "N/A",
            aiSummary: "Title only until the page loads.",
            rawSpecs: [
              { label: "Noise Cancelling", value: "Unknown" },
              { label: "Bluetooth", value: "Unknown" },
            ],
          },
          {
            name: "Sony WH-1000XM5",
            url: "https://www.bestbuy.ca/en-ca/product/sony-wh-1000xm5/222",
            price: "$398.00",
            rawSpecs: [
              { label: "Noise Cancelling", value: "Yes" },
              { label: "Bluetooth", value: "5.2" },
              { label: "Weight", value: "250 g" },
              { label: "Driver", value: "30 mm" },
            ],
          },
        ],
        keyDifferences: [{ label: "Noise Cancelling", values: ["Unknown", "Yes"] }],
        groupedSpecs: {
          Audio: [{ label: "Noise Cancelling", values: ["Unknown", "Yes"], winnerIndex: 1 }],
        },
      },
      2,
      [
        {
          url: "https://www.bestbuy.ca/en-ca/product/bose-quietcomfort/111",
          title: "Bose QuietComfort Headphones",
          retailerText: "Failed to extract text.",
        },
        {
          url: "https://www.bestbuy.ca/en-ca/product/sony-wh-1000xm5/222",
          title: "Sony WH-1000XM5",
          retailerText: "Name: Sony WH-1000XM5\nPrice: $398.00\nModel: WH1000XM5\nNoise Cancelling: Yes\nBluetooth: 5.2\nWeight: 250 g\nDriver: 30 mm\n",
        },
      ]
    );

    expect(result.products[0].name).toBe("Bose QuietComfort Headphones");
    expect(result.products[0].scrapeStatus).toBe("thin");
    expect(result.products[0].rawSpecs.map((s: { value: string }) => s.value)).toEqual(["Unknown", "Unknown"]);
    expect(result.products[0].aiSummary).toBe("Title only until the page loads.");
    expect(result.groupedSpecs.Audio[0].values).toEqual(["Unknown", "Yes"]);
    expect(result.products[1].rawSpecs.find((s: { label: string }) => s.label === "Weight").value).toBe("250 g");
  });

  it("does not blank two rich pages for the same model at different stores", () => {
    const text = "Name: DJI Mini 4 Pro\nPrice: $999.99\nModel: CP.MA.000007\nWeight: 249 g\nMax Speed: 57.6 km/h\nFlight Time: 34 min\nCamera: 1/1.3-inch CMOS\n";
    const specs = [
      { label: "Weight", value: "249 g" },
      { label: "Max Speed", value: "57.6 km/h" },
      { label: "Flight Time", value: "34 min" },
      { label: "Camera", value: "1/1.3-inch CMOS" },
    ];
    const result = normalizeComparisonResult(
      {
        products: [
          { name: "DJI Mini 4 Pro", url: MINI_URL, price: "$999.99", rawSpecs: specs.map((s) => ({ ...s })) },
          {
            name: "DJI Mini 4 Pro",
            url: "https://www.canadacomputers.com/en/mini-4-pro",
            price: "$1019.99",
            rawSpecs: specs.map((s) => ({ ...s })),
          },
        ],
        groupedSpecs: {
          Design: [{ label: "Weight", values: ["249 g", "249 g"], winnerIndex: -1 }],
        },
        keyDifferences: [],
      },
      2,
      [
        { url: MINI_URL, title: "DJI Mini 4 Pro", retailerText: text },
        {
          url: "https://www.canadacomputers.com/en/mini-4-pro",
          title: "DJI Mini 4 Pro",
          retailerText: text.replace("$999.99", "$1019.99"),
        },
      ]
    );
    expect(result.products[0].scrapeStatus).toBeUndefined();
    expect(result.products[1].scrapeStatus).toBeUndefined();
    expect(result.products[0].rawSpecs.find((s: { label: string }) => s.label === "Weight").value).toBe("249 g");
    expect(result.products[1].rawSpecs.find((s: { label: string }) => s.label === "Weight").value).toBe("249 g");
  });

  it("rejects a sibling sheet even when the 404 HTML mentions some other price", () => {
    const noisy404 = [
      "Sorry, we can't find that page.",
      "You may also like",
      "Price: $1099.00",
      "Model: FEATURED-AD",
      "Shop drones today.",
    ].join("\n");
    expect(isThinScrape({ url: MINI_URL, title: "DJI Mini 4 Pro", retailerText: noisy404 })).toBe(false);
    const result = normalizeComparisonResult(
      {
        products: [
          { ...airSheet("DJI Air 3S"), url: MINI_URL },
          airSheet(),
        ],
        groupedSpecs: {
          Design: [{ label: "Weight", values: ["720 g", "720 g"], winnerIndex: -1 }],
          Performance: [
            { label: "Max Speed", values: ["75 km/h", "75 km/h"], winnerIndex: -1 },
            { label: "Flight Time", values: ["45 min", "45 min"], winnerIndex: -1 },
          ],
          Camera: [{ label: "Camera", values: ["1-inch CMOS", "1-inch CMOS"], winnerIndex: -1 }],
        },
        keyDifferences: [{ label: "Max Speed", values: ["75 km/h", "75 km/h"] }],
      },
      2,
      [
        { url: MINI_URL, title: "DJI Mini 4 Pro", retailerText: noisy404 },
        {
          url: AIR_URL,
          title: "DJI Air 3S",
          retailerText:
            "Name: DJI Air 3S\nPrice: $1599.99\nModel: CP.MA.00000846.01\nWeight: 720 g\nMax Speed: 75 km/h\nFlight Time: 45 min\nCamera: 1-inch CMOS\n",
        },
      ]
    );
    expect(result.products[0].scrapeStatus).toBe("sibling-rejected");
    expect(result.products[0].name).toMatch(/Mini 4 Pro/i);
    expect(result.groupedSpecs.Design[0].values[0]).toBe("Unknown");
    expect(result.groupedSpecs.Design[0].values[1]).toBe("720 g");
  });
});
