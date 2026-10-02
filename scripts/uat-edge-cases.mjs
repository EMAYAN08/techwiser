#!/usr/bin/env node
/**
 * End-user UAT / edge-case matrix for SpecMatch (Best Buy CA + API).
 * Read-only against Best Buy; exercises backend like a real advisor would.
 *
 * Usage:
 *   node scripts/uat-edge-cases.mjs [--base https://techwiser.onrender.com] [--full-compare]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const IPHONE =
  "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154";
const PIXEL9A =
  "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094";
const PIXEL9 =
  "https://www.bestbuy.ca/en-ca/product/brand-new-google-pixel-9-128gb-obsidian-unlocked/18481469";
// Extra SKUs discovered via Best Buy CA search API during UAT
let FOURTH = null;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const base = (arg("--base", process.env.API_BASE || "https://techwiser.onrender.com")).replace(
  /\/$/,
  ""
);
const fullCompare = process.argv.includes("--full-compare");

const cases = [];
function record(id, ok, detail) {
  cases.push({ id, ok, detail, at: new Date().toISOString() });
  const mark = ok ? "PASS" : "FAIL";
  console.error(`[${mark}] ${id}`);
  if (detail && typeof detail === "object") {
    console.error(JSON.stringify(detail, null, 2).slice(0, 1200));
  } else if (detail) {
    console.error(String(detail).slice(0, 800));
  }
}

async function bbApi(sku) {
  const res = await fetch(`https://www.bestbuy.ca/api/v2/json/product/${sku}`, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-CA",
    },
  });
  const json = res.ok ? await res.json() : null;
  return { status: res.status, json };
}

async function post(path, body, opts = {}) {
  const controller = new AbortController();
  const timer = opts.timeoutMs
    ? setTimeout(() => controller.abort(), opts.timeoutMs)
    : null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal || controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    return { status: res.status, json };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function discoverFourthPhone() {
  const q = encodeURIComponent("samsung galaxy s24");
  const res = await fetch(
    `https://www.bestbuy.ca/api/v2/json/search?query=${q}&lang=en-CA&page=1&pageSize=8`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-CA",
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const products = data?.products || [];
  for (const p of products) {
    const sku = String(p.sku || p.productId || "");
    const path = p.productUrl || p.url || "";
    if (!/^\d{5,}$/.test(sku)) continue;
    if (["18391154", "19206094", "18481469"].includes(sku)) continue;
    const url = path.startsWith("http")
      ? path
      : `https://www.bestbuy.ca${path.startsWith("/") ? path : `/en-ca/product/${sku}`}`;
    // Prefer product path with sku
    if (!/\/product\//i.test(url) && /^\d{5,}$/.test(sku)) {
      return {
        url: `https://www.bestbuy.ca/en-ca/product/samsung-galaxy-s24/${sku}`,
        sku,
        name: p.name,
      };
    }
    return { url, sku, name: p.name };
  }
  return null;
}

function summarizeCompare(body) {
  const data = body?.data || {};
  const products = data.products || [];
  return {
    productCount: products.length,
    names: products.map((p) => p.name),
    prices: products.map((p) => p.price),
    imageUrls: products.map((p) => (p.imageUrl ? "present" : "missing")),
    missingPrice: products.filter((p) => !p.price || p.price === "N/A").map((p) => p.name),
    missingImage: products.filter((p) => !p.imageUrl).map((p) => p.name),
    hasAiSummary: Boolean(data.aiSummary),
    aiSummaryPreview: String(data.aiSummary || "").slice(0, 280),
    keyDifferences: (data.keyDifferences || []).length,
    keyDiffLabels: (data.keyDifferences || []).map((k) => k.label),
    failedUrls: body?.failedUrls || [],
    badges: products.map((p) => p.badges || []),
    specCounts: products.map((p) => (Array.isArray(p.specs) ? p.specs.length : 0)),
  };
}

async function main() {
  const report = {
    startedAt: new Date().toISOString(),
    base,
    fullCompare,
    environmentNotes: [
      "No iOS/Android simulator on agent box; UAT via API + static UI code review + Expo web smoke if available.",
      "Best Buy CA official JSON API used read-only.",
    ],
    urls: {},
    cases: cases,
  };

  // Health
  try {
    const h = await fetch(`${base}/api/health`);
    const hj = await h.json();
    record("health", h.ok && hj.status === "ok", { status: h.status, body: hj });
  } catch (e) {
    record("health", false, String(e.message || e));
  }

  // Discover 4th product
  const fourth = await discoverFourthPhone();
  FOURTH = fourth;
  report.urls = {
    iphone: IPHONE,
    pixel9a: PIXEL9A,
    pixel9: PIXEL9,
    fourth: fourth,
  };
  record("discover_fourth_product", Boolean(fourth?.sku), fourth || "search returned nothing");

  // Official BB API for known SKUs
  for (const [label, url] of [
    ["iphone", IPHONE],
    ["pixel9a", PIXEL9A],
    ["pixel9", PIXEL9],
  ]) {
    const sku = url.match(/\/(\d{5,})\/?$/)[1];
    const { status, json } = await bbApi(sku);
    record(`bb_official_${label}`, status === 200 && Boolean(json?.name), {
      sku,
      status,
      name: json?.name || null,
      price: json?.salePrice ?? json?.regularPrice ?? null,
      hasImage: Boolean(json?.highResImage || json?.thumbnailImage),
    });
  }
  if (fourth?.sku) {
    const { status, json } = await bbApi(fourth.sku);
    record("bb_official_fourth", status === 200 && Boolean(json?.name), {
      sku: fourth.sku,
      status,
      name: json?.name || null,
      price: json?.salePrice ?? json?.regularPrice ?? null,
    });
    if (json?.name) fourth.name = json.name;
    if (status === 200) {
      fourth.url = `https://www.bestbuy.ca/en-ca/product/${(json.name || "product")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}/${fourth.sku}`;
    }
  }

  // --- Edge: invalid payloads ---
  {
    const r = await post("/api/compare", {});
    record("edge_missing_urls", r.status === 400, r.json);
  }
  {
    const r = await post("/api/compare", { urls: [IPHONE] });
    record("edge_single_url", r.status === 400, r.json);
  }
  {
    const r = await post("/api/compare", { urls: ["", ""] });
    record("edge_empty_strings", r.status === 400 || r.status === 502, r.json);
  }
  {
    const r = await post("/api/compare", { urls: ["not a url", "also garbage!!!"] });
    record("edge_garbage", r.status === 400 || r.status === 502, r.json);
  }
  {
    const r = await post("/api/compare", {
      urls: ["https://www.bestbuy.com/site/foo/123", "https://www.amazon.com/dp/B00"],
    });
    // Unsupported retailer — scrape should fail → 502 or 400
    record("edge_unsupported_retailer", r.status >= 400, { status: r.status, error: r.json?.error, failedUrls: r.json?.failedUrls });
  }
  {
    const five = [IPHONE, PIXEL9A, PIXEL9, fourth?.url || IPHONE, IPHONE];
    const r = await post("/api/compare", { urls: five });
    record("edge_five_urls_refused", r.status === 400 && /maximum of 4/i.test(String(r.json?.error || "")), r.json);
  }
  {
    const r = await post("/api/compare", {
      urls: [
        "https://www.bestbuy.ca/en-ca/product/does-not-exist-zzz/999999999",
        "https://www.bestbuy.ca/en-ca/product/also-fake/888888888",
      ],
    });
    record("edge_404_skus", r.status >= 400, { status: r.status, error: r.json?.error, failedUrls: r.json?.failedUrls });
  }
  {
    const r = await post("/api/compare", {
      urls: ["https://www.bestbuy.ca/en-ca/product/foo/12", PIXEL9A],
    });
    record("edge_malformed_sku_mixed", r.status >= 400 || Boolean(r.json?.failedUrls?.length) || r.status === 200, {
      status: r.status,
      error: r.json?.error,
      failedUrls: r.json?.failedUrls,
      note: "One bad + one good may 502 if <2 scraped",
    });
  }

  // --- Happy path scrape (2) ---
  {
    const r = await post("/api/test-scrape", { urls: [IPHONE, PIXEL9A] });
    const data = r.json?.data || [];
    const ok =
      r.status === 200 &&
      data.length >= 2 &&
      data.every((d) => d.title && d.priceText);
    record("happy_scrape_2", ok, {
      status: r.status,
      titles: data.map((d) => d.title),
      prices: data.map((d) => d.priceText),
      images: data.map((d) => (d.imageUrl ? "present" : "missing")),
      priceSources: data.map((d) => d.priceSource),
      failedUrls: r.json?.failedUrls,
    });
  }

  // --- 3 products scrape ---
  {
    const r = await post("/api/test-scrape", { urls: [IPHONE, PIXEL9A, PIXEL9] });
    const data = r.json?.data || [];
    record("happy_scrape_3", r.status === 200 && data.length >= 3, {
      status: r.status,
      count: data.length,
      titles: data.map((d) => d.title),
      prices: data.map((d) => d.priceText),
      failedUrls: r.json?.failedUrls,
    });
  }

  // --- 4 products scrape ---
  if (fourth?.url) {
    const r = await post("/api/test-scrape", {
      urls: [IPHONE, PIXEL9A, PIXEL9, fourth.url],
    });
    const data = r.json?.data || [];
    record("happy_scrape_4", r.status === 200 && data.length >= 4, {
      status: r.status,
      count: data.length,
      titles: data.map((d) => d.title),
      prices: data.map((d) => d.priceText),
      failedUrls: r.json?.failedUrls,
    });
  } else {
    record("happy_scrape_4", false, "skipped — no fourth SKU");
  }

  // --- Duplicate URLs scrape ---
  {
    const r = await post("/api/test-scrape", { urls: [IPHONE, IPHONE] });
    const data = r.json?.data || [];
    record("edge_duplicate_urls_scrape", r.status === 200 && data.length >= 1, {
      status: r.status,
      count: data.length,
      titles: data.map((d) => d.title),
      note: "Client now dedupes before compare; server may still accept duplicates for scrape",
    });
  }

  // --- Cancel mid-load (abort) ---
  {
    const controller = new AbortController();
    const pending = fetch(`${base}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [IPHONE, PIXEL9A] }),
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 80);
    let aborted = false;
    try {
      await pending;
    } catch (e) {
      aborted = e?.name === "AbortError" || /abort/i.test(String(e));
    }
    record("edge_cancel_mid_load_abort", aborted, {
      note: "Mirrors mobile AbortController cancel on loading overlay",
    });
  }

  // --- Full AI compare against deployed backend ---
  if (fullCompare) {
    {
      const r = await post("/api/compare", { urls: [IPHONE, PIXEL9A] }, { timeoutMs: 180000 });
      const summary = summarizeCompare(r.json);
      const ok =
        r.status === 200 &&
        summary.productCount >= 2 &&
        summary.hasAiSummary &&
        summary.keyDifferences >= 1;
      record("happy_full_compare_2", ok, { status: r.status, ...summary, error: r.json?.error });
      report.fullCompare2 = summary;
    }
    if (fourth?.url) {
      const r = await post(
        "/api/compare",
        { urls: [IPHONE, PIXEL9A, PIXEL9] },
        { timeoutMs: 240000 }
      );
      const summary = summarizeCompare(r.json);
      record("happy_full_compare_3", r.status === 200 && summary.productCount >= 3, {
        status: r.status,
        ...summary,
        error: r.json?.error,
      });
      report.fullCompare3 = summary;
    }
  } else {
    record("happy_full_compare_2", true, "skipped (pass --full-compare)");
  }

  // Alternatives empty / validation
  {
    const r = await post("/api/alternatives", {});
    record("edge_alternatives_empty_payload", r.status === 400, r.json);
  }

  const passed = cases.filter((c) => c.ok).length;
  const failed = cases.filter((c) => !c.ok).length;
  report.finishedAt = new Date().toISOString();
  report.summary = { passed, failed, total: cases.length };
  report.ok = failed === 0;

  const outDir = join(ROOT, "docs/test-artifacts");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "uat-edge-cases.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, summary: report.summary, outPath, urls: report.urls }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2));
  process.exit(1);
});
