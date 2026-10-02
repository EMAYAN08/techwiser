# SpecMatch / TechVisor — UAT & Edge-Case Report

**Repo:** [EMAYAN08/techwiser](https://github.com/EMAYAN08/techwiser)  
**Branch:** `uat-edge-case-fixes`  
**Date:** 2026-10-02 (America/Halifax)  
**Environment:** Linux agent box (Node 20). No iOS/Android simulator — Expo web smoke + API UAT + code-path review.

---

## Summary

| Check | Result |
| --- | --- |
| Server unit/integration/live | **35 passed** |
| Mobile unit | **13 passed** |
| TypeScript (`tsc --noEmit`) server + mobile | **clean** |
| Local edge UAT (`scripts/uat-edge-cases.mjs`) | **21/21 passed** |
| Render full AI compare (2 Best Buy CA phones) | **ok** (~70s) |
| Expo web Metro bundler | **ok** (bundle includes Home/Library/Settings + empty-state copy) |

---

## Official Best Buy Canada URLs used (read-only)

1. https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154 — Apple iPhone 16 128GB - Black - Unlocked — **$1149.99**
2. https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094 — Google Pixel 9a 128GB - Obsidian - Unlocked — **$599.97**
3. https://www.bestbuy.ca/en-ca/product/brand-new-google-pixel-9-128gb-obsidian-unlocked/18481469 — Brand New - Google Pixel 9 128GB - Obsidian - Unlocked — **$729**
4. https://www.bestbuy.ca/en-ca/product/refurbished-excellent-samsung-galaxy-s24-128gb-onyx-black-unlocked/17741364 — Refurbished (Excellent) - Samsung Galaxy S24 128GB - Onyx Black - Unlocked — **$429.94**

---

## Test matrix results

### 1. Happy path — 2 valid Best Buy CA URLs → compare
- Local `/api/test-scrape`: both titles + prices + images via `bestbuy-api`.
- Render `/api/compare`: HTTP 200; names correct; prices `$1149.99` / `$599.97`; **images present**; AI summary present; **5 key differences**; badges present.
- Spec UI data: `groupedSpecs` categories (Performance, Display, Camera, Battery, Design, Connectivity, Other Features); each product has **34 rawSpecs**. Flat `specs[]` is empty on the AI path — Compare screen prefers `groupedSpecs` (verified in code).

**AI summary (Render):**  
> The Apple iPhone 16 delivers top-notch performance with its powerful hardware and intuitive iOS system… Meanwhile, the Google Pixel 9a shines with its enhanced AI capabilities…

**Key differences sampled:** Camera Resolution (Front) 12MP vs 13MP; Display Size 6.1 vs 6.3; OS iOS vs Android 15; Water Protection; Ingress Protection (— vs IP68).

**Quality notes:** Prices and images complete. One key-diff row shows iPhone ingress as "—" while Pixel shows IP68 — incomplete extraction, not a crash. Water Protection wording is a bit inconsistent with IP68 (LLM quality).

### 2. 3 products; refuse 4+
| Case | Result |
| --- | --- |
| Scrape 3 | PASS — iPhone 16, Pixel 9a, Pixel 9 |
| Compare with 4 URLs | PASS — HTTP 400 `A maximum of 3 product URLs is allowed.` |

### 3. Invalid / empty / single / unsupported / garbage
| Case | Result |
| --- | --- |
| Missing `urls` | 400 |
| Single URL | 400 |
| Empty strings | 400/502 (rejected) |
| Garbage text | 400 `valid http(s)` |
| Unsupported retailer (bestbuy.com / amazon.com) | 4xx (scrape fails / validation) |

**Client:** Compare button stays disabled unless ≥2 **unique supported product-page** URLs (home pages like `bestbuy.ca/` now invalid).

### 4. Duplicates, malformed SKU, 404
| Case | Result |
| --- | --- |
| Duplicate URLs (same SKU twice) | Client dedupes; server now returns 400 `at least 2 distinct` |
| Malformed / tiny SKU mixed with good | Failed scrape path / 502 when <2 succeed |
| Fake 404 SKUs | 502 with `failedUrls` |

### 5. Cancel mid-load / network
- Mobile `AbortController` wired on Home loading overlay cancel — confirmed in code.
- UAT aborted in-flight `/api/compare` → AbortError (PASS).
- Network/timeout errors route to `/error` (“Extraction Failed”) with Try Again.

### 6. Empty states
| Surface | Behavior |
| --- | --- |
| Recent comparisons cleared | “No comparisons yet” |
| Library empty / filter miss | “No saved products” / “Nothing in this filter” |
| Compare with no active result | “No comparison loaded” + Go back |
| Alternatives empty | “You picked well!” |
| Spec category empty | “No specs available in this category.” |
| QR / Price coming soon | Coming-soon panels; Price tab hidden from tab bar (`href: null`) |
| Missing `imageUrl` | Category icon fallback on product cards |
| Missing / `N/A` price | Price chip hidden (not shown as bare N/A) |

### 7. Settings / legal / navigation
- Tabs present: **Home**, **Library**, **Settings** (Price screen exists but not in tab bar).
- Settings: Appearance, Haptics, Currency CAD, Clear search history, Privacy / Terms / Support / Website.
- Legal links on GitHub Pages: privacy/terms/support all **HTTP 200**.

### 8. Backend partial data handling
- Missing image → UI icon fallback.
- Missing price → chip omitted when `N/A`.
- Specs via `groupedSpecs` + `rawSpecs` when flat `specs` empty.
- `failedUrls` returned alongside successful compares when some URLs fail.

---

## Bugs found and fixed

1. **`stripHtml` entity decode was a no-op again** (`server/src/services/scraper/bestbuy.ts`) — `&amp;`/`&lt;`/`&gt;`/`&quot;` patterns had been corrupted to match literal `&`/`<`/`>`/`"`; restored real entity decoding. Test now passes.
2. **Home copy and QR hints** now say **2–3** products to match `MAX_COMPARE_URLS = 3` / `MAX_QR_PRODUCTS = 3`.
3. **`MAX_QR_PRODUCTS`** aligned at **3** with URL compare limit.
4. **URL validation accepted retailer home pages** (domain-only) — now requires a **product-page shape** (Best Buy needs `/product/` + SKU; Amazon ASIN path; etc.).
5. **Duplicate URLs could enable Compare** — client now uses `uniqueSupportedProductUrls`; server rejects duplicate-only sets and caps at **max 3**.
6. **Server `/api/compare` had no max-URL or http(s) sanity checks** — added max 3, http(s) validation, and dedupe.

---

## How to re-run

```bash
npm test
npm run uat:edge -- --base http://127.0.0.1:3000
npm run uat:edge:full -- --base https://techwiser.onrender.com
```

Artifacts: `docs/test-artifacts/uat-edge-cases.json`, `docs/test-artifacts/uat-render-full-compare.json`.

---

## Limitations (honest)

| Area | Note |
| --- | --- |
| Native simulator | Not available — no on-device swipe-delete / camera QR / haptics feel testing |
| Expo web | Metro served; strings verified in web bundle; full Detox/Maestro not in repo |
| Local full AI compare | No LLM keys in this environment — full AI verified on Render |
| Deployed max-3/dedupe | Compare capped at 2–3 products on main |

---

## Verdict

End-user comparison works with live Best Buy Canada product links (scrape 2/3/4 + Render AI compare). Edge cases (1 URL, 5 URLs, garbage, duplicates, 404 SKUs, cancel abort, empty states) covered. Fixes above are on `uat-edge-case-fixes` for merge into `main`.
