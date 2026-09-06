# SpecMatch — Price Matching POC
**Feature:** Real-time Canadian retailer price fetching  
**Status:** POC / Research  
**Verdict:** Feasible with a hybrid approach. No single free solution covers all Canadian retailers.

---

## 1. Is There a Free API for This?

**Short answer: Partially.**

| Retailer | Official API | Free? | Notes |
|---|---|---|---|
| **Amazon.ca** | ✅ Amazon PA API v5 | ✅ Free | Requires Amazon Associates account (free to join). Returns live CAD price, stock, ASIN. Best option available. |
| **Best Buy Canada** | ⚠️ Affiliate API | ⚠️ Conditional | Available via CJ Affiliate (Commission Junction) partnership. Apply at bestbuy.ca/en-ca/partners. Product feed + pricing. Not self-serve. |
| **Newegg.ca** | ❌ None | ❌ | No public API. Scraping only. |
| **Canada Computers** | ❌ None | ❌ | No public API. Scraping only. |
| **Memory Express** | ❌ None | ❌ | No public API. Scraping only. |
| **Staples Canada** | ❌ None | ❌ | No public API. Scraping only. |
| **The Source** | ❌ None | ❌ | No public API. Scraping only. |

**Reality:** Only Amazon.ca has a reliable, free, legal API. For everyone else, you scrape or pay.

---

## 2. Complications

### Legal
- Every Canadian retailer's ToS explicitly prohibits automated scraping
- Legal risk is low for personal/internal use but increases with scale
- Canadian courts haven't firmly ruled on scraping legality (grey area)
- **Mitigation:** Phase 1 is internal tool only. Move to affiliate APIs before public launch.

### Technical
| Problem | Impact | Mitigation |
|---|---|---|
| Cloudflare / bot detection | Blocks 80%+ of naive requests | Playwright-stealth + rotating user agents |
| JavaScript-rendered prices | `fetch` + Cheerio fails | Need headless browser (Playwright) |
| Rate limiting | IP bans after ~50 req/hr | Cache aggressively, add delays, rotate IPs |
| Price changes intra-day | Stale data | 1-hour TTL, refresh on user request |
| Product matching across retailers | Same product, different SKUs | Match via UPC/EAN, model number, or fuzzy name |
| Retailer site redesigns | Selectors break | AI-based extraction (Claude reads HTML) instead of hardcoded CSS selectors |

### Cost
- Playwright on Railway: included in $5/mo plan (light usage)
- Rotating proxies if needed: ~$30–50/month (BrightData / Oxylabs)
- Amazon PA API: **$0** (earn affiliate commissions instead)

---

## 3. Recommended Hybrid Architecture

```
User requests price for Product X
         │
         ▼
┌─────────────────────────────┐
│   Check Supabase cache      │  → Hit (< 1hr old): return immediately
│   TTL: 60 minutes           │  → Miss: proceed to fetch
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Parallel fetch across retailers                         │
│                                                          │
│  amazon.ca  → Amazon PA API v5 (official, fast, legal)  │
│  bestbuy.ca → CJ Affiliate API  (apply for access)      │
│  others     → Playwright stealth scraper                 │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Normalize → PricePoint[]   │  → { retailer, price, inStock, url, currency: 'CAD' }
│  Write to Supabase cache    │
└─────────────────────────────┘
         │
         ▼
     Return to app
```

---

## 4. Product Matching Strategy

The hard problem: how do you know the iPhone 16 Pro Max on bestbuy.ca is the same one on amazon.ca?

**Priority order:**
1. **UPC/EAN** — extract from product page, match exactly across retailers
2. **Model number** — e.g. `MQDY3LL/A`, extract and search each retailer's search API/page
3. **Retailer search** — search `{brand} + {model name}` on each retailer, take top result
4. **Claude AI fallback** — pass product name to Claude, ask it to identify the canonical model number

---

## 5. Implementation Plan

### Step 1 — Amazon.ca (Week 1, zero cost)

```bash
# Join Amazon Associates Canada (free)
# https://associates.amazon.ca

# Install SDK
npm install paapi5-nodejs-sdk
```

```typescript
// services/prices/amazon.ts
import { DefaultApi, GetItemsRequest, PartnerType, Resources } from 'paapi5-nodejs-sdk';

const client = new DefaultApi();

export async function getAmazonPrice(asin: string): Promise<PricePoint | null> {
  const request = new GetItemsRequest();
  request.ItemIds = [asin];
  request.Resources = [Resources.OffersListingsPrice, Resources.ItemInfoTitle];
  request.PartnerTag = process.env.AMAZON_ASSOCIATE_TAG!;  // your-tag-20
  request.PartnerType = PartnerType.Associates;
  request.Marketplace = 'www.amazon.ca';  // CAD prices

  const response = await client.getItems(request);
  const item = response.ItemsResult?.Items?.[0];
  const price = item?.Offers?.Listings?.[0]?.Price;

  if (!price) return null;

  return {
    retailer: 'amazon-ca',
    price: price.Amount,
    currency: 'CAD',
    inStock: true,
    url: item.DetailPageURL,
    lastChecked: new Date(),
  };
}
```

**How to get ASIN from URL:**
```typescript
// amazon.ca/dp/B0CHX3QBCH → ASIN = B0CHX3QBCH
export function extractASIN(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/);
  return match?.[1] ?? null;
}
```

---

### Step 2 — Playwright Stealth Scraper for Other Retailers (Week 2)

```bash
npm install playwright playwright-extra playwright-extra-plugin-stealth
npx playwright install chromium
```

