# User behaviour test catalog

Date: 2026-10-03 (America/Halifax). Branch: `main`.

This catalog is the user-facing matrix for Home (URL + QR), paste, compare, Library, Settings, and the Render API. Automated rows run in Vitest. Manual rows need a device or a live retailer scrape.

## How to run

```bash
npm test                  # server + mobile
npm --prefix mobile test  # 77 tests, includes __tests__/userBehaviour.test.ts
npm --prefix server test  # includes src/__tests__/userBehaviour.integration.test.ts
npm run uat:edge          # live API matrix (network). Add --full-compare for a real LLM compare.
```

Last local run after these additions: mobile **77 passed**, server **135 passed**, `tsc --noEmit` clean for both packages.

Shared decisions live in `mobile/utils/userFlows.ts` and are what Home, Library, Compare, and the product page call.

## Automated — positive

| ID | Behaviour | Where |
| --- | --- | --- |
| P-PERSIST-1 | A new compare is written to AsyncStorage `tw-recents` and is back on Home and in Library after a relaunch | `__tests__/useComparisonStore.persist.test.ts` |
| P-PERSIST-2 | Recents keep newest-first order, dedupe by id, and all three products of a 3-product compare across relaunch | persist test |
| P-PERSIST-3 | Settings → Clear history empties memory and storage; relaunch stays empty | persist test |
| P-PERSIST-4 | Removing a product in Library persists; a comparison with no products left is dropped | persist test |
| P-URL-1 | Two or three distinct Best Buy / Canada Computers / Costco / Leon's product URLs enable Compare | `canStartUrlCompare` |
| P-URL-2 | Memory Express, Newegg, Staples, The Source, Amazon.ca, Walmart.ca product shapes count as valid | `validateProductUrl` |
| P-URL-3 | Leading/trailing whitespace still counts | compare gate |
| P-SLOT-1 | Add product grows the list from 2 to 3 | comparison store |
| P-SLOT-2 | Removing the extra slot never leaves fewer than 2 fields | comparison store |
| P-HIST-1 | A finished compare is stored, newest first, capped at 10 | comparison store |
| P-HIST-2 | History drops alternatives and spec explanations (keeps the comparison itself) | comparison store |
| P-LIB-1 | Library dedupes products by id | `uniqueProductsById` |
| P-LIB-2 | Retailer and product-type wells filter only while the filter tray is open | `filterSavedProducts` |
| P-LIB-3 | “All” and a closed tray show every saved product | library helpers |
| P-PRICE-1 | A real price string shows the price chip | `shouldShowPrice` |
| P-TITLE-1 | Recent row title is “A vs B” | `recentComparisonTitle` (Home uses it) |
| P-QR-1 | A QR that contains a Best Buy URL is accepted and tracking params are stripped | `extractQrPayload` / `canonicalizeUrl` |
| P-BAR-1 | A valid UPC/EAN and a URL printed as a barcode are recognized | `extractBarcodePayload` |
| P-SET-1 | Haptics default on, can be turned off, and rehydrate from `tw-haptics` | settings store |
| P-THEME-1 | Dark, light, and system rehydrate from `tw-theme` (bare string or Zustand JSON) | `useThemeStore` |
| P-THEME-2 | Choosing dark writes it back before the next launch | `useThemeStore` |
| P-API-1 | Health reports `status: ok` and scrape concurrency 3 | `GET /api/health` |

## Automated — negative

| ID | Behaviour | Where |
| --- | --- | --- |
| N-URL-1 | Empty fields, one URL, or QR mode do not start a URL compare | compare gate |
| N-URL-2 | A compare already in flight is not ready | compare gate `loading` |
| N-URL-3 | US Best Buy, Amazon.com, retailer home pages, `javascript:`, and `file:` are invalid | validators |
| N-URL-4 | Two copies of the same product (www / trailing slash / `utm_*`) do not count as two products | client dedupe + `POST /api/compare` 400 distinct |
| N-API-1 | Missing urls, a non-array, blanks, a number mixed in, ftp, javascript, and 4 URLs return 400 and do not scrape | server integration |
| N-API-2 | Blank barcode and empty name-resolution payloads return 400 | server integration |
| N-QR-1 | Empty, Wi-Fi, vCard, and `javascript:` QR payloads are rejected | `extractQrPayload` |
| N-BAR-1 | Empty barcode, Wi-Fi payload, bad check digit, and non-GTIN symbology are rejected | barcode utils |
| N-PRICE-1 | Missing, blank, and `N/A` prices hide the chip | `shouldShowPrice` |
| N-LIB-1 | Empty library copy is “No saved products”; a miss is “Nothing in this filter” | `libraryEmptyCopy` |
| N-LIB-2 | Deleting the last product in a saved comparison removes that comparison | store |
| N-SET-1 | Alternatives for a different comparison id are ignored | store |
| N-THEME-1 | A corrupt stored theme falls back to light | theme store |
| N-ERR-1 | `Failed to fetch` and `Network request timed out` become the offline/timeout message | `userFacingCompareError` |
| N-PERSIST-1 | Corrupt JSON, wrong shape, or malformed entries in `tw-recents` load as empty (or keep only valid entries) without crashing | `sanitizeRecents` |
| N-PERSIST-2 | Old storage version 0 migrates safely | persist `migrate` |
| N-PROG-1 | Unknown or too-short compare progress ids stay `idle` | `GET /api/compare/progress/:id` |

