import type { ScrapedProduct, ScrapeResult } from "../../types/scrape";
import { extractRankedPriceFromHtml, extractShopifyPriceFromHtml, formatDisplayPrice, pricesFromOffers } from "../../lib/price";
import { scrapeBestBuyApi } from "./bestbuy";
import { scrapeDirectHtml } from "./direct";
import { isRichScrape, isUsableScrape, scrapeRetailerFastPath } from "./retailers";

async function extractWithJina(url: string): Promise<Pick<ScrapeResult, "rawText" | "imageUrl" | "title">> {
  const jinaResponse = await fetch("https://r.jina.ai/" + url, {
    headers: {
      Accept: "application/json",
      "X-Return-Format": "markdown",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!jinaResponse.ok) {
    throw new Error(`Jina returned ${jinaResponse.status}`);
  }

  const jsonData = await jinaResponse.json();
  const data = jsonData.data;

  return {
    rawText: data?.content || data?.text || "",
    title: data?.title || "",
    imageUrl: data?.image || null,
  };
}

async function extractHtmlExtras(
  url: string,
  rawText: string,
  imageUrl: string | null
): Promise<{ priceText: string | null; imageUrl: string | null }> {
  const htmlResponse = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(6000),
  });
  const html = await htmlResponse.text();

  let priceText: string | null = null;
  const priceMatch = html.match(
    /<meta\s+(?:property|name)=["'](?:product:price:amount|price)["']\s+content=["']([^"']+)["']/i
  );
  if (priceMatch && priceMatch[1]) {
    const currencyMatch = html.match(
      /<meta\s+(?:property|name)=["'](?:product:price:currency|currency)["']\s+content=["']([^"']+)["']/i
    );
    const currency = currencyMatch && currencyMatch[1] ? currencyMatch[1] : "$";
    priceText = currency + priceMatch[1];
  }

  if (!priceText) {
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const ld = JSON.parse(match[1]);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          const priced = pricesFromOffers(item.offers);
          if (priced) {
            priceText = priced;
            break;
          }
        }
      } catch (e) {}
      if (priceText) break;
    }
  }

  if (!priceText && url.includes("bestbuy")) {
    const bbPriceMatch = html.match(/class=["'][^"']*priceView-hero-price[^"']*["'][^>]*>.*?\$([0-9,.]+)/i);
    if (bbPriceMatch && bbPriceMatch[1]) {
      priceText = "$" + bbPriceMatch[1];
    }
  }

  if (!priceText) {
    priceText = extractRankedPriceFromHtml(html) || extractShopifyPriceFromHtml(html);
  } else {
    priceText = formatDisplayPrice(priceText) || priceText;
  }

  const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImageMatch && ogImageMatch[1]) {
    imageUrl = ogImageMatch[1];
  } else if (!imageUrl) {
    const mdImgMatch = rawText.match(/!\[.*?\]\((https:\/\/[^\)]+(?:jpg|png|webp|jpeg)[^\)]*)\)/i);
    if (mdImgMatch && mdImgMatch[1]) {
      imageUrl = mdImgMatch[1];
    }
  }

  return { priceText, imageUrl };
}

export function pythonScraperConfigured(): boolean {
  return Boolean(process.env.PYTHON_SCRAPER_URL && process.env.PYTHON_SCRAPER_URL.trim());
}

