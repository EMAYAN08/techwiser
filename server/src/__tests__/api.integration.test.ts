import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /api/compare validation", () => {
  it("rejects missing urls", async () => {
    const res = await request(app).post("/api/compare").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2/i);
  });

  it("rejects a single url", async () => {
    const res = await request(app)
      .post("/api/compare")
      .send({ urls: ["https://www.bestbuy.ca/en-ca/product/x/18391154"] });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/test-scrape validation", () => {
  it("rejects empty payload", async () => {
    const res = await request(app).post("/api/test-scrape").send({ urls: [] });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/barcode validation", () => {
  it("rejects missing code", async () => {
    const res = await request(app).post("/api/barcode").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/explain-spec validation", () => {
  it("rejects incomplete payload", async () => {
    const res = await request(app).post("/api/explain-spec").send({ productNames: ["A"] });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/alternatives validation", () => {
  it("rejects missing products", async () => {
    const res = await request(app).post("/api/alternatives").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/resolve-names validation", () => {
  it("rejects empty names", async () => {
    const res = await request(app).post("/api/resolve-names").send({ names: [] });
    expect(res.status).toBe(400);
  });
});
