from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scrapling import Fetcher
import json
import re

app = FastAPI(title="SpecMatch Scraper API")

class ScrapeRequest(BaseModel):
    url: str

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "SpecMatch Scraper API"}


def prune_json(obj, depth=0):
    """
    Recursively prunes massive state JSONs to only include relevant product info.
    Prevents blowing up the LLM context window.
    """
    if depth > 10:
        return None
    
    if isinstance(obj, dict):
        pruned = {}
        for k, v in obj.items():
            k_lower = k.lower()
            # Skip massive irrelevant trees (ads, reviews, related products, footer)
            if k_lower in ["ads", "reviews", "bazaarvoice", "analytics", "related", "recommendations", "footer", "header", "menu"]:
                continue
            
            # If it's a juicy key, grab the whole thing
            if k_lower in ["specs", "specifications", "features", "details", "product"]:
                pruned[k] = v
            else:
                child = prune_json(v, depth + 1)
                if child:
                    pruned[k] = child
        return pruned if pruned else None
        
    elif isinstance(obj, list):
        # We only keep items if they prune down to something useful
        pruned = [prune_json(i, depth + 1) for i in obj]
        pruned = [i for i in pruned if i]
        return pruned if pruned else None
        
    else:
        # Primitive values (strings, ints, etc)
        return obj

@app.post("/scrape")
async def scrape_endpoint(req: ScrapeRequest):
    try:
        print(f"Scraping URL: {req.url}")
        # Standard fetcher easily bypasses Akamai for standard requests
        page = Fetcher.get(req.url)
        
        # 1. Edge Case: Check if we got hit with a CAPTCHA despite scrapling
        if "Access Denied" in page.text or "Just a moment" in page.text:
            return {
                "status": "error",
                "message": "Blocked by anti-bot firewall.",
                "text": "Access Denied"
            }
            
        # 2. Site-Specific Handlers (BestBuy React State)
        if "bestbuy.ca" in req.url or "bestbuy.com" in req.url:
            match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', page.body.decode('utf-8', errors='ignore'))
            if match:
                try:
                    data = json.loads(match.group(1))
                    
                    # Target specifically the product node if it exists to save tons of tokens
                    target_data = data.get("product", data)
                    
                    # Prune out the junk
                    clean_data = prune_json(target_data)
                    raw_json = json.dumps(clean_data)
                    
                    return {
                        "status": "success",
                        "type": "json",
                        "data": raw_json[:20000] # Safe 20k char limit for smaller LLMs
                    }
                except json.JSONDecodeError:
                    pass
                    
        # 3. Generic Fallback: Extract clean text from HTML
        # scrapling's page.text smartly strips HTML tags and scripts!
        clean_text = page.text
        
        return {
            "status": "success",
            "type": "text",
            "data": clean_text[:20000] 
        }
        
    except Exception as e:
        print(f"Scrape failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