async function extractWithPythonScraper(url: string): Promise<{ rawText?: string; imageUrl?: string | null }> {
  if (!pythonScraperConfigured()) {
    console.log("[Python] skipped — PYTHON_SCRAPER_URL is unset (no localhost retry)");
    return {};
  }
  const rawPyUrl = process.env.PYTHON_SCRAPER_URL || "";
  const pyScraperUrl = rawPyUrl.replace(/\/+$/, "");
  const fetchUrl = `${pyScraperUrl}/scrape`;

  for (let attempt = 1; attempt <= 1; attempt++) {
    console.log(`Fetching Python Microservice at: ${fetchUrl} (attempt ${attempt})`);
    try {
      const pyRes = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(12_000),
      });
      if (pyRes.status === 429 || pyRes.status === 503) {
        console.log(`Python Scraper failed HTTP status: ${pyRes.status}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      if (pyRes.ok) {
        const pyData = await pyRes.json();
        console.log("Python Scraper responded with status:", pyData.status, "Data length:", pyData.data ? pyData.data.length : 0);
        if (pyData.status === "success" && pyData.data && pyData.data.length > 100) {
          return {
            rawText: "RETAILER DATA (FROM SCRAPLING):\n" + pyData.data,
            imageUrl: pyData.imageUrl || null,
          };
        }
        console.log("Python Scraper returned error or insufficient data. Status:", pyData.status, "Message:", pyData.message);
        return {};
      }
      console.log("Python Scraper failed HTTP status:", pyRes.status);
      return {};
    } catch (err: any) {
      console.log("Python Scraper request failed:", err.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  return {};
}

function titleFromUrlSlug(url: string): string {
  const urlObj = new URL(url);
  const parts = urlObj.pathname
    .split("/")
    .filter((p) => p.length > 0 && p.toLowerCase() !== "en-ca" && p.toLowerCase() !== "product" && p.toLowerCase() !== "dp" && isNaN(Number(p)));
  // Grab the longest string segment, which is almost always the SEO product slug
  const slug = parts.reduce((a, b) => (a.length > b.length ? a : b), "");
  if (slug) {
    return decodeURIComponent(slug).replace(/-/g, " ");
  }
  return "";
}

function finishScrape(
  rawText: string,
  imageUrl: string | null,
  title: string,
  priceText: string | null,
  priceSource?: ScrapeResult["priceSource"]
): ScrapeResult {
  let text = rawText;
  if (priceText && !text.includes(priceText)) {
    text = "META PRICE FOUND: " + priceText + "\n\n" + text;
  }
  return { rawText: text, imageUrl, title, priceText, priceSource: priceText ? priceSource : undefined };
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  let rawText = "";
  let imageUrl: string | null = null;
  let priceText: string | null = null;
  let title = "";
  let priceSource: ScrapeResult["priceSource"] = undefined;

  const adopt = (next: ScrapeResult | null | undefined) => {
    if (!next?.rawText) return;
    rawText = next.rawText;
    if (next.title) title = next.title;
    if (next.imageUrl) imageUrl = next.imageUrl;
    if (next.priceText) priceText = next.priceText;
    if (next.priceSource) priceSource = next.priceSource;
  };

  try {
    try {
      const bb = await scrapeBestBuyApi(url);
      if (bb && isRichScrape({ rawText: bb.rawText, title: bb.title, priceText: bb.priceText })) {
        return finishScrape(bb.rawText, bb.imageUrl, bb.title, bb.priceText, "bestbuy-api");
      }
    } catch (bbError: unknown) {
      const message = bbError instanceof Error ? bbError.message : String(bbError);
      console.log(`Best Buy API warning for ${url}:`, message);
    }

    try {
      const fast = await scrapeRetailerFastPath(url);
      const pageFastPath = /canadacomputers\.com|costco\.ca|amazon\./i.test(url);
      if (fast && (isRichScrape(fast) || (pageFastPath && isUsableScrape(fast)))) {
        console.log(`[Scrape] early-stop fast path for ${url}`);
        return finishScrape(fast.rawText, fast.imageUrl, fast.title, fast.priceText || null, fast.priceSource || "retailer-html");
      }
      adopt(fast);
    } catch (fastError: unknown) {
      const message = fastError instanceof Error ? fastError.message : String(fastError);
      console.log(`[Retailer] warning for ${url}:`, message);
    }

    if (!isUsableScrape({ rawText, title, priceText })) {
      try {
        const direct = await scrapeDirectHtml(url);
        if (direct?.rawText) adopt({ ...direct, priceSource: direct.priceText ? "scrape" : undefined });
      } catch (directError: unknown) {
        const message = directError instanceof Error ? directError.message : String(directError);
        console.log(`Direct HTML scrape failed for ${url}:`, message);
      }
    }

    if (!isUsableScrape({ rawText, title, priceText })) {
      try {
        const jina = await extractWithJina(url);
        if (jina.rawText && !jina.rawText.startsWith("Failed")) {
          rawText = jina.rawText;
          if (jina.title) title = jina.title;
          if (jina.imageUrl) imageUrl = jina.imageUrl;
        }
      } catch (jinaError: unknown) {
        const message = jinaError instanceof Error ? jinaError.message : String(jinaError);
        console.log(`Jina extraction warning for ${url}:`, message);
        if (!rawText) rawText = "Failed to extract text.";
      }
    }

    if (!priceText) {
      try {
        const html = await extractHtmlExtras(url, rawText, imageUrl);
        priceText = html.priceText;
        imageUrl = html.imageUrl;
        if (priceText && !priceSource) priceSource = "scrape";
      } catch (imgError: unknown) {
        const message = imgError instanceof Error ? imgError.message : String(imgError);
        console.log(`HTML fallback warning for ${url}:`, message);
      }
    }

    if (!isRichScrape({ rawText, title, priceText }) && (rawText.length < 500 || rawText.startsWith("Failed to extract"))) {
      try {
        const pyData = await extractWithPythonScraper(url);
        if (pyData.rawText) rawText = pyData.rawText;
        if (pyData.imageUrl && !imageUrl) imageUrl = pyData.imageUrl;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Python Scraper unavailable:", message);
      }
      if (!title) {
        try {
          const slugTitle = titleFromUrlSlug(url);
          if (slugTitle) title = slugTitle;
        } catch (e) {
          console.log("Failed to parse URL for title fallback", e);
        }
      }
    }

    return finishScrape(rawText, imageUrl, title, priceText, priceSource || (priceText ? "scrape" : undefined));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Scrape failed for ${url}:`, message);
    return { rawText: "Failed to scrape.", imageUrl: null, title: "" };
  }
}

export const SCRAPE_CONCURRENCY = 3;

/** Run async work with a small pool, preserving input order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const pool = Math.max(1, Math.min(limit, items.length || 1));
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: pool }, () => run()));
  return results;
}

/**
 * Historical name. URLs are scraped together (concurrency capped) with no artificial gap.
 * The returned array stays in input order.
 */
export async function scrapeUrlsSequentially(urls: string[]) {
  return mapWithConcurrency(urls, SCRAPE_CONCURRENCY, async (url) => {
    try {
      const value = await scrapeUrl(url);
      return { status: "fulfilled" as const, value };
    } catch (reason) {
      return { status: "rejected" as const, reason };
    }
  });
}


export function partitionScrapeResults(
  urls: string[],
  scrapeResults: PromiseSettledResult<ScrapeResult>[]
): { scrapedData: ScrapedProduct[]; failedUrls: string[] } {
  const scrapedData: ScrapedProduct[] = [];
  const failedUrls: string[] = [];

  scrapeResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      scrapedData.push({
        url: urls[index],
        retailerText: result.value.rawText,
        imageUrl: result.value.imageUrl,
        title: result.value.title,
        priceText: result.value.priceText || null,
        priceSource: result.value.priceSource,
      });
    } else {
      console.error(`Failed to scrape ${urls[index]}:`, result.reason);
      failedUrls.push(urls[index]);
    }
  });

  return { scrapedData, failedUrls };
}
