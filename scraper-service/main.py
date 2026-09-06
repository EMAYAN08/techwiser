from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from curl_cffi import requests as curl_requests
from bs4 import BeautifulSoup
import json
import re
from typing import Optional

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

app = FastAPI(title="SpecMatch Scraper API")

class ScrapeRequest(BaseModel):
    url: str

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "SpecMatch Scraper API"}

def extract_json_ld(soup):
    for script in soup.find_all("script", type="application/ld+json"):
        if script.string:
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    for item in data:
                        if item.get("@type") == "Product":
                            return item
                elif isinstance(data, dict):
                    if data.get("@type") == "Product":
                        return data
                    elif "@graph" in data:
                        for item in data["@graph"]:
                            if item.get("@type") == "Product":
                                return item
            except:
                pass
    return None

def extract_meta_tags(soup):
    meta = {}
    og_image = soup.find("meta", property="og:image")
    if og_image: meta["imageUrl"] = og_image.get("content")
    og_desc = soup.find("meta", property="og:description")
    if og_desc: meta["description"] = og_desc.get("content")
    og_title = soup.find("meta", property="og:title")
    if og_title: meta["name"] = og_title.get("content")
    price = soup.find("meta", property="product:price:amount")
    if price: meta["price"] = price.get("content")
    return meta

def extract_inline_state(html):
    next_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
    if next_match:
        try: return json.loads(next_match.group(1))
        except: pass
    init_match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', html)
    if init_match:
        try: return json.loads(init_match.group(1))
        except: pass
    return None

def parse_html_content(html):
    soup = BeautifulSoup(html, 'html.parser')
    result = {
        "name": "", "price": "", "imageUrl": "", "description": "",
        "overview": "", "whatsIncluded": "", "specs": [], "raw_text": "",
        "inline_state_found": False
    }
    
    ld = extract_json_ld(soup)
    if ld:
        result["name"] = ld.get("name", "")
        result["description"] = ld.get("description", "")
        if ld.get("image"):
            if isinstance(ld["image"], list) and len(ld["image"]) > 0:
                result["imageUrl"] = ld["image"][0]
            elif isinstance(ld["image"], str):
                result["imageUrl"] = ld["image"]
        offers = ld.get("offers", {})
        if isinstance(offers, dict) and "price" in offers:
            result["price"] = str(offers["price"])
        elif isinstance(offers, list) and len(offers) > 0 and "price" in offers[0]:
            result["price"] = str(offers[0]["price"])
            
    meta = extract_meta_tags(soup)
    if not result["name"]: result["name"] = meta.get("name", "")
    if not result["description"]: result["description"] = meta.get("description", "")
    if not result["imageUrl"]: result["imageUrl"] = meta.get("imageUrl", "")
    if not result["price"]: result["price"] = meta.get("price", "")
    
    state = extract_inline_state(html)
    if state: result["inline_state_found"] = True
    
    for script in soup(["script", "style", "noscript", "svg"]):
        script.extract()
    text = soup.get_text(separator=" ", strip=True)
    result["raw_text"] = re.sub(r'\s+', ' ', text)
    
    return result

async def layer2_scrape(url: str):
    if not HAS_PLAYWRIGHT: return None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            html = await page.content()
            await browser.close()
            return html
    except Exception as e:
        print(f"Layer 2 failed: {e}")
        return None

@app.post("/scrape")
@app.post("/scrape/")
async def scrape_endpoint(req: ScrapeRequest):
    try:
        print(f"Scraping URL (Layer 1): {req.url}")
        
        # BestBuy API Bypass
        if "bestbuy.ca" in req.url:
            sku_match = re.search(r'/(\d+)(?:\?|$)', req.url)
            if sku_match:
                sku = sku_match.group(1)
                api_url = f"https://www.bestbuy.ca/api/v2/json/product/{sku}"
                api_resp = curl_requests.get(api_url, impersonate="safari17_0", timeout=15)
                if api_resp.status_code == 200:
                    data = api_resp.json()
                    long_desc = data.get("longDescription", "")
                    if long_desc:
                        long_desc = BeautifulSoup(long_desc, "html.parser").get_text(separator=" ", strip=True)
                    payload = {
                        "name": data.get("name", ""),
                        "price": data.get("salePrice") or data.get("regularPrice"),
                        "overview": BeautifulSoup(data.get("shortDescription", ""), "html.parser").get_text(separator=" ", strip=True) if data.get("shortDescription") else "",
                        "description": long_desc,
                        "whatsIncluded": data.get("whatsInTheBox", ""),
                        "specs": data.get("specs", [])
                    }
                    return {
                        "status": "success",
                        "data": json.dumps(payload)[:30000],
                        "imageUrl": data.get("highResImage") or data.get("thumbnailImage") or ""
                    }

        response = curl_requests.get(req.url, impersonate="safari17_0", timeout=15)
        html = response.text
        
        is_blocked = "Access Denied" in html or "Just a moment" in html or response.status_code in [403, 429]
        
        if is_blocked:
            print("Layer 1 Blocked. Falling back to Layer 2.")
            html_l2 = await layer2_scrape(req.url)
            if html_l2: html = html_l2
                
        parsed = parse_html_content(html)
        
        if not is_blocked and (not parsed["name"] and not parsed["price"] and not parsed.get("inline_state_found")):
            print("Layer 1 yielded poor data. Falling back to Layer 2.")
            html_l2 = await layer2_scrape(req.url)
            if html_l2:
                html = html_l2
                parsed = parse_html_content(html)
                
        payload = {
            "name": parsed["name"],
            "price": parsed["price"],
            "overview": parsed["overview"],
            "description": parsed["description"],
            "whatsIncluded": parsed["whatsIncluded"],
            "specs": parsed["specs"],
            "raw_text": parsed["raw_text"]
        }
        
        return {
            "status": "success",
            "data": json.dumps(payload)[:30000],
            "imageUrl": parsed["imageUrl"]
        }
        
    except Exception as e:
        print(f"Scrape failed: {e}")
        return {"status": "error", "message": str(e)}
