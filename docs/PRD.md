# SpecMatch — Product Requirements Document (PRD)
**Version:** 1.0  
**Last Updated:** 2026-08-25  
**Status:** Active  
**Owner:** SpecMatch (Solo)  
**Target Platform:** iOS + Android (Canada-first)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Personas](#3-user-personas)
4. [User Stories](#4-user-stories)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Release Phases](#7-release-phases)
8. [Success Metrics](#8-success-metrics)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Out of Scope](#10-out-of-scope)
11. [Open Questions](#11-open-questions)

---

## 1. Executive Summary

SpecMatch is a mobile application that allows retail tech advisors and consumers to instantly compare two or more products side-by-side — extracting key specifications via AI from any product URL — and to surface pricing for the same product across Canadian online retailers. The product eliminates a high-friction, manual workflow that retail advisors currently perform dozens of times per shift.

The initial release is a **Canadian market, internal advisor tool**. Future releases expand to a consumer-facing product with affiliate revenue and a B2B SaaS offering for retail chains.

---

## 2. Problem Statement

### The Core Pain
Tech advisors at Canadian electronics retailers (Best Buy Canada, The Source, Canada Computers, etc.) are regularly asked by customers to:
1. Explain the real-world difference between two or more products
2. Confirm whether the store can price-match a competitor

Today, advisors either:
- Recall specs from memory (error-prone, confidence-degrading for the customer)
- Open multiple browser tabs on a personal phone or in-store kiosk (slow, unprofessional appearance)
- Use the retailer's own comparison tool (limited to same-store products, no AI insight)

This creates friction during the sales conversation and can lead to lost sales or inaccurate product recommendations.

### The Opportunity
No dedicated mobile tool exists that:
- Works across multiple Canadian retailers simultaneously
- Uses AI to extract and normalize specs from any product URL
- Generates plain-English summaries of which product is better for which use case
- Shows live competitor pricing for price-match scenarios

---

## 3. User Personas

### Persona A — The Tech Advisor (Primary, Phase 1)
**Name:** Jordan, 24  
**Role:** Part-time tech advisor, Best Buy Canada  
**Device:** Personal iPhone or Android, used during shift  
**Goals:** Close more sales confidently, answer customer questions faster, avoid embarrassment from wrong spec recall  
**Frustrations:** Slow in-store kiosks, no tool designed for advisor workflows, can't easily compare across brands  
**Tech Comfort:** High — software engineer or CS background not required, but comfortable with apps

### Persona B — The Informed Consumer (Primary, Phase 2)
**Name:** Priya, 31  
**Role:** Consumer researching a laptop purchase before going to a store  
**Device:** iPhone 16, personal use  
**Goals:** Make a confident purchase decision, find the best Canadian price, understand trade-offs simply  
**Frustrations:** Reading 3 different review sites, converting USD prices, finding whether Best Buy Canada carries the same SKU as Amazon.ca  
**Tech Comfort:** Medium — comfortable with apps but not reading spec sheets

### Persona C — The Store Manager (Secondary, Phase 2+)
**Name:** Marcus, 38  
**Role:** Store manager, independent electronics retailer  
**Device:** iPad, in-store  
**Goals:** Arm all staff with a consistent comparison tool, reduce time spent answering repetitive questions  
**Frustrations:** New hires don't know products, training is expensive  
**Tech Comfort:** Low-medium — wants something that works without configuration

---

## 4. User Stories

### Phase 1 — MVP (Internal Advisor Tool)

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-01 | Tech advisor | Paste 2 product URLs and see a side-by-side spec comparison | I can answer customer questions in under 10 seconds | P0 |
| US-02 | Tech advisor | See an AI-generated summary of "who each product is best for" | I can communicate trade-offs without reading every spec line | P0 |
| US-03 | Tech advisor | See key differences highlighted (not all 40 specs) | I know where to direct the customer's attention | P0 |
| US-04 | Tech advisor | Add up to 4 products to a comparison | I can handle three-way comparisons without reloading | P1 |
| US-05 | Tech advisor | See recently compared product pairs | I don't have to re-enter URLs I already used this shift | P1 |
| US-06 | Tech advisor | Paste a URL with one tap (clipboard paste button) | I don't have to type long product URLs | P0 |
| US-07 | Tech advisor | See which retailer each product is from | I know the source of the spec data | P0 |
| US-08 | Tech advisor | Load a cached comparison for a product URL | App is fast on second use without re-fetching | P1 |

### Phase 2 — Consumer-Facing + Price Matching

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-09 | Consumer | See the same product's price across all major Canadian retailers | I can find the cheapest legal price in Canada | P0 |
| US-10 | Tech advisor | Show a customer where the product is cheaper and by how much | I can complete a price match in seconds | P0 |
| US-11 | Consumer | Set a price drop alert for a product | I get notified when the price drops below my target | P1 |
| US-12 | Consumer | Share a comparison with a friend | My partner can review the options before we decide | P1 |
| US-13 | Consumer | Scan a product barcode | I don't have to type or navigate to a product URL | P1 |
| US-14 | Consumer | See price history for a product in Canada | I know whether today's price is actually a good deal | P2 |
| US-15 | Consumer | Filter spec comparison by category (Display, Performance, etc.) | I only see specs that matter to me | P2 |

### Phase 3 — B2B + Monetization

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-16 | Store manager | Create a team account with multiple advisor logins | Every staff member uses the same tool | P0 |
| US-17 | Store manager | See which products customers compare most often | I can stock accordingly and train staff on key comparisons | P1 |
| US-18 | Consumer | Tap a "Buy Now" affiliate link to the cheapest Canadian retailer | I complete my purchase without leaving the app | P0 |

---

## 5. Functional Requirements

### F-001 — URL Input
- **F-001.1:** App accepts 2 to 4 product page URLs as input
- **F-001.2:** Each input field shows a paste button that reads from the system clipboard
- **F-001.3:** App validates URLs as product pages (not home pages or search pages) before enabling the compare button
- **F-001.4:** App detects the Canadian retailer from the URL domain and displays its name and brand color
- **F-001.5:** Supported domains: bestbuy.ca, amazon.ca, canadacomputers.com, memoryexpress.com, newegg.ca, staples.ca, thesource.ca
- **F-001.6:** App shows an inline error if a URL is from an unsupported domain

### F-002 — Spec Extraction
- **F-002.1:** App sends the product URL to the backend, which fetches the page and passes its content to the Gemini API
- **F-002.2:** Gemini extracts key product specifications and returns them as structured JSON
- **F-002.3:** Specs are categorized dynamically based on product type (e.g., Computing, Audio, Appliances), rather than hardcoded to phones (Camera, Battery)
- **F-002.4:** Each spec includes: label, value, category, optional unit, optional numeric value for comparison logic
- **F-002.5:** Extraction must complete within 8 seconds (P99 target)
- **F-002.6:** If extraction fails for one URL, the other products still render with a per-product error state
- **F-002.7:** Extracted product data is cached locally for 24 hours keyed by URL

### F-003 — AI Comparison & Summary
- **F-003.1:** After extraction, Gemini compares all products and identifies key differences (3–5 spec rows)
- **F-003.2:** Gemini generates a 2–3 sentence plain-English summary of "who each product is best for"
- **F-003.3:** Gemini assigns each product 1–2 badges: "Best Overall", "Best Value", "Best Camera", "Best Battery", "Best Performance", "Best Display", "Best for Gaming", "Best for Creators"
- **F-003.4:** AI-generated content is always visually marked with a "✦ AI" indicator
- **F-003.5:** Summary language must be jargon-free and suitable for reading aloud to a customer

### F-004 — Comparison View
- **F-004.1:** Products are shown as horizontal cards in a scroll view at the top
- **F-004.2:** The winning value in each spec row is highlighted (green, bold, left border accent)
- **F-004.3:** The losing value is de-emphasized (muted text, no accent)
- **F-004.4:** Equal values receive neutral styling
- **F-004.5:** Key difference rows appear in a distinct section above the full spec table
- **F-004.6:** Full spec table is grouped by category with collapsible sections
- **F-004.7:** Layout handles 2, 3, and 4 products without horizontal overflow

### F-005 — Price Display (Phase 1 placeholder, Phase 2 active)
- **F-005.1 (Phase 1):** Price section renders as a visible "Coming soon" skeleton — not hidden
- **F-005.2 (Phase 2):** App fetches live pricing for the same product from all supported Canadian retailers
- **F-005.3 (Phase 2):** Prices display with retailer name, CAD price, in-stock status, and price delta vs. lowest
- **F-005.4 (Phase 2):** The cheapest price is highlighted
- **F-005.5 (Phase 2):** Tapping a price opens the product page in the device's default browser

### F-006 — Recent Comparisons
- **F-006.1:** App stores the last 10 comparisons locally
- **F-006.2:** Home screen shows the last 5 comparisons as tappable cards
- **F-006.3:** Tapping a recent comparison restores the full result without re-fetching (if cache is valid)
- **F-006.4:** Each recent card shows: product names, retailer badges, and relative time (e.g., "2h ago")

### F-007 — Product Detail Screen
- **F-007.1:** Tapping a product card navigates to a full spec list for that product only
- **F-007.2:** Detail screen shows all specs, the AI summary, and a "Compare with another" CTA
- **F-007.3:** "Compare with another" pre-populates this product's URL in the Home screen

### F-008 — Loading & Error States
- **F-008.1:** Every async operation shows a loading indicator or skeleton UI — no blank states
- **F-008.2:** Network failures show a specific message and a "Try again" button
- **F-008.3:** Invalid URL shows inline validation error (no toast)
- **F-008.4:** Unsupported retailer shows "We don't support this retailer yet" with a list of supported ones
- **F-008.5:** AI parse failure shows "Couldn't extract specs from this page" with retry

### F-009 — Haptics & Feedback
- **F-009.1:** Primary button tap triggers `ImpactFeedbackStyle.Medium`
- **F-009.2:** Successful comparison load triggers `NotificationFeedbackType.Success`
- **F-009.3:** Error states trigger `NotificationFeedbackType.Error`

---

## 6. Non-Functional Requirements

### Performance
- **NF-001:** App cold start time < 2 seconds on a 3-year-old mid-range device
- **NF-002:** Spec extraction + AI comparison < 8 seconds total (P90)
- **NF-003:** Cached comparison load < 300ms
- **NF-004:** Smooth 60fps scrolling in the spec table with 4 products and 40+ rows

### Reliability
- **NF-005:** App works offline for cached comparisons (graceful degradation, not crash)
- **NF-006:** App handles partial extraction (one product fails, others succeed)
- **NF-007:** Cache TTL is 24 hours. Stale cache is re-fetched silently in background

### Security
- **NF-008:** No user account or authentication in Phase 1 (local-only data)
- **NF-009:** API key for Claude is stored server-side only — never in the app bundle
- **NF-010:** App does not log or transmit product URLs to any analytics service in Phase 1

### Accessibility
- **NF-011:** All interactive elements have accessibility labels
- **NF-012:** Color is never the only indicator of meaning (win/lose states also use icons and text weight)
- **NF-013:** Minimum tap target size: 44x44pt
- **NF-014:** Dynamic Type supported for system font sizes

### Locale
- **NF-015:** All prices display in CAD using `Intl.NumberFormat('en-CA', { currency: 'CAD' })`
- **NF-016:** App is English-only in Phase 1. French (Canadian) is a Phase 3 consideration
- **NF-017:** All Canadian retailers listed by their full Canadian name (not US entity)

### Device
- **NF-018:** iOS 16+ and Android 10+ (API Level 29+)
- **NF-019:** Portrait orientation only (one-handed retail floor usage)
- **NF-020:** Tested on 4.7" (SE) through 6.9" (Pro Max / Ultra) screen sizes

---

## 7. Release Phases

### Phase 1 — MVP Internal Tool (Target: 6 weeks)
**Goal:** A working tool the developer can use on every shift  
**Scope:** URL input → AI spec extraction → comparison view → recent history  
**Not included:** Price matching, barcode scan, user accounts, consumer sharing

**Acceptance Criteria:**
- [ ] 2 product URLs → comparison renders in < 8s
- [ ] AI summary is readable and accurate on 10 real product pairs
- [ ] Works on personal iPhone and Android test device
- [ ] All screens navigable with zero crashes in a 1-hour usage session
- [ ] Caching prevents duplicate API calls for the same URL

### Phase 2 — Consumer-Facing + Price Matching (Target: 3 months post-MVP)
**Goal:** Publish to App Store and Google Play; enable affiliate revenue  
**New features:** Canadian price comparison, affiliate links, price alerts, barcode scan, consumer sharing  
**Technical additions:** Backend API, web fetcher (server-side), affiliate partner integrations

### Phase 3 — B2B SaaS (Target: 6 months post-Phase 2)
**Goal:** Sell team subscriptions to independent retailers  
**New features:** Team accounts, admin dashboard, usage analytics, French (Canadian) localization

---

## 8. Success Metrics

### Phase 1 (Internal validation)
| Metric | Target |
|---|---|
| Comparisons run per shift | ≥ 5 |
| Average extraction time | < 6 seconds |
| Spec accuracy rate (manually verified) | > 90% |
| App crashes per session | 0 |

### Phase 2 (Consumer product)
| Metric | Target (Month 3 post-launch) |
|---|---|
| Monthly active users | ≥ 500 |
| Comparisons per user per month | ≥ 8 |
| Affiliate click-through rate | ≥ 15% |
| App Store rating | ≥ 4.3 |
| Monthly affiliate revenue | ≥ $500 CAD |

### Phase 3 (B2B)
| Metric | Target (Month 6) |
|---|---|
| Paying store accounts | ≥ 5 |
| MRR | ≥ $500 CAD |
| Staff accounts per store | ≥ 3 |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Retailer website structure changes break spec extraction | High | High | Use AI (not regex) for extraction so minor layout changes don't break parsing. Monitor parse success rate. |
| AI extracts wrong spec values | Medium | High | Show source retailer prominently so user can verify. Add spec confidence scores in Phase 2. |
| Canadian retailer blocks server-side fetching | Medium | High | Use rotating user agents + Puppeteer fallback. Consider ScrapingBee as backup. |
| Terms of Service violation for scraping | Medium | Medium | Move to official APIs and affiliate programs in Phase 2. Phase 1 is personal use. |
| Gemini API costs exceed revenue | Low | Medium | Cache aggressively. Batch comparison calls. Monitor tokens/comparison. Target < $0.05 per comparison. |
| Employment agreement conflict (Best Buy Canada) | Low | Low | Tool is personal, on personal device. Does not compete. Review contract before wider distribution. |
| App Store rejection | Low | Medium | Phase 1 is Expo Go / TestFlight, not App Store. Phase 2 review starts early. |

---

## 10. Out of Scope

The following are explicitly **not** in scope for any current phase:

- US retailers (Amazon.com, Best Buy US, etc.) — Canada-only
- Physical in-store price lookup (POS integration)
- Voice-activated comparison
- Product recommendation engine (beyond AI badges)
- Side-by-side video or unboxing content
- User-generated reviews or ratings
- Chat with AI about a product
- Inventory stock checking
- French-language support (Phase 1 and Phase 2)

---

## 11. Open Questions

| # | Question | Owner | Target Resolution |
|---|---|---|---|
| OQ-1 | Which Canadian affiliate programs pay best for electronics categories? | Product | Before Phase 2 |
| OQ-2 | Does Best Buy Canada's employment agreement restrict this tool as-is? | Legal/Personal | Before wider distribution |
| OQ-3 | Should the app use Expo Router tab navigation or stack only? | Engineering | **Resolved:** Expo Router with Tab Navigation (Home, Recent). |
| OQ-4 | Is a Node.js or Python backend better for the web fetcher? | Engineering | **Resolved:** Node.js (Express + Puppeteer/Cheerio) for shared TS ecosystem. |
| OQ-5 | What is the maximum acceptable Gemini API cost per comparison? | Product | Before Phase 1 launch |
| OQ-6 | Should recent comparisons sync across devices in Phase 2? | Product | Before Phase 2 |
| OQ-7 | Will the app support French Canadian specs (product names in FR)? | Product | Phase 3 planning |
