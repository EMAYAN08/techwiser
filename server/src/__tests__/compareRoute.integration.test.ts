import { beforeEach, describe, expect, it, vi } from "vitest";

const { scrapeUrlsSequentially, generateAiComparison } = vi.hoisted(() => ({
  scrapeUrlsSequentially: vi.fn(),
  generateAiComparison: vi.fn(),
}));

vi.mock("../services/scraper", async () => {
  const actual = await vi.importActual<typeof import("../services/scraper")>("../services/scraper");
  return { ...actual, scrapeUrlsSequentially };
});

vi.mock("../services/ai", () => ({
  generateAiComparison,
}));

import request from "supertest";
import { createApp } from "../app";

const app = createApp();

const BB = "https://www.bestbuy.ca/en-ca/product/lg-c4-oled/111";
const CC = "https://www.canadacomputers.com/en/46-64/286814/lg-86-qned.html";
const LEON = "https://www.leons.ca/products/hisense-65-4k-tv-65u88qg";

function fulfilled(title: string, rawText: string, priceText: string | null) {
  return { status: "fulfilled" as const, value: { rawText, imageUrl: null, title, priceText } };
}

describe("POST /api/compare route wiring", () => {
  beforeEach(() => {
    scrapeUrlsSequentially.mockReset();
    generateAiComparison.mockReset();
  });

  it("rejects a fourth URL before scraping", async () => {
    const res = await request(app)
      .post("/api/compare")
      .send({ urls: [BB, CC, LEON, "https://www.costco.ca/lg-fridge.product.100.html"] });
    expect(res.status).toBe(400);
    expect(scrapeUrlsSequentially).not.toHaveBeenCalled();
  });

  it("rejects ftp and mixed invalid entries", async () => {
    const ftp = await request(app).post("/api/compare").send({ urls: ["ftp://www.bestbuy.ca/en-ca/product/x/1", BB] });
    expect(ftp.status).toBe(400);
    const mixed = await request(app).post("/api/compare").send({ urls: [BB, "not a url"] });
    expect(mixed.status).toBe(400);
    expect(scrapeUrlsSequentially).not.toHaveBeenCalled();
  });

  it("rejects a non-array urls payload", async () => {
    const res = await request(app).post("/api/compare").send({ urls: BB });
    expect(res.status).toBe(400);
    expect(scrapeUrlsSequentially).not.toHaveBeenCalled();
  });

  it("returns 502 when fewer than two scrapes succeed", async () => {
    scrapeUrlsSequentially.mockResolvedValue([
      fulfilled("LG C4", "Name: LG C4\nPrice: $1299.99\nModel: OLED65C4\nResolution: 3840 x 2160\n", "$1299.99"),
      { status: "rejected", reason: new Error("blocked") },
    ]);
    const res = await request(app).post("/api/compare").send({ urls: [BB, CC] });
    expect(res.status).toBe(502);
    expect(res.body.failedUrls).toEqual([CC]);
    expect(generateAiComparison).not.toHaveBeenCalled();
  });

  it("sends a thin stub to the LLM instead of a 404 body and prefers the scraped price", async () => {
    const good = "Name: Hisense 65 U88\nPrice: $1599.99\nModel: 65U88QG\nResolution: 4K\nRefresh Rate: 165 Hz\n";
    scrapeUrlsSequentially.mockResolvedValue([
      fulfilled("Page not found", "Failed to extract text. HTTP 404 not found. Related Air 3S Weight: 720 g", null),
      fulfilled("Hisense 65 4K TV", good, "$1599.99"),
    ]);
    generateAiComparison.mockImplementation(async (payload: Array<{ title: string; url: string; retailerText: string }>) => ({
      aiSummary: "Compare",
      deviceType: "television",
      products: payload.map((p) => ({
        name: p.title,
        url: p.url,
        retailer: "other",
        price: "$1999.00",
        rawSpecs: [{ label: "Resolution", value: "4K" }],
      })),
      keyDifferences: [],
      groupedSpecs: {},
    }));

    const res = await request(app).post("/api/compare").send({ urls: [BB, LEON] });
    expect(res.status).toBe(200);
    const payload = generateAiComparison.mock.calls[0][0] as Array<{ retailerText: string; title: string }>;
    expect(payload[0].retailerText).toContain("SCRAPE_STATUS: thin");
    expect(payload[0].retailerText).not.toContain("720");
    expect(payload[1].retailerText).toContain("165 Hz");
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.products[1].price).toBe("$1599.99");
    expect(res.body.failedUrls).toEqual([]);
  });

  it("accepts exactly three distinct retailer URLs", async () => {
    const text = "Name: TV\nPrice: $999.99\nModel: ABC123\nResolution: 4K\nRefresh Rate: 120 Hz\n";
    scrapeUrlsSequentially.mockResolvedValue([
      fulfilled("LG C4 OLED TV", text, "$999.99"),
      fulfilled("Samsung QLED TV", text, "$1099.99"),
      fulfilled("Sony Bravia OLED TV", text, "$1199.99"),
    ]);
    generateAiComparison.mockImplementation(async (payload: Array<{ title: string; url: string }>) => ({
      aiSummary: "3-up",
      products: payload.map((p) => ({ name: p.title, url: p.url, price: "$1", rawSpecs: [] })),
      keyDifferences: [],
      groupedSpecs: {},
    }));
    const res = await request(app).post("/api/compare").send({ urls: [BB, CC, LEON] });
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(3);
    expect(scrapeUrlsSequentially).toHaveBeenCalledTimes(1);
    expect(scrapeUrlsSequentially.mock.calls[0][0]).toHaveLength(3);
  });
});