## Automated — edge

| ID | Behaviour | Notes |
| --- | --- | --- |
| E-PERSIST-1 | Store caps at 10 comparisons in memory and on disk; alternatives and spec explanations are not stored | persist test |
| E-PERSIST-2 | Fresh install starts with no recents (no sample data); Home/Library show nothing until storage loads, then the empty state | `hasHydrated` |
| E-TITLE-1 | Three product names still title the recent row from the first two only | Current Home copy. Not a crash. |
| E-TITLE-2 | One name, or only whitespace, does not throw | “Only one” / “Comparison” |
| E-CAP-1 | URL, QR, and barcode batches all cap at 3 | constants |
| E-LIB-1 | The same product id saved twice appears once | first one wins |
| E-THEME-1 | Legacy bare `"dark"` and `{ state: { preference } }` both rehydrate | matches the persist migration |
| E-PASTE-1 | URL clipboard preferred over plain text; image/blank/denied clipboard yields nothing | existing `pasteText.test.ts` |
| E-CLEAR-1 | Clear search history empties recent comparisons | store `clearRecentComparisons` |

## Still manual (no simulator / no live LLM in this run)

| ID | Behaviour | Why it stays manual |
| --- | --- | --- |
| M-PASTE-1 | Tap the Lucide clipboard on iOS and the field fills | Needs TestFlight. Logic is unit-tested; the system permission prompt is not. |
| M-PASTE-2 | Denied clipboard permission does not crash; field stays empty | Device permission UI |
| M-SWIPE-1 | Swipe a URL row left past the threshold to delete it; a short swipe snaps back | Gesture + Reanimated/native driver |
| M-QR-CAM-1 | Camera QR of a real retailer tag adds a product; Wi-Fi QR shows the non-product message | Camera |
| M-QR-SHORT-1 | `amzn.to` / `a.co` expands or shows “Couldn't expand this short link” | Live redirect |
| M-OFFLINE-1 | Airplane mode during compare opens Extraction Failed and Try Again returns to Home | Device network + navigation |
| M-CANCEL-1 | Cancel during scrape aborts and does not open Compare | Overlay timing. Abort is wired in Home; not driven here. |
| M-COMPARE-UI-1 | Loaded compare shows prices, grouped specs, and hides `N/A` | Needs a real `/api/compare` payload on screen |
| M-COMPARE-EMPTY-1 | Opening Compare with nothing loaded shows “No comparison loaded” | Screen render |
| M-ALT-1 | Alternatives empty state “You picked well!” | Needs the alternatives call |
| M-SPEC-1 | Empty spec category shows “No specs available in this category.” | Screen render |
| M-PERSIST-UI-1 | Recents and Library survive force-quit on iOS | Store rehydrate is unit-tested; native cold start not run on a phone here |
| M-THEME-UI-1 | Dark mode still applied after force-quit on iOS | Store rehydrate is tested; native AsyncStorage cold start is not run on a phone here |
| M-HAPTICS-1 | Turning haptics off is felt (no buzz) on a real device | Preference persistence is unit-tested. The motor itself is not. |
| M-LEGAL-1 | Privacy, Terms, Support, Website open the GitHub Pages links | `Linking.openURL` |
| M-TABS-1 | Home, Library, Settings; Price tab stays hidden | Tab layout |
| M-LIVE-1 | Real Best Buy / Canada Computers / Costco / Leon's compare finishes with shelf prices | `npm run uat:edge:full` against Render. Slow and network-dependent. |
| M-PARTIAL-1 | One of three URLs 404s: compare still returns if two scrapes succeed and lists `failedUrls` | Live scrape |

## Known gaps (asserted, not “fixed” here)

- Recent comparison titles ignore the third product name (`E-TITLE-1`).
- The API accepts any http(s) URL shape; product-page checks are client-side. A hand-built client can still ask the server to scrape a home page.
- Full LLM accuracy (wrong summary, thin Leon's pages) is not a unit test. See the live compare notes, not this file.
