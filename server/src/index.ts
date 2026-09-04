import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { scrapeUrl } from './services/scraper';
import { generateComparison, explainSpec } from './services/llm';

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

    // 1. Scrape Retailer URLs in parallel
        // 1. Scrape Retailer URLs sequentially to avoid triggering strict anti-bot rate limits (like Akamai returning 403 on parallel requests)
    const scrapeResults = [];
    for (const url of urls) {
      scrapeResults.push(await Promise.allSettled([scrapeUrl(url)]).then(res => res[0]));
      // Add a 1.5 second delay between requests to avoid rate limits
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    const scrapedData: {url: string, retailerText: string, imageUrl: string | null, title: string, }[] = [];
    const failedUrls: string[] = [];

    scrapeResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        scrapedData.push({ 
          url: urls[index], 
          retailerText: result.value.rawText, 
          imageUrl: result.value.imageUrl,
          title: result.value.title,
          
        });
      } else {
        console.error(`Failed to scrape ${urls[index]}:`, result.reason);
        failedUrls.push(urls[index]);
      }
    });

    if (scrapedData.length < 2) {
      res.status(502).json({ error: 'Failed to scrape enough URLs for a comparison.', failedUrls });
      return;
    }

// 2. Extract and Compare using OpenRouter (Single API Call)
    console.log(`Sending ${scrapedData.length} multi-source payloads to OpenRouter...`);
    let comparisonResult: any;
    try {
      comparisonResult = await generateComparison(scrapedData.map(d => ({ 
        url: d.url, 
        retailerText: d.retailerText,
        
        title: d.title
      })));
    } catch (llmError: unknown) {
      console.error('LLM extraction error:', llmError);
      res.status(500).json({ error: 'Failed to parse specifications and compare products via AI.' });
      return;
    }

    // 4. Add IDs and structure metadata
    comparisonResult.id = Date.now().toString();
    comparisonResult.createdAt = new Date().toISOString();
    
    const RETAILER_COLORS: Record<string, string> = {
      "bestbuy": "#003B64",
      "amazon": "#FF9900",
      "canadacomputers": "#E31837",
      "memoryexpress": "#005BAA",
      "newegg": "#E2241B",
      "staples": "#CC0000",
      "thesource": "#E4002B",
      "costco": "#005BAA",
      "walmart": "#0071CE",
    };

    comparisonResult.products = comparisonResult.products.map((p: any, i: number) => {
      p.id = `product-${i}`;
      p.retailerColor = RETAILER_COLORS[p.retailer?.toLowerCase().replace(/[^a-z]/g, '')] || "#333333";
      // Inject the extracted image URL from scraping phase (fuzzy match url if needed)
      const matchedData = scrapedData[i]; 
      p.imageUrl = matchedData?.imageUrl || null;
      p.url = matchedData?.url || p.url; // Use original exact URL
      return p;
    });

    res.json({ data: comparisonResult, failedUrls });
  } catch (error: unknown) {
    console.error('Unexpected error in /api/compare:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

app.post('/api/test-scrape', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'An array of URLs is required.' });
      return;
    }

    console.log(`Starting TEST scrape for ${urls.length} URLs...`);

        // 1. Scrape Retailer URLs sequentially to avoid triggering strict anti-bot rate limits (like Akamai returning 403 on parallel requests)
    const scrapeResults = [];
    for (const url of urls) {
      scrapeResults.push(await Promise.allSettled([scrapeUrl(url)]).then(res => res[0]));
      // Add a 1.5 second delay between requests to avoid rate limits
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    const scrapedData: {url: string, retailerText: string, imageUrl: string | null, title: string, }[] = [];
    const failedUrls: string[] = [];

    scrapeResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        scrapedData.push({ 
          url: urls[index], 
          retailerText: result.value.rawText, 
          imageUrl: result.value.imageUrl,
          title: result.value.title,
          
        });
      } else {
        console.error(`Failed to scrape ${urls[index]}:`, result.reason);
        failedUrls.push(urls[index]);
      }
    });

    res.json({ data: scrapedData, failedUrls });
  } catch (error: unknown) {
    console.error('Unexpected error in /api/test-scrape:', error);
    res.status(500).json({ error: 'An unexpected error occurred during test scrape.' });
  }
});

app.post('/api/explain-spec', async (req: Request, res: Response) => {
  try {
    const { productNames, specLabel, specValues } = req.body;
    
    if (!productNames || !Array.isArray(productNames) || !specLabel || !specValues || !Array.isArray(specValues)) {
      res.status(400).json({ error: 'Invalid payload. Required: productNames (array), specLabel (string), specValues (array).' });
      return;
    }

    const explanation = await explainSpec(productNames, specLabel, specValues);
    res.json(explanation);
  } catch (error: unknown) {
    console.error('Unexpected error in /api/explain-spec:', error);
    res.status(500).json({ error: 'An unexpected error occurred while explaining spec.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
