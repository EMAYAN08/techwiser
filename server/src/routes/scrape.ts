import { Router, Request, Response } from "express";
import { partitionScrapeResults, scrapeUrlsSequentially } from "../services/scraper";

const router = Router();

router.post("/test-scrape", async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: "An array of URLs is required." });
      return;
    }

    console.log(`Starting TEST scrape for ${urls.length} URLs...`);

    const scrapeResults = await scrapeUrlsSequentially(urls);
    const { scrapedData, failedUrls } = partitionScrapeResults(urls, scrapeResults);

    res.json({ data: scrapedData, failedUrls });
  } catch (error: unknown) {
    console.error("Unexpected error in /api/test-scrape:", error);
    res.status(500).json({ error: "An unexpected error occurred during test scrape." });
  }
});

export default router;
