
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scrapling import Fetcher
from bs4 import BeautifulSoup
import json
import re

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
                        if item.get("@type") == "Product": return item
                elif isinstance(data, dict):
                    if data.get("@type") == "Product": return data
                    elif "@graph" in data:
                        for item in data["@graph"]:
                            if item.get("@type") == "Product": return item
            except: pass
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
    apollo_match = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html)
    if apollo_match:
        try: return json.loads(apollo_match.group(1))
        except: pass
    return None

def parse_html_content(html):
    soup = BeautifulSoup(html, "html.parser")
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
    result["raw_text"] = re.sub(r'\s+', " ", text)
    
    return result

def scrape_bestbuy_api(url: str):
    if "bestbuy.ca" not in url.lower():
        return None
    sku_match = re.search(r"/(\d{5,})(?:\?|$)", url)
    if not sku_match:
        return None
    sku = sku_match.group(1)
    api_url = f"https://www.bestbuy.ca/api/v2/json/product/{sku}"
    print(f"Best Buy API SKU {sku}: {api_url}")
    try:
        fetcher = Fetcher(auto_match=True)
        response = fetcher.get(api_url, timeout=15)
        data = json.loads(response.text)
    except Exception as e:
        print(f"Best Buy API failed: {e}")
        return None
    if not data or not data.get("name"):
        return None

    spec_lines = []
    for spec in data.get("specs") or []:
        if not isinstance(spec, dict):
            continue
        name = spec.get("name") or ""
        value = spec.get("value") or ""
        group = spec.get("group") or ""
        if name and value:
            spec_lines.append(f"[{group}] {name}: {value}" if group else f"{name}: {value}")

    box = data.get("whatsInTheBox") or []
    if isinstance(box, list):
        box_text = ", ".join(str(x) for x in box if x)
    else:
        box_text = str(box)

    def strip_html(value):
        if not value:
            return ""
        return BeautifulSoup(str(value), "html.parser").get_text(separator=" ", strip=True)

    payload = {
        "name": data.get("name", ""),
        "brand": data.get("brandName", ""),
        "price": data.get("salePrice") or data.get("regularPrice"),
        "overview": strip_html(data.get("shortDescription")),
        "description": strip_html(data.get("longDescription")),
        "whatsIncluded": box_text,
        "rating": data.get("customerRating"),
        "reviewCount": data.get("customerReviewCount"),
        "specs": spec_lines,
    }
    image = data.get("highResImage") or data.get("thumbnailImage") or ""
    return {
        "status": "success",
        "data": json.dumps(payload)[:30000],
        "imageUrl": image,
    }


@app.post("/scrape")
@app.post("/scrape/")
async def scrape_endpoint(req: ScrapeRequest):
    try:
        print(f"Scraping URL (Scrapling): {req.url}")

        bb = scrape_bestbuy_api(req.url)
        if bb:
            return bb

        # Scrapling Fetcher configures curl_cffi optimally to bypass TLS fingerprinting
        fetcher = Fetcher(auto_match=True)
        response = fetcher.get(req.url, timeout=15)
        html = response.text
        
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

