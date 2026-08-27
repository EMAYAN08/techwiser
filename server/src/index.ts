import dotenv from 'dotenv';
dotenv.config(); // Must be called BEFORE importing our own services

import express, { Request, Response } from 'express';
import cors from 'cors';
import { scrapeUrl } from './services/scraper';
import { generateComparison } from './services/gemini';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

app.post('/api/compare', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length < 2) {
      res.status(400).json({ error: 'An array of at least 2 URLs is required.' });
      return;
    }

    console.log(`Starting comparison for ${urls.length} URLs...`);

    // 1. Scrape URLs in parallel
    const scrapeResults = await Promise.allSettled(urls.map(url => scrapeUrl(url)));
    
    const scrapedData: {url: string, rawText: string, imageUrl: string | null}[] = [];
    const failedUrls: string[] = [];

    scrapeResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        scrapedData.push({ url: urls[index], rawText: result.value.rawText, imageUrl: result.value.imageUrl });
      } else {
        console.error(`Failed to scrape ${urls[index]}:`, result.reason);
        failedUrls.push(urls[index]);
      }
    });

    if (scrapedData.length < 2) {
      res.status(502).json({ error: 'Failed to scrape enough URLs for a comparison.', failedUrls });
      return;
    }

    // 2. Extract and Compare using Gemini
    console.log(`Sending ${scrapedData.length} successfully scraped pages to Gemini...`);
    let comparisonResult: any;
    try {
      // Pass only rawText to generateComparison so Gemini doesn't get confused
      comparisonResult = await generateComparison(scrapedData.map(d => ({ url: d.url, rawText: d.rawText })));
    } catch (geminiError: unknown) {
      console.error('Gemini extraction error:', geminiError);
      res.status(500).json({ error: 'Failed to parse specifications and compare products via AI.' });
      return;
    }

    // 3. Add IDs and structure metadata
    comparisonResult.id = Date.now().toString();
    comparisonResult.createdAt = new Date().toISOString();
    
    // Assign IDs to products and match retailer colors (from PRD spec)
    const RETAILER_COLORS: Record<string, string> = {
      "bestbuy": "#003B64",
      "amazon": "#FF9900",
      "canadacomputers": "#E31837",
      "memoryexpress": "#005BAA",
      "newegg": "#E2241B",
      "staples": "#CC0000",
      "thesource": "#E4002B",
    };

    comparisonResult.products = comparisonResult.products.map((p: any, i: number) => {
      p.id = `product-${i}`;
      p.retailerColor = RETAILER_COLORS[p.retailer?.toLowerCase()] || "#333333";
      // Inject the extracted image URL from scraping phase
      const matchedData = scrapedData.find(d => d.url === p.url);
      p.imageUrl = matchedData?.imageUrl || null;
      return p;
    });

    res.json({ data: comparisonResult, failedUrls });
  } catch (error: unknown) {
    console.error('Unexpected error in /api/compare:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
