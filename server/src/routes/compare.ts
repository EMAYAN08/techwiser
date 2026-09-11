import { Router, Request, Response } from "express";
import { RETAILER_COLORS } from "../config/constants";
import { extractPriceFromText, formatDisplayPrice, isMissingPrice } from "../lib/price";
import { generateAiComparison } from "../services/ai";
import { partitionScrapeResults, scrapeUrlsSequentially } from "../services/scraper";

const router = Router();

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

function isBestBuyCanada(url?: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.toLowerCase().includes("bestbuy.ca");
  } catch {
    return /bestbuy\.ca/i.test(url);
  }
}

router.post("/compare", async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length < 2) {
      res.status(400).json({ error: "An array of at least 2 URLs is required." });
      return;
    }

    console.log(`Starting comparison for ${urls.length} URLs...`);

    // Scrape retailer URLs sequentially to avoid triggering strict anti-bot rate limits
    const scrapeResults = await scrapeUrlsSequentially(urls);
    const { scrapedData, failedUrls } = partitionScrapeResults(urls, scrapeResults);

    if (scrapedData.length < 2) {
      res.status(502).json({ error: "Failed to scrape enough URLs for a comparison.", failedUrls });
      return;
    }

    console.log(`Sending ${scrapedData.length} multi-source payloads to the LLM...`);
    let comparisonResult: any;
    try {
      comparisonResult = await generateAiComparison(
        scrapedData.map((d) => ({
          url: d.url,
          retailerText: d.retailerText,
          title: d.title,
        }))
      );
    } catch (llmError: unknown) {
      console.error("LLM extraction error:", llmError);
      res.status(500).json({ error: "Failed to parse specifications and compare products via AI." });
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
      const preferBestBuyApi =
        isBestBuyCanada(matchedData?.url || p.url) &&
        matchedData?.priceSource === "bestbuy-api" &&
        Boolean(scrapedPrice);

      if (preferBestBuyApi) {
        console.log(`[Price] Best Buy API ${scrapedPrice} overrides LLM ${p.price || "n/a"} for ${matchedData?.url}`);
        p.price = scrapedPrice;
      } else if (isMissingPrice(p.price) && scrapedPrice) {
        p.price = scrapedPrice;
      } else {
        p.price = llmPrice || scrapedPrice || p.price || "N/A";
      }
      return p;
    });

    res.json({ data: comparisonResult, failedUrls });
  } catch (error: unknown) {
    console.error("Unexpected error in /api/compare:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

export default router;
