import { Router, Request, Response } from "express";
import { RETAILER_COLORS } from "../config/constants";
import { generateOpenAIComparison } from "../services/openai";
import { partitionScrapeResults, scrapeUrlsSequentially } from "../services/scraper";

const router = Router();

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

    console.log(`Sending ${scrapedData.length} multi-source payloads to OpenAI...`);
    let comparisonResult: any;
    try {
      comparisonResult = await generateOpenAIComparison(
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
      const matchedData = scrapedData[i];
      p.imageUrl = matchedData?.imageUrl || null;
      p.url = matchedData?.url || p.url;
      return p;
    });

    res.json({ data: comparisonResult, failedUrls });
  } catch (error: unknown) {
    console.error("Unexpected error in /api/compare:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

export default router;
