export async function scrapeUrl(url: string): Promise<{ rawText: string; imageUrl: string | null }> {
  let rawText = "";
  let imageUrl: string | null = null;

  try {
    // 1. Image Extraction: Lightweight fetch (avoids Puppeteer anti-bot blocking & memory crashes)
    try {
      const htmlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html'
        },
        signal: AbortSignal.timeout(6000)
      });
      const html = await htmlResponse.text();
      
      // Look for OpenGraph image
      const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        imageUrl = ogImageMatch[1];
      } else {
        // Fallback: look for a likely product image
        const imgMatch = html.match(/<img[^>]+src=["'](https:\/\/[^"']+(?:jpg|png|webp))["']/i);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
        }
      }
    } catch (imgError: any) {
      console.log(`Image extraction warning for ${url}:`, imgError.message);
    }

    // 2. Text Extraction using Jina AI (Bypasses anti-bot captchas natively)
    try {
      const jinaResponse = await fetch('https://r.jina.ai/' + url, {
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (jinaResponse.ok) {
        rawText = await jinaResponse.text();
      } else {
        throw new Error(`Jina returned ${jinaResponse.status}`);
      }
    } catch (jinaError: any) {
      console.log(`Jina extraction warning for ${url}:`, jinaError.message);
      rawText = "Failed to extract text. The retailer may have blocked the request.";
    }

    return { rawText, imageUrl };
  } catch (error: any) {
    console.error(`Scrape failed for ${url}:`, error.message);
    return { rawText: "Failed to scrape.", imageUrl: null };
  }
}
