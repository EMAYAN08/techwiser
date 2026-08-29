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
      // Trigger Python Scrapling Microservice Fallback
      console.log("Jina got blocked. Triggering Python Scrapling Microservice...");
      try {
        const rawPyUrl = process.env.PYTHON_SCRAPER_URL || "http://127.0.0.1:8000";
        const pyScraperUrl = rawPyUrl.replace(/\/+$/, ''); // strip trailing slash
        const fetchUrl = `${pyScraperUrl}/scrape`;
        console.log("Fetching Python Microservice at:", fetchUrl);
        const pyRes = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        if (pyRes.ok) {
          const pyData = await pyRes.json();
          console.log("Python Scraper responded with status:", pyData.status, "Data length:", pyData.data ? pyData.data.length : 0);
          if (pyData.status === "success" && pyData.data && pyData.data.length > 100) {
            rawText = "RETAILER DATA (FROM SCRAPLING):\n" + pyData.data;
            if (pyData.imageUrl && !imageUrl) {
              imageUrl = pyData.imageUrl;
            }
          } else {
            console.log("Python Scraper returned error or insufficient data. Status:", pyData.status, "Message:", pyData.message);
          }
        } else {
          console.log("Python Scraper failed HTTP status:", pyRes.status);
        }
      } catch (err: any) {
        console.error("Python Scraper unavailable:", err.message);
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
