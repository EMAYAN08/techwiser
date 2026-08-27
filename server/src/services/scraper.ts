export async function scrapeUrl(url: string): Promise<{ rawText: string; imageUrl: string | null }> {
  let rawText = "";
  let imageUrl: string | null = null;

  try {
    // 1. Fetch JSON from Jina AI (bypasses anti-bot captchas, returns text AND image metadata)
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
        
        // Jina automatically extracts the main product image or og:image
        if (data?.image) {
          imageUrl = data.image;
        }
      } else {
        throw new Error(`Jina returned ${jinaResponse.status}`);
      }
    } catch (jinaError: any) {
      console.log(`Jina extraction warning for ${url}:`, jinaError.message);
      rawText = "Failed to extract text. The retailer may have blocked the request.";
    }

    // 2. Fallback Image Extraction: Lightweight fetch if Jina missed the image
    if (!imageUrl) {
      try {
        const htmlResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html'
          },
          signal: AbortSignal.timeout(6000)
        });
        const html = await htmlResponse.text();
        
        const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          imageUrl = ogImageMatch[1];
        } else {
          // If no og:image, grab the first likely product image from markdown just in case
          const mdImgMatch = rawText.match(/!\[.*?\]\((https:\/\/[^\)]+(?:jpg|png|webp|jpeg)[^\)]*)\)/i);
          if (mdImgMatch && mdImgMatch[1]) {
            imageUrl = mdImgMatch[1];
          }
        }
      } catch (imgError: any) {
        console.log(`Image fallback warning for ${url}:`, imgError.message);
      }
    }

    return { rawText, imageUrl };
  } catch (error: any) {
    console.error(`Scrape failed for ${url}:`, error.message);
    return { rawText: "Failed to scrape.", imageUrl: null };
  }
}