```typescript
// services/prices/scraper.ts
import { chromium } from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';

chromium.use(StealthPlugin());

const SELECTORS: Record<string, { price: string; stock: string }> = {
  'canada-computers': {
    price: '[itemprop="price"]',
    stock: '.product-stock-status',
  },
  'memory-express': {
    price: '.price-wrapper .price',
    stock: '.stock-status',
  },
  'newegg-ca': {
    price: '.price-current strong',
    stock: '.product-inventory',
  },
  'staples-ca': {
    price: '[data-automation="product-price"]',
    stock: '[data-automation="stock-indicator"]',
  },
};

export async function scrapePrice(url: string, retailer: string): Promise<PricePoint | null> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-CA,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    const sel = SELECTORS[retailer];
    if (!sel) return null;

    const priceText = await page.locator(sel.price).first().textContent();
    const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') ?? '');
    const stockText = await page.locator(sel.stock).first().textContent();
    const inStock = !stockText?.toLowerCase().includes('out of stock');

    if (isNaN(price)) return null;

    return { retailer, price, currency: 'CAD', inStock, url, lastChecked: new Date() };
  } catch {
    return null;  // Fail silently — not all retailers will succeed every time
  } finally {
    await browser.close();
  }
}
```

**AI Fallback (when selectors break):**
```typescript
// If scraper returns null, fallback to Claude
async function claudeFallback(html: string, url: string): Promise<number | null> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Extract the current CAD price from this product page HTML. Return ONLY the number, no symbols, no text. If no price found, return null.\n\n${html.slice(0, 5000)}`
    }]
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : null;
  const price = parseFloat(text ?? '');
  return isNaN(price) ? null : price;
}
```

---

### Step 3 — Orchestrator + Caching (Week 2)

```typescript
// services/prices/index.ts
export async function fetchAllPrices(product: Product): Promise<PricePoint[]> {
  // 1. Check cache
  const cached = await getCachedPrices(product.id);
  if (cached) return cached;

  // 2. Fetch in parallel
  const jobs: Promise<PricePoint | null>[] = [];

  if (product.retailer === 'amazon-ca' || product.model) {
    const asin = extractASIN(product.url);
    if (asin) jobs.push(getAmazonPrice(asin));
  }

  const scrapeTargets = ['canada-computers', 'memory-express', 'newegg-ca', 'staples-ca'];
  for (const retailer of scrapeTargets) {
    jobs.push(findAndScrapePrice(product, retailer));  // search + scrape
  }

  const results = (await Promise.allSettled(jobs))
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<PricePoint>).value);

  // 3. Cache for 1 hour
  await cachePrices(product.id, results);

  return results;
}
```

---

### Step 4 — Supabase Cache Table

```sql
CREATE TABLE price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  retailer TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency CHAR(3) DEFAULT 'CAD',
  in_stock BOOLEAN DEFAULT true,
  url TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,  -- fetched_at + 1 hour
  UNIQUE(product_id, retailer)
);

-- Auto-expire index
CREATE INDEX idx_price_cache_expires ON price_cache(expires_at);
```

---

## 6. Can You Use an Automated AI Agent for This?

**Yes — and it's the most resilient approach for selectors breaking.**

**Setup:** Use a Claude-powered agent (or n8n/Make workflow) that:
1. Receives a product URL + retailer list
2. Launches Playwright, navigates each retailer's search
3. Passes rendered HTML to Claude to extract price
4. Writes result to Supabase

**Why AI extraction beats hardcoded selectors:**
- Retailers redesign pages frequently — selectors break constantly
- Claude reads HTML like a human — finds the price regardless of class name changes
- Zero maintenance when retailer updates their DOM

**Feasibility:** ✅ Fully feasible. This is exactly what browser-use, Playwright + Claude pipelines are built for.

**Complications:**
- Slower than direct API (5–10s per retailer vs <1s for PA API)
- Costs ~$0.002 per page extraction with Claude Haiku
- Browser instances are memory-heavy on Railway — limit to 2 concurrent

---

## 7. Decision Matrix

| Approach | Retailers Covered | Cost | Legal Risk | Complexity | Recommended Phase |
|---|---|---|---|---|---|
| Amazon PA API | Amazon.ca only | Free | None | Low | Phase 1 ✅ |
| Best Buy Affiliate API | Best Buy CA only | Free | None | Medium | Phase 1 ✅ |
| Playwright stealth | All CA retailers | ~$5/mo server | Low (personal use) | Medium | Phase 1 ✅ |
| Claude AI extraction | All CA retailers | ~$0.002/page | Low (personal use) | Low (no selectors) | Phase 1 fallback ✅ |
| ScrapingBee / BrightData | All CA retailers | $49–200/mo | None | Low | Phase 2 (scale) |
| Google Shopping (SerpAPI) | All | $50/mo | None | Low | Phase 2 |

---

## 8. Immediate Next Steps

1. **Today:** Apply for Amazon Associates Canada at `associates.amazon.ca` (free, instant)
2. **This week:** Apply for Best Buy Canada affiliate via CJ Affiliate
3. **Week 2:** Implement `scraper.ts` with Playwright stealth for the remaining 5 retailers
4. **Week 2:** Add Supabase `price_cache` table and 1-hour TTL logic
5. **Week 3:** Wire into the Compare screen — show price table as a real section (remove placeholder)
6. **Before public launch:** Switch scrapers to ScrapingBee or affiliate APIs to eliminate ToS risk

---

*Estimated cost at Phase 1 (internal use): $0–5/month. At Phase 2 (consumer app, 500 MAU): $50–100/month.*
