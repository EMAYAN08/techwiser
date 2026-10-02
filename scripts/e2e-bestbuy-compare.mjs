#!/usr/bin/env node
/**
 * End-to-end / UAT helper for SpecMatch comparison using official Best Buy Canada URLs.
 * Read-only: never Add to Cart / Sign In.
 *
 * Usage:
 *   node scripts/e2e-bestbuy-compare.mjs [--base http://127.0.0.1:3000] [--full-compare]
 */
const IPHONE =
  "https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154";
const PIXEL =
  "https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const base = (arg("--base", process.env.API_BASE || "http://127.0.0.1:3000")).replace(/\/$/, "");
const fullCompare = process.argv.includes("--full-compare");

async function main() {
  const report = {
    startedAt: new Date().toISOString(),
    base,
    urls: [IPHONE, PIXEL],
    steps: [],
  };

  // 1) Health
  const healthRes = await fetch(`${base}/api/health`);
  const health = await healthRes.json();
  report.steps.push({ step: "health", status: healthRes.status, body: health });
  if (!healthRes.ok) throw new Error("Health check failed");

  // 2) Direct Best Buy API (official JSON — same path server uses)
  for (const url of [IPHONE, PIXEL]) {
    const sku = url.match(/\/(\d{5,})\/?$/)[1];
    const apiUrl = `https://www.bestbuy.ca/api/v2/json/product/${sku}`;
    const bb = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-CA",
      },
    });
    const json = bb.ok ? await bb.json() : null;
    report.steps.push({
      step: "bestbuy_official_api",
      url,
      sku,
      http: bb.status,
      name: json?.name || null,
      price: json?.salePrice ?? json?.regularPrice ?? null,
    });
    if (!bb.ok) throw new Error(`Best Buy API ${bb.status} for ${sku}`);
  }

  // 3) Server test-scrape (no LLM)
  const scrapeRes = await fetch(`${base}/api/test-scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: [IPHONE, PIXEL] }),
  });
  const scrapeBody = await scrapeRes.json();
  report.steps.push({
    step: "test_scrape",
    status: scrapeRes.status,
    productCount: scrapeBody?.data?.length ?? 0,
    titles: (scrapeBody?.data || []).map((d) => d.title),
    prices: (scrapeBody?.data || []).map((d) => d.priceText),
    failedUrls: scrapeBody?.failedUrls || [],
  });
  if (!scrapeRes.ok) throw new Error(`test-scrape failed: ${scrapeRes.status}`);
  if ((scrapeBody?.data?.length || 0) < 2) throw new Error("test-scrape returned < 2 products");

  // 4) Optional full AI compare (needs OPENAI_API_KEY or GEMINI on server)
  if (fullCompare) {
    const cmpRes = await fetch(`${base}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [IPHONE, PIXEL] }),
    });
    const cmpBody = await cmpRes.json().catch(() => ({}));
    report.steps.push({
      step: "full_compare",
      status: cmpRes.status,
      productNames: (cmpBody?.data?.products || []).map((p) => p.name),
      hasAiSummary: Boolean(cmpBody?.data?.aiSummary),
      keyDifferences: (cmpBody?.data?.keyDifferences || []).length,
      error: cmpBody?.error || null,
    });
    if (!cmpRes.ok) {
      report.fullCompareFailed = true;
      console.error("Full compare failed (likely missing LLM API key on server):", cmpBody?.error);
    }
  }

  report.ok = true;
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2));
  process.exit(1);
});
