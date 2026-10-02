# SpecMatch / TechVisor — Test Report

**Repo:** [EMAYAN08/techwiser](https://github.com/EMAYAN08/techwiser)  
**Branch:** `test-suite-and-fixes`  
**Date:** 2026-10-02 (America/Halifax)  
**Environment:** Linux agent box (Node 20.19.2). No iOS/Android simulator available.

---

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| Server unit + integration + live Best Buy | `npm --prefix server test` | **32 passed** / 8 files |
| Mobile unit | `npm --prefix mobile test` | **11 passed** / 4 files |
| Server TypeScript | `npx tsc --noEmit` (server) | **clean** |
| Mobile TypeScript | `npx tsc --noEmit` (mobile) | **clean** |
| Local E2E (health + Best Buy scrape) | `node scripts/e2e-bestbuy-compare.mjs --base http://127.0.0.1:3000` | **ok** |
| Deployed E2E + full AI compare | `node scripts/e2e-bestbuy-compare.mjs --base https://techwiser.onrender.com --full-compare` | **ok** (AI summary + 5 key differences) |

**Total automated tests: 43 passed.**

---

## Features verified

### Backend API
- `GET /api/health` — ok locally and on Render
- `POST /api/compare` — request validation (needs ≥2 URLs); full AI comparison on Render with real Best Buy CA products
- `POST /api/test-scrape` — sequential scrape of 2 Best Buy CA URLs; titles + prices returned
- `POST /api/barcode`, `/api/explain-spec`, `/api/alternatives`, `/api/resolve-names` — payload validation
- Best Buy Canada official JSON API (`/api/v2/json/product/{sku}`) — used by server scraper (read-only)

### Mobile logic
- URL validation against supported Canadian retailers (`utils/validators.ts`)
- Compare limits aligned with PRD (2–4 products)
- Product kind classification (phone / laptop / TV / appliances / tablet)
- Retailer key normalization
- Title normalization for comparison cards
- Client-side alternatives / explain-spec cache key helpers

### Product comparison (UAT / E2E)
Official **Best Buy Canada** product URLs (read-only; no cart / no sign-in):

1. https://www.bestbuy.ca/en-ca/product/apple-iphone-16-128gb-black-unlocked/18391154  
   - API: Apple iPhone 16 128GB - Black - Unlocked — **$1149.99 CAD**
2. https://www.bestbuy.ca/en-ca/product/google-pixel-9a-128gb-obsidian-unlocked/19206094  
   - API: Google Pixel 9a 128GB - Obsidian - Unlocked — **$599.97 CAD**

**Local scrape result:** both products scraped via Best Buy API path (`priceSource: bestbuy-api`), prices `$1149.99` and `$599.97`.  
**Render full compare result:** HTTP 200, both product names present, `aiSummary` present, **5** key differences.

---

## Bugs fixed

1. **`stripHtml` entity decode no-op** (`server/src/services/scraper/bestbuy.ts`) — `&amp;` was replaced with itself; now correctly decodes `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`.
2. **Compare button ignored retailer validation** (`mobile/app/(tabs)/index.tsx`) — previously any non-empty string enabled Compare; now requires `isSupportedProductUrl` and `MIN_COMPARE_URLS`.
3. **Max products capped at 3 vs PRD 2–4** — `addUrl` / “Add product” UI now use `MAX_COMPARE_URLS = 4`.
4. **`StyleSheet.absoluteFillObject` type errors** (Expo/RN 0.86) — replaced with `StyleSheet.absoluteFill` in `AlternativesDeck`, `GlassPanel`, `Skeleton`.
5. **`ComingSoonPanel` impossible `"upc"` comparison** — prop type was `Extract<InputMode, "upc" | "qr">` but `InputMode` is only `"url" | "qr"`; narrowed to `"upc" | "qr"`.
6. **Stale mock Best Buy SKUs** in recent-comparison seed data (404 on live API) — updated to real CA SKUs discovered via Best Buy search API.

---

## How to run tests

```bash
# All
npm test

# Server only (unit + API integration + live Best Buy scrape tests)
npm --prefix server test

# Mobile pure-logic unit tests
npm --prefix mobile test

# E2E against local server (start server first: cd server && npm run dev)
npm run e2e:bestbuy

# E2E + full AI compare (needs LLM keys on target server)
npm run e2e:bestbuy:full -- --base https://techwiser.onrender.com
```

---

## Known limitations

| Area | Limitation |
| --- | --- |
| iOS / Android simulator | Not available on this agent box. Native UI gestures (swipe-to-delete URL row, haptics, camera QR) were not exercised on-device. |
| Expo web UI drive | Expo web was started for smoke only; full Detox/Maestro UI automation is not in the repo yet. |
| Local full `/api/compare` | Local server has no `OPENAI_API_KEY` / Gemini credentials in this environment. Full AI compare was verified against the deployed Render API. |
| Best Buy HTML pages | Product HTML may bot-challenge; the app’s primary path uses the **public Best Buy Canada JSON API** (works from this environment). |
| Input modes | Home tabs are URL + QR; UPC barcode UI remains “coming soon” panel content. |
| Docs referenced in `GEMINI.md` | `docs/ARCHITECTURE.md` and `docs/skills.md` are still missing from the repo (pre-existing). |

---

## Test inventory

### Server (`server/src/__tests__/`)
- `price.test.ts` — `isMissingPrice`, `formatDisplayPrice`, `extractPriceFromText`
- `bestbuy.test.ts` — SKU extraction, image URL upgrade
- `bestbuy.live.test.ts` — live CA API scrape for iPhone 16 + Pixel 9a
- `stripHtml.test.ts` — HTML/entity cleanup
- `barcode-matching.test.ts` — name similarity / query cleanup
- `scrape-partition.test.ts` — fulfilled vs failed scrape partition
- `constants.test.ts` — supported retailers + colors
- `api.integration.test.ts` — Express route validation via Supertest

### Mobile (`mobile/__tests__/`)
- `validators.test.ts`
- `productKind.test.ts`
- `normalizeTitle.test.ts`
- `apiCache.test.ts`

### Scripts
- `scripts/e2e-bestbuy-compare.mjs` — health → official Best Buy API → `/api/test-scrape` → optional `/api/compare`

---

## Verdict

Backend comparison pipeline works end-to-end with official Best Buy Canada product links (scrape + AI compare on Render). Unit/integration coverage added for core server and mobile logic. Several correctness and TypeScript bugs fixed without removing existing features. Native mobile simulator UAT remains outstanding on a Mac/device farm.
