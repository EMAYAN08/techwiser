import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

async function puppeteerFallback(url: string): Promise<string> {
  let browser = null;
  try {
    console.log("Launching Puppeteer fallback for: " + url);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Wait until DOM is loaded, but cap at 10s to avoid hanging Render
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    const text = await page.evaluate(() => {
      // Remove scripts, styles, etc to save memory and tokens
      document.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
      return document.body.innerText;
    });
    
    return text.substring(0, 15000); // Cap size
  } catch (err: any) {
    console.error("Puppeteer fallback failed:", err.message);
    return "";
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function scrapeUrl(url: string): Promise<{ rawText: string; imageUrl: string | null; title: string }> {
  let rawText = "";
  let imageUrl: string | null = null;
  let title = "";

  try {
    try {
      const jinaResponse = await fetch('https://r.jina.ai/' + url, {
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (jinaResponse.ok) {
        const jsonData = await jinaResponse.json();
        const data = jsonData.data;
        
        rawText = data?.content || data?.text || "";
        title = data?.title || "";
        
        if (data?.image) {
          imageUrl = data.image;
        }
      } else {
        throw new Error(`Jina returned ${jinaResponse.status}`);
      }
    } catch (jinaError: any) {
      console.log(`Jina extraction warning for ${url}:`, jinaError.message);
      rawText = "Failed to extract text.";
    }

    if (!imageUrl) {
      try {
        const htmlResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            'Accept': 'text/html'
          },
          signal: AbortSignal.timeout(6000)
        });
        const html = await htmlResponse.text();
        
        const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          imageUrl = ogImageMatch[1];
        } else {
          const mdImgMatch = rawText.match(/!\[.*?\]\((https:\/\/[^\)]+(?:jpg|png|webp|jpeg)[^\)]*)\)/i);
          if (mdImgMatch && mdImgMatch[1]) {
            imageUrl = mdImgMatch[1];
          }
        }
      } catch (imgError: any) {
        console.log(`Image fallback warning for ${url}:`, imgError.message);
      }
    }

    let finalTitle = title;
    if (!finalTitle || finalTitle.toLowerCase().includes("access denied") || finalTitle.toLowerCase().includes("just a moment")) {
      // Trigger Puppeteer fallback since Jina got blocked
      console.log("Jina got blocked. Triggering Puppeteer...");
      const pText = await puppeteerFallback(url);
      if (pText && pText.trim().length > 100) {
        rawText = pText; // Replace the access denied message with actual scraped text
      }
      try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(p => p.length > 0 && p.toLowerCase() !== 'en-ca' && p.toLowerCase() !== 'product' && p.toLowerCase() !== 'dp' && isNaN(Number(p)));
        // Grab the longest string segment, which is almost always the SEO product slug
        let slug = parts.reduce((a, b) => a.length > b.length ? a : b, "");
        if (slug) {
          finalTitle = decodeURIComponent(slug).replace(/-/g, ' ');
        }
      } catch (e) {
        console.log("Failed to parse URL for title fallback", e);
      }
    }
    
    return { rawText, imageUrl, title: finalTitle };
  } catch (error: any) {
    console.error(`Scrape failed for ${url}:`, error.message);
    return { rawText: "Failed to scrape.", imageUrl: null, title: "" };
  }
}

export async function findOfficialSpecs(productTitle: string): Promise<string> {
  if (!productTitle) return "";
  if (productTitle.toLowerCase().includes("access denied") || productTitle.toLowerCase().includes("just a moment")) return "";
  
  // Clean up title (often has " | BestBuy Canada" etc)
  let cleanTitle = productTitle.split("|")[0].split("-")[0].replace(/\b(unlocked|smartphone|fitness tracker|smartwatch|with|monitor|gps|midnight|zen|graphite)\b/gi, '').trim();
  
  // Truncate to first 4 words to ensure a broad, accurate product search
  const words = cleanTitle.split(/\s+/);
  if (words.length > 4) {
    cleanTitle = words.slice(0, 4).join(" ");
  }
  
  const query = `${cleanTitle} official specs`;
  
  try {
    console.log(`Searching official specs for: ${query}`);
    // Use s.jina.ai for search and extraction in one go!
    // X-Return-Format: markdown will return markdown of the top results or the directly fetched page if it auto-redirects
    const jinaSearchResponse = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown'
      },
      signal: AbortSignal.timeout(12000)
    });
    
    if (jinaSearchResponse.ok) {
      const markdown = await jinaSearchResponse.text();
      // Cap at 15000 chars to avoid overwhelming the LLM
      return markdown.substring(0, 15000);
    }
    return "";
  } catch (e: any) {
    console.error(`Official specs search failed for ${cleanTitle}:`, e.message);
    return "";
  }
}
