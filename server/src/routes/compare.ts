import { Router, Request, Response } from "express";
import { RETAILER_COLORS } from "../config/constants";
import { extractPriceFromText, formatDisplayPrice, resolveProductPrice } from "../lib/price";
import { retailerTextForCompare } from "../lib/thinScrape";
import { generateAiComparison } from "../services/ai";
import { getCompareProgress, sanitizeCompareId, setCompareProgress } from "../services/compareProgress";
import { partitionScrapeResults, scrapeUrlsSequentially } from "../services/scraper";

const MAX_COMPARE_URLS = 3;

const router = Router();

router.get("/compare/progress/:id", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const id = sanitizeCompareId(req.params.id);
  res.json(getCompareProgress(id));
});

function urlsMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const norm = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.hostname.replace(/^www\./i, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
    } catch {
      return url.trim().toLowerCase().replace(/\/$/, "");
    }
  };
  return norm(a) === norm(b);
}

function matchScrapedProduct(product: any, scrapedData: any[], index: number) {
  const byUrl = scrapedData.find((d) => urlsMatch(d.url, product?.url));
  if (byUrl) return byUrl;
  const name = String(product?.name || "").toLowerCase();
  if (name) {
    const byTitle = scrapedData.find((d) => {
      const title = String(d.title || "").toLowerCase();
      return title && (title.includes(name.slice(0, 18)) || name.includes(title.slice(0, 18)));
    });
    if (byTitle) return byTitle;
  }
  return scrapedData[index];
}


router.post("/compare", async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length < 2) {
      res.status(400).json({ error: "An array of at least 2 URLs is required." });
      return;
    }

    if (urls.length > MAX_COMPARE_URLS) {
      res.status(400).json({ error: `A maximum of ${MAX_COMPARE_URLS} product URLs is allowed.` });
      return;
    }

    const invalid = urls.filter((u: unknown) => {
      if (typeof u !== "string" || !u.trim()) return true;
      try {
        const parsed = new URL(u.trim());
        return !["http:", "https:"].includes(parsed.protocol);
      } catch {
        return true;
      }
    });
    if (invalid.length) {
      res.status(400).json({ error: "All entries must be valid http(s) product URLs." });
      return;
    }

    const seen = new Set<string>();
    const uniqueUrls: string[] = [];
    for (const raw of urls as string[]) {
      try {
        const u = new URL(raw.trim());
        const key = `${u.hostname.replace(/^www\./i, "").toLowerCase()}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueUrls.push(raw.trim());
      } catch {
        uniqueUrls.push(raw.trim());
      }
    }
    if (uniqueUrls.length < 2) {
      res.status(400).json({ error: "Provide at least 2 distinct product URLs." });
      return;
    }

    console.log(`Starting comparison for ${uniqueUrls.length} URLs...`);
    const progressId = sanitizeCompareId(req.header("x-compare-id"));
    const wantStream = String(req.headers.accept || "").includes("text/event-stream");
    if (wantStream) {
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      if (typeof res.flushHeaders === "function") res.flushHeaders();
    }
    const note = (stage: string, message: string) => {
      setCompareProgress(progressId, stage, message);
      if (wantStream) {
        res.write(`event: progress\ndata: ${JSON.stringify({ stage, message })}\n\n`);
      }
    };
    const sendJson = (status: number, body: unknown) => {
      if (wantStream) {
        const event = status >= 400 ? "error" : "result";
        res.write(`event: ${event}\ndata: ${JSON.stringify(body)}\n\n`);
        res.end();
        return;
      }
      res.status(status).json(body);
    };

    note("scraping", `Fetching ${uniqueUrls.length} product pages...`);
    const scrapeResults = await scrapeUrlsSequentially(uniqueUrls);
    const { scrapedData, failedUrls } = partitionScrapeResults(uniqueUrls, scrapeResults);

    if (scrapedData.length < 2) {
      note("error", "Could not read enough product pages");
      sendJson(502, { error: "Failed to scrape enough URLs for a comparison.", failedUrls });
      return;
    }

    note("comparing", "Comparing specifications...");
    console.log(`Sending ${scrapedData.length} trimmed payloads to the LLM...`);
    let comparisonResult: any;
    try {
      comparisonResult = await generateAiComparison(
        scrapedData.map((d) => ({
          url: d.url,
          retailerText: retailerTextForCompare(d),
          title: d.title,
        }))
      );
    } catch (llmError: unknown) {
      console.error("LLM extraction error:", llmError);
      note("error", "Comparison failed");
      sendJson(500, { error: "Failed to parse specifications and compare products via AI." });
      return;
    }

    comparisonResult.id = Date.now().toString();
    comparisonResult.createdAt = new Date().toISOString();

    comparisonResult.products = comparisonResult.products.map((p: any, i: number) => {
      p.id = `product-${i}`;
      p.retailerColor = RETAILER_COLORS[p.retailer?.toLowerCase().replace(/[^a-z]/g, "")] || "#333333";
      const matchedData = matchScrapedProduct(p, scrapedData, i);
      p.imageUrl = matchedData?.imageUrl || p.imageUrl || null;
      p.url = matchedData?.url || p.url;
      const scrapedPrice =
        formatDisplayPrice(matchedData?.priceText) || extractPriceFromText(matchedData?.retailerText || "");
      const llmPrice = formatDisplayPrice(p.price);
      // Prefer scraped/API prices over LLM for all retailers (Costco drift, Shopify cents, BB API).
      const resolved = resolveProductPrice({ scrapedPrice, llmPrice, preferScraped: true });
      if (scrapedPrice && llmPrice && scrapedPrice !== llmPrice) {
        console.log(`[Price] scraped ${scrapedPrice} preferred over LLM ${llmPrice} for ${matchedData?.url || p.url}`);
      } else if (scrapedPrice && !llmPrice) {
        console.log(`[Price] scraped ${scrapedPrice} fills missing LLM price for ${matchedData?.url || p.url}`);
      }
      p.price = resolved;
      return p;
    });

    note("done", "Comparison ready");
    sendJson(200, { data: comparisonResult, failedUrls });
  } catch (error: unknown) {
    console.error("Unexpected error in /api/compare:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

export default router;
