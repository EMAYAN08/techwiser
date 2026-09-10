import type { ScrapedProduct, ScrapeResult } from "../../types/scrape";
import { scrapeBestBuyApi } from "./bestbuy";

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
          if (item.offers && item.offers.price) {
            priceText = "$" + item.offers.price;
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

async function extractWithPythonScraper(url: string): Promise<{ rawText?: string; imageUrl?: string | null }> {
  const rawPyUrl = process.env.PYTHON_SCRAPER_URL || "http://127.0.0.1:8000";
  const pyScraperUrl = rawPyUrl.replace(/\/+$/, ""); // strip trailing slash
  const fetchUrl = `${pyScraperUrl}/scrape`;
  console.log("Fetching Python Microservice at:", fetchUrl);
  const pyRes = await fetch(fetchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
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
  } else {
    console.log("Python Scraper failed HTTP status:", pyRes.status);
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

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  let rawText = "";
  let imageUrl: string | null = null;
  let priceText: string | null = null;
  let title = "";

  try {
    try {
      const bb = await scrapeBestBuyApi(url);
      if (bb) {
        rawText = bb.rawText;
        title = bb.title;
        imageUrl = bb.imageUrl;
        priceText = bb.priceText;
        if (priceText && !rawText.includes(priceText)) {
          rawText = "META PRICE FOUND: " + priceText + "\n\n" + rawText;
        }
        return { rawText, imageUrl, title, priceText };
      }
    } catch (bbError: any) {
      console.log(`Best Buy API warning for ${url}:`, bbError.message);
    }

    try {
      const jina = await extractWithJina(url);
      rawText = jina.rawText;
      title = jina.title;
      if (jina.imageUrl) {
        imageUrl = jina.imageUrl;
      }
    } catch (jinaError: any) {
      console.log(`Jina extraction warning for ${url}:`, jinaError.message);
      rawText = "Failed to extract text.";
    }

    try {
      const html = await extractHtmlExtras(url, rawText, imageUrl);
      priceText = html.priceText;
      imageUrl = html.imageUrl;
    } catch (imgError: any) {
      console.log(`HTML fallback warning for ${url}:`, imgError.message);
    }

    let finalTitle = title;
    const lowerTitle = finalTitle.toLowerCase();
    if (
      !finalTitle ||
      lowerTitle.includes("access denied") ||
      lowerTitle.includes("just a moment") ||
      lowerTitle.includes("page not found") ||
      lowerTitle.includes("attention required") ||
      lowerTitle.includes("pardon our interruption") ||
      lowerTitle.includes("are you a human") ||
      lowerTitle.includes("security measure") ||
      rawText.length < 500
    ) {
      // Trigger Python Scrapling Microservice Fallback
      console.log("Jina got blocked. Triggering Python Scrapling Microservice...");
      try {
        const pyData = await extractWithPythonScraper(url);
        if (pyData.rawText) {
          rawText = pyData.rawText;
        }
        if (pyData.imageUrl && !imageUrl) {
          imageUrl = pyData.imageUrl;
        }
      } catch (err: any) {
        console.error("Python Scraper unavailable:", err.message);
      }
      try {
        const slugTitle = titleFromUrlSlug(url);
        if (slugTitle) {
          finalTitle = slugTitle;
        }
      } catch (e) {
        console.log("Failed to parse URL for title fallback", e);
      }
    }

    if (priceText && !rawText.includes(priceText)) {
      rawText = "META PRICE FOUND: " + priceText + "\n\n" + rawText;
    }
    return { rawText, imageUrl, title: finalTitle, priceText };
  } catch (error: any) {
    console.error(`Scrape failed for ${url}:`, error.message);
    return { rawText: "Failed to scrape.", imageUrl: null, title: "" };
  }
}

export async function scrapeUrlsSequentially(urls: string[]) {
  const scrapeResults: PromiseSettledResult<ScrapeResult>[] = [];
  for (const url of urls) {
    scrapeResults.push(await Promise.allSettled([scrapeUrl(url)]).then((res) => res[0]));
    // Add a 1.5 second delay between requests to avoid rate limits
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  return scrapeResults;
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
      });
    } else {
      console.error(`Failed to scrape ${urls[index]}:`, result.reason);
      failedUrls.push(urls[index]);
    }
  });

  return { scrapedData, failedUrls };
}
