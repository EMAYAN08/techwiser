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

    return { rawText, imageUrl, title };
  } catch (error: any) {
    console.error(`Scrape failed for ${url}:`, error.message);
    return { rawText: "Failed to scrape.", imageUrl: null, title: "" };
  }
}

export async function findOfficialSpecs(productTitle: string): Promise<string> {
  if (!productTitle) return "";
  
  // Clean up title (often has " | BestBuy Canada" etc)
  const cleanTitle = productTitle.split("|")[0].split("-")[0].trim();
  const query = `${cleanTitle} official site tech specs specifications`;
  
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
