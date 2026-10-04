import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("compare request behaviour", () => {
  it("rejects non-arrays, blanks, mixed types, and non-http schemes before scraping", async () => {
    const cases: Array<{ body: unknown; match: RegExp }> = [
      { body: { urls: "https://www.bestbuy.ca/a" }, match: /at least 2/i },
      { body: { urls: ["", ""] }, match: /valid http/i },
      { body: { urls: ["https://www.bestbuy.ca/en-ca/product/a/1", ""] }, match: /valid http/i },
      { body: { urls: ["https://www.bestbuy.ca/en-ca/product/a/1", 18391154] }, match: /valid http/i },
      { body: { urls: ["ftp://www.bestbuy.ca/en-ca/product/a/1", "https://www.bestbuy.ca/en-ca/product/b/2"] }, match: /valid http/i },
      { body: { urls: ["javascript:alert(1)", "https://www.bestbuy.ca/en-ca/product/b/2"] }, match: /valid http/i },
      {
        body: {
          urls: [
            "https://www.bestbuy.ca/en-ca/product/a/11111",
            "https://www.bestbuy.ca/en-ca/product/b/22222",
            "https://www.bestbuy.ca/en-ca/product/c/33333",
            "https://www.bestbuy.ca/en-ca/product/d/44444",
          ],
        },
        match: /maximum of 3/i,
      },
    ];

    for (const entry of cases) {
      const res = await request(app).post("/api/compare").send(entry.body as object);
      expect(res.status, JSON.stringify(entry.body)).toBe(400);
      expect(res.body.error).toMatch(entry.match);
    }
  });

  it("treats www and trailing-slash copies as one product", async () => {
    const a = "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154";
    const b = "https://bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154/";
    const res = await request(app).post("/api/compare").send({ urls: [a, b] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/distinct/i);
  });
});

describe("compare progress polling", () => {
  it("stays idle for missing and malformed ids", async () => {
    const missing = await request(app).get("/api/compare/progress/not-a-real-id-123");
    expect(missing.status).toBe(200);
    expect(missing.body.stage).toBe("idle");

    const short = await request(app).get("/api/compare/progress/abc");
    expect(short.status).toBe(200);
    expect(short.body.stage).toBe("idle");
  });
});

describe("health payload", () => {
  it("advertises the parallel scrape cap", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.scrape.concurrency).toBe(3);
    expect(typeof res.body.uptimeSec).toBe("number");
  });
});

describe("other client calls that should fail closed", () => {
  it("rejects blank barcode and blank name resolution", async () => {
    const barcode = await request(app).post("/api/barcode").send({ code: "   " });
    expect(barcode.status).toBe(400);
    const names = await request(app).post("/api/resolve-names").send({});
    expect(names.status).toBe(400);
  });
});
