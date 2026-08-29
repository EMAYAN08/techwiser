from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from curl_cffi import requests as curl_requests
from bs4 import BeautifulSoup
import json
import re

app = FastAPI(title="SpecMatch Scraper API")

import os
import subprocess

@app.on_event("startup")
async def startup_event():
    if not os.path.exists("/tmp/pw_installed"):
        print("Installing Playwright Chromium...")
        try:
            subprocess.run(["playwright", "install", "chromium"], check=True)
            with open("/tmp/pw_installed", "w") as f:
                f.write("done")
            print("Playwright Chromium installed successfully.")
        except Exception as e:
            print("Playwright install failed:", e)


class ScrapeRequest(BaseModel):
    url: str

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "SpecMatch Scraper API"}

def prune_json(obj, depth=0):
    if depth > 10:
        return None
    
    if isinstance(obj, dict):
        pruned = {}
        for k, v in obj.items():
            k_lower = k.lower()
            if k_lower in ["ads", "reviews", "bazaarvoice", "analytics", "related", "recommendations", "footer", "header", "menu"]:
                continue
            if k_lower in ["specs", "specifications", "features", "details", "product"]:
                pruned[k] = v
            else:
                child = prune_json(v, depth + 1)
                if child:
                    pruned[k] = child
        return pruned if pruned else None
        
    elif isinstance(obj, list):
        pruned = [prune_json(i, depth + 1) for i in obj]
        pruned = [i for i in pruned if i]
        return pruned if pruned else None
        
    else:
        return obj

@app.post("/scrape")
@app.post("/scrape/")
async def scrape_endpoint(req: ScrapeRequest):
    try:
        print(f"Scraping URL (TLS Impersonation): {req.url}")
        
        # Use curl_cffi with Safari impersonation to bypass Akamai
        
        # BestBuy Canada API Bypass
        if "bestbuy.ca" in req.url:
            sku_match = re.search(r'/(\d+)(?:\?|$)', req.url)
            if sku_match:
                sku = sku_match.group(1)
                api_url = f"https://www.bestbuy.ca/api/v2/json/product/{sku}"
                print(f"Bypassing Akamai via BestBuy API: {api_url}")
                api_resp = curl_requests.get(api_url, impersonate="safari17_0", timeout=15)
                if api_resp.status_code == 200:
                    data = api_resp.json()
                    specs = data.get("specs", [])
                    name = data.get("name", "")
                    
                    # Extract rich descriptions and included items
                    short_desc = data.get("shortDescription", "")
                    long_desc = data.get("longDescription", "")
                    whats_in_box = data.get("whatsInTheBox", "")
                    
                    if long_desc:
                        long_desc = BeautifulSoup(long_desc, "html.parser").get_text(separator=" ", strip=True)
                    if short_desc:
                        short_desc = BeautifulSoup(short_desc, "html.parser").get_text(separator=" ", strip=True)
                        
                    image_url = data.get("highResImage") or data.get("thumbnailImage") or ""
                    
                    payload = {
                        "name": name,
                        "overview": short_desc,
                        "description": long_desc,
                        "whatsIncluded": whats_in_box,
                        "specs": specs
                    }
                    
                    return {
                        "status": "success",
                        "type": "json",
                        "data": json.dumps(payload)[:20000],
                        "imageUrl": image_url
                    }
                    
        # Fallback to standard request for other sites
        response = curl_requests.get(req.url, impersonate="safari17_0", timeout=15)

        print(f"Response status: {response.status_code}, Length: {len(response.text)}")
        
        if "Access Denied" in response.text or "Just a moment" in response.text:
            print("BLOCKED BY AKAMAI")
            return {
                "status": "error",
                "message": "Blocked by anti-bot firewall despite TLS spoofing.",
                "text": "Access Denied"
            }
            
        # BestBuy React State Check
        if "bestbuy.ca" in req.url or "bestbuy.com" in req.url:
            match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', response.text)
            if match:
                try:
                    data = json.loads(match.group(1))
                    target_data = data.get("product", data)
                    clean_data = prune_json(target_data)
                    raw_json = json.dumps(clean_data)
                    return {
                        "status": "success",
                        "type": "json",
                        "data": raw_json[:20000]
                    }
                except json.JSONDecodeError:
                    pass
                    
        # Fallback for generic sites
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Kill all script and style elements
        for script in soup(["script", "style", "noscript", "svg"]):
            script.extract()
            
        text = soup.get_text(separator=" ", strip=True)
        
        # Remove massive whitespace gaps
        text = re.sub(r'\s+', ' ', text)
        
        return {
            "status": "success",
            "type": "text",
            "data": text[:20000] 
        }
        
    except Exception as e:
        print(f"Scrape failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SearchRequest(BaseModel):
    query: str

@app.post("/search")
async def search_and_scrape(req: SearchRequest):
    import urllib.parse
    print(f"Searching DuckDuckGo for: {req.query}")
    
    try:
        # Use Yahoo Search to avoid DuckDuckGo datacenter tarpit/timeouts
        url = f"https://search.yahoo.com/search?p={urllib.parse.quote(req.query)}"
        resp = curl_requests.get(url, impersonate="safari17_0", timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        top_url = None
        for a in soup.select('.compTitle a'):
            href = a.get('href')
            if href and "RU=" in href:
                extracted = href.split("RU=")[1].split("/RK=")[0]
                decoded = urllib.parse.unquote(extracted)
                if "yahoo.com" not in decoded and "bing.com/aclick" not in decoded and "youtube.com" not in decoded:
                    top_url = decoded
                    break
                
        if not top_url:
            return {"status": "error", "message": "No search results found"}
            
        print(f"Top official URL found: {top_url}. Scraping with Scrapling/Playwright...")
        
        from scrapling import Fetcher
        # Scrapling executes JS automatically and waits for network idle
        try:
            fetcher = Fetcher(auto_match=False, headless=True)
            page = fetcher.get(top_url)
            # Scrapling Response or Adaptor
            text = page.page.text_content('body') if hasattr(page, 'page') else ""
            if not text and hasattr(page, 'text_content'):
                 text = page.text_content()
            if not text:
                 # fallback to raw html parsing
                 page_soup = BeautifulSoup(page.text, "html.parser")
                 for element in page_soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "button"]):
                     element.decompose()
                 text = page_soup.get_text(separator=" ", strip=True)
        except Exception as pw_err:
            print(f"Scrapling failed: {pw_err}, falling back to static fetch")
            page_resp = curl_requests.get(top_url, impersonate="safari17_0", timeout=15)
            page_soup = BeautifulSoup(page_resp.text, "html.parser")
            for element in page_soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "button"]):
                element.decompose()
            text = page_soup.get_text(separator=" ", strip=True)
            
        text = re.sub(r'\s+', ' ', text).strip()
        
        return {
            "status": "success",
            "sourceUrl": top_url,
            "data": text[:20000]
        }
        
    except Exception as e:
        print(f"Search/Scrape failed: {e}")
        return {"status": "error", "message": str(e)}
