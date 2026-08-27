# Compare Screen — Design Specification

> A decision-first comparison experience for a React Native tech-product app.
> Compares 2–3 products of the same kind (phones, TVs, headphones, etc.) without
> resorting to a tabular spec sheet. Raw specs become evidence; AI-derived
> insights become the interface.

**Target platform:** React Native (iOS + Android)
**Reference width:** 390 pt (iPhone 14/15 logical width)
**Orientation:** Portrait only
**Format version:** 1.0

---

## 1. Concept

**Goal:** Replace spec tables with a decision-focused flow that helps a user
*choose*, not just *read*.

**Core principle — compare by user outcomes, not raw specs.** Nobody buys
"4,400 mAh." They buy "lasts through a full day of heavy use." The screen leads
with outcome-based verdicts and lets the user drill into specs only when they
want to.

**Design philosophy:** Decision-first, details-on-demand.

- Top-level = AI insight ("Best camera", "Best value", "Trade-offs to know")
- Mid-level = category scores and winner highlights
- Bottom-level = expandable raw spec evidence (for power users)

This means specs are **never removed** — they are demoted to supporting evidence
underneath the insights that actually drive a purchase.

---

## 2. Screen Hierarchy

Vertical scroll. Sections appear top → bottom in this order.

```
┌───────────────────────────────────────────────┐
│  [Sticky] Product Selector (2–3 product cards)│  ← stays pinned while scrolling
├───────────────────────────────────────────────┤
│  AI Verdict Card                              │  ← one-paragraph recommendation
│  "Best for you" badges per product            │
├───────────────────────────────────────────────┤
│  Use-Case / Priority Selector                 │  ← chips: camera, battery,
│  (re-ranks the verdict live)                  │     gaming, price, etc.
├───────────────────────────────────────────────┤
│  Category Score Cards (stacked, not table)     │
│  Display · Performance · Battery · Camera ·   │
│  Sound · Value                                │  each card shows the winner
│                                               │     + a one-line "why"
├───────────────────────────────────────────────┤
│  Trade-off & Warnings                         │  ← honest downsides + gaps
├───────────────────────────────────────────────┤
│  Expandable Spec Groups (details-on-demand)   │  ← raw specs, collapsed
├───────────────────────────────────────────────┤
│  Decision CTA: Save · Share · View deals ·     │  ← sticky bottom bar
│  Set price alert                              │
└───────────────────────────────────────────────┘
```

### 2.1 Section intent

| # | Section | Intent | When to engage |
|---|---------|--------|----------------|
| 1 | Product Selector | Always know *what* you're comparing | Always visible (sticky) |
| 2 | AI Verdict | The 5-second answer | First impression |
| 3 | Priority Selector | Personalize the verdict | User taps a priority |
| 4 | Category Score Cards | Understand *why*, per dimension | Mid-scroll browsing |
| 5 | Trade-offs & Warnings | Catch deal-breakers | Before committing |
| 6 | Expandable Specs | Verify the details | Power-user / skeptic |
| 7 | Decision CTA | Convert intent to action | End of flow |

---

## 3. Component Breakdown

React Native component tree. Each component is presentational unless noted.
State lives in `CompareScreen`; children are controlled via props.

```
CompareScreen
├── ProductCompareHeader        (sticky)
│   └── ProductChip × 2–3
├── AIVerdictCard
│   └── BestForBadge × n
├── UseCaseSelector
│   └── PriorityChip × n
├── CategoryScoreCard × 6       (rendered in a SectionList/FlatList)
│   ├── WinnerRow
│   ├── SpecVisualBar × n
│   └── ExpandableSpecGroup
├── TradeoffCard
├── DealCTA                     (sticky bottom)
└── <LoadingState /> / <ErrorState />
```

### 3.1 `CompareScreen` (container)

- **Purpose:** Orchestrates data fetching, priority state, layout. Owns the
  AI response and the active priority set.
- **Props:** `productIds: string[]`, `category: ProductCategory`
- **State:** `aiResult`, `selectedPriorities: PriorityKey[]`,
  `expandedCategoryIds: Set<string>`, `viewMode: 'simple' | 'details'`,
  `isLoading`, `error`
- **Behavior:** Fetches comparison on mount and whenever `productIds` changes.
  Passes `selectedPriorities` down so child score cards re-rank reactively.

### 3.2 `ProductCompareHeader` (sticky)

- **Purpose:** Sticky header showing the 2–3 products being compared so context
  is never lost while scrolling.
- **Props:** `products: ProductSummary[]`, `activeIndex`, `onSelect`
- **Layout:** Horizontal scroll of compact cards — image (44pt), name, price,
  overall score ring. Selected card lifts slightly.
- **Sticky:** Use `StickyHeaderComponent` on `SectionList` or a
  `position: 'absolute'` + scroll-aware `Animated.ScrollView` header.
- **Note:** For 3 products, prefer a horizontal pager over a 3-column grid on
  phones — 3 columns at 390pt is too cramped.

### 3.3 `AIVerdictCard`

- **Purpose:** The 5-second answer. A short AI paragraph + per-product
  "Best for" badges.
- **Props:** `verdict: string`, `badges: BestForBadge[]`
- **States:** Default; `loading` (shimmer placeholder paragraph).
- **Interaction:** Tapping a badge scrolls to / highlights that product in the
  sticky header.

### 3.4 `UseCaseSelector`

- **Purpose:** Let the user declare *what matters to them*; re-ranks the verdict
  and re-weights category scores live.
- **Props:** `priorities: PriorityKey[]`, `selected`, `onToggle`
- **Layout:** Horizontal wrap of chips (camera, battery, performance, display,
  gaming, productivity, price, durability, ecosystem).
- **Interaction:** Multi-select chips. Selecting "Camera" + "Battery" raises the
  weight of those categories in the overall verdict. No full re-fetch needed —
  re-weighting is client-side from the AI's per-category scores.

### 3.5 `CategoryScoreCard`

- **Purpose:** One card per comparison dimension (Display, Performance, Battery,
  Camera, Sound, Value). Shows the winner + a one-line why, with visual bars.
- **Props:** `category`, `scores: ProductScore[]`, `winnerId`,
  `insight: string`, `isExpanded`, `onToggle`
- **States:** Collapsed (insight + winner only) → Expanded (full spec group).
- **Interaction:** Tap to expand into the `ExpandableSpecGroup` beneath.

### 3.6 `SpecVisualBar`

- **Purpose:** Compare a single numeric spec across products with a horizontal
  bar (e.g. battery capacity, screen brightness, RAM). Replaces a table cell.
- **Props:** `label`, `values: { productId, value, displayValue, normalized }[]`
- **Rendering:** Each product gets a bar scaled to `normalized` (0–1). The leader
  fills fully; others scale proportionally. Winner bar uses `colorPrimary`,
  others use `colorMuted`. Numeric value labeled at the bar's end.
- **Color independence:** The leader also gets a small "✓" or rank label so the
  winner is readable without color.

### 3.7 `ExpandableSpecGroup`

- **Purpose:** Collapsible raw-spec evidence for power users. Grouped
  logically (e.g. Display: size, resolution, refresh rate, brightness,
  panel type).
- **Props:** `title`, `specs: SpecRow[]`, `isExpanded`
- **States:** Collapsed (chevron right) → Expanded (chevron down, height
  animated).
- **Animation:** `LayoutAnimation` or Reanimated height transition, 200ms.

### 3.8 `TradeoffCard`

- **Purpose:** Surface honest downsides and data gaps before the user commits.
- **Props:** `tradeoffs: Tradeoff[]`, `warnings: Warning[]`
- **Content:** "Product A has no headphone jack", "Price data is 3 days old,
  confidence: medium". Each item tagged by product and severity.

### 3.9 `DealCTA` (sticky bottom)

- **Purpose:** Convert decision to action — save comparison, share, view deals,
  set a price alert.
- **Props:** `products`, `onSave`, `onShare`, `onViewDeals`,
  `onSetPriceAlert`
- **Layout:** Sticky bottom bar with a primary "View deals" button and
  secondary icon actions.

---

## 4. Data Contract

The AI model should return comparison-ready **insights**, not just normalized
specs. Feed it the scraped spec JSON and require it to respond in this shape.

```ts
// Shared types
type ProductId = string;
type PriorityKey =
  | 'camera' | 'battery' | 'performance' | 'display'
  | 'gaming' | 'productivity' | 'price' | 'durability'
  | 'ecosystem' | 'sound';

interface ProductSummary {
  id: ProductId;
  name: string;
  brand: string;
  image: string;          // URL
  price?: number;
  currency?: string;
  priceUrl?: string;       // affiliate/deep link
  overallScore: number;    // 0–100
  bestForBadges: string[]; // e.g. "Best camera", "Best value"
}

interface BestForBadge {
  productId: ProductId;
  label: string;           // "Best for photography"
  reason: string;          // one-line why
}

interface ProductScore {
  productId: ProductId;
  score: number;           // 0–100 within this category
  valueLabel: string;      // human, e.g. "4,400 mAh"
  isWinner: boolean;
  normalized: number;      // 0–1, for bar width
}

interface CategoryComparison {
  key: PriorityKey;        // 'display' | 'performance' | ...
  title: string;           // "Display"
  insight: string;         // AI one-liner: "The S24 wins on brightness"
  winnerId: ProductId | null;
  scores: ProductScore[];
  specGroup: SpecRow[];    // raw specs, expandable
}

interface SpecRow {
  label: string;           // "Refresh rate"
  values: { productId: ProductId; displayValue: string }[];
  bestProductId?: ProductId;
}

interface Tradeoff {
  productId: ProductId;
  text: string;            // "No headphone jack"
  severity: 'info' | 'caution' | 'dealbreaker';
}

interface Warning {
  productId?: ProductId;   // omit if comparison-wide
  text: string;            // "Battery test data is 6 months old"
  confidence: 'low' | 'medium' | 'high';
}

interface BuyingAdvice {
  bestOverallId: ProductId;
  bestValueId: ProductId;  // best price-to-performance
  summary: string;         // 1–2 sentence recommendation
  byPriority: Record<PriorityKey, ProductId>; // winner per priority
}

interface SpecSource {
  url: string;
  retrievedAt: string;     // ISO date
  confidence: 'low' | 'medium' | 'high';
}

// ── Root AI response ──────────────────────────────────────────────
interface ComparisonResult {
  products: ProductSummary[];
  overallRecommendation: BuyingAdvice;
  userPriorityRecommendations: Record<PriorityKey, ProductId>;
  categoryComparisons: CategoryComparison[]; // 6 categories
  specHighlights: SpecRow[];                  // headline spec callouts
  tradeoffs: Tradeoff[];
  warnings: Warning[];
  sourceConfidence: SpecSource[];
  generatedAt: string;                        // ISO timestamp
}
```

**Client → AI input:** `{ products: ScrapeSpec[], category }` where
`ScrapeSpec` is the raw scraped spec JSON per product. The AI is responsible for
normalization, scoring, and insight generation.

**Caching:** Key by `productIds.sort().join('|')`. Cache the full
`ComparisonResult` so re-opening a comparison is instant.

---

## 5. Interaction Model

| Trigger | Effect |
|---------|--------|
| User toggles a priority chip | Category scores re-weight client-side; verdict paragraph and "best for you" badge update. No network call. |
| User taps a category card | Expands to reveal `ExpandableSpecGroup` (animated height). Others can stay open or auto-collapse. |
| User taps "Simple / Details" toggle | Toggles whether `ExpandableSpecGroup` sections are pre-expanded (details) or collapsed (simple). |
| User scrolls | Sticky `ProductCompareHeader` stays pinned; product names/images always visible. |
| Missing/uncertain data | Show a confidence pill ("medium confidence") or "Not enough verified info" — never silently omit. |
| Pull to refresh | Re-fetches scrape + AI; respects `sourceConfidence` freshness. |
| Tap a product in header | Scrolls to that product's first winning category. |

**Re-weighting formula (client-side, no re-fetch):**

```
weightedScore(productId) =
  Σ ( categoryScore[productId][key] × weight(key) )
  ─────────────────────────────────────────────────
  Σ weight(key)

where weight(key) = 1 by default, 2.5 if selected as a priority.
```

---

## 6. Design Tokens

Platform-neutral, RN-friendly. Define once in a `theme.ts` and consume via a
`ThemeProvider`. Light + dark parity. Palette derived from a calm neutral base
with one teal accent; color is emphasis, never decoration.

### 6.1 Color

```ts
// theme/tokens.ts
export const light = {
  bg:            '#F7F6F2',
  surface:       '#F9F8F5',
  surfaceAlt:    '#FBFBF9',
  border:        '#D4D1CA',
  text:          '#28251D',
  textMuted:     '#7A7974',
  textFaint:     '#BAB9B4',
  primary:       '#01696F',   // Hydra Teal — CTAs, winner bars
  primaryHover:  '#0C4E54',
  success:       '#437A22',   // "best" / positive
  warning:       '#964219',
  error:         '#A12C7B',
  // data-viz only:
  dataTeal:      '#20808D',
  dataRust:      '#A84B2F',
};

export const dark = {
  bg:            '#171614',
  surface:       '#1C1B19',
  surfaceAlt:    '#201F1D',
  border:        '#393836',
  text:          '#CDCCCA',
  textMuted:     '#797876',
  textFaint:     '#5A5957',
  primary:       '#4F98A3',
  primaryHover:  '#227F8B',
  success:       '#6DAA45',
  warning:       '#BB653B',
  error:         '#D163A7',
  dataTeal:      '#20808D',
  dataRust:      '#A84B2F',
};
```

- Winner bar = `primary`. Non-winner = `textFaint`. Rank label ("1st", "2nd")
  accompanies color so winners are readable for colorblind users.
- Never use red/green alone to signal winner/loser.

### 6.2 Spacing (8pt grid)

```ts
export const space = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};
```

### 6.3 Typography

```ts
export const type = {
  display:   { size: 28, weight: '700', lineHeight: 34 }, // screen title
  heading:   { size: 20, weight: '700', lineHeight: 26 }, // section / card title
  subheading:{ size: 17, weight: '600', lineHeight: 22 }, // product name
  body:      { size: 16, weight: '400', lineHeight: 24 }, // verdict, insight
  bodyBold:  { size: 16, weight: '700', lineHeight: 24 },
  caption:   { size: 13, weight: '500', lineHeight: 18 }, // labels, meta
  micro:     { size: 12, weight: '600', lineHeight: 16 }, // badges
};
```

- Two fonts max: a single sans-serif family (e.g. Inter / SF Pro) across
  weights 400, 600, 700. No display fonts in-app.
- Use `fontVariant: ['tabular-nums']` on all numeric values (scores, prices,
  spec values) so they don't shift.

### 6.4 Cards, Radius, Elevation

```ts
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const card = {
  paddingV: 16, paddingH: 16,
  radius: 16,
  borderWidth: 1,
  light: { bg: '#F9F8F5', border: '#D4D1CA', shadow: 'none' },
  dark:  { bg: '#1C1B19', border: '#393836', shadow: 'none' },
};
export const elevation = {
  // RN shadow props
  none:  { shadowOpacity: 0 },
  card:  { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
           shadowOffset: { width: 0, height: 2 } },
  sticky:{ shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12,
           shadowOffset: { width: 0, height: 4 } },
};
```

Keep shadows subtle — most separation comes from borders + spacing, not depth.

---

## 7. Layout Spec

- **Reference width:** 390pt. Content max width 390 (full-bleed cards with 16pt
  horizontal margin → 358pt content).
- **Vertical scroll** with a single column. No multi-column spec grids on phones.
- **Horizontal** usage is reserved for: product selector chips, priority chips,
  and per-product winner rows inside a category card.
- **Sticky header height:** ~64pt + safe-area inset.
- **Sticky bottom CTA height:** ~56pt + safe-area inset.
- **Card vertical spacing:** 16pt between cards.
- **Score card internal:** 16pt padding, 12pt between spec rows.

### 7.1 Text wireframe (2-product, collapsed)

```
390pt
┌────────────────────────────────────────┐
│ ≡  Compare: Galaxy S24 vs iPhone 15    ⌕  │  ← nav (non-sticky)
├────────────────────────────────────────┤
│ ╭───────────╮  ╭───────────╮            │  ← sticky header
│ │ 🟢 S24    │  │  iPhone 15 │            │
│ │ 4.5★ $799 │  │  4.3★ $829 │            │
│ ╰───────────╯  ╰───────────╯            │
├────────────────────────────────────────┤
│  🤖 AI Verdict                         │
│  "The S24 is the better all-rounder;    │
│   the iPhone 15 wins on ecosystem and   │
│   resale value."                        │
│  [Best Camera: S24] [Best Value: iPhone]│
├────────────────────────────────────────┤
│  What matters to you?                  │
│  (Camera) (Battery) (Price) (Gaming) …  │  ← priority chips
├────────────────────────────────────────┤
│  📸  Camera                       ▾    │
│  Winner: Galaxy S24                     │
│  "S24's telephoto gives real zoom."     │
│  S24  ████████████████ 50MP            │
│  iP15 ████████████ 48MP                │
├────────────────────────────────────────┤
│  🔋  Battery                      ▾    │
│  Winner: iPhone 15                      │
│  "iOS efficiency edges out the S24."    │
│  S24  ████████████ 4,400 mAh           │
│  iP15 ███████████████ 4,089 mAh        │
├────────────────────────────────────────┤
│  ⚠  Trade-offs                         │
│  • S24: no 3.5mm jack (caution)         │
│  • iPhone: 60Hz display only (caution)  │
├────────────────────────────────────────┤
│  [Save] [Share]      [ View Deals → ]    │  ← sticky CTA
└────────────────────────────────────────┘
```

### 7.2 3-product handling

- Product selector becomes a horizontal pager (snap to each), not a 3-up grid.
- Within a category card, show 3 stacked bars instead of 2.
- Verdict paragraph may name a single winner + "runner-up" rather than
  three-way tie-breaking.

---

## 8. Sample Content

Example AI response for a 2-phone comparison (truncated for readability).

```json
{
  "products": [
    { "id": "s24", "name": "Galaxy S24", "brand": "Samsung",
      "image": "https://…/s24.png", "price": 799, "currency": "CAD",
      "overallScore": 88, "bestForBadges": ["Best camera", "Best display"] },
    { "id": "ip15", "name": "iPhone 15", "brand": "Apple",
      "image": "https://…/ip15.png", "price": 829, "currency": "CAD",
      "overallScore": 85, "bestForBadges": ["Best value", "Best ecosystem"] }
  ],
  "overallRecommendation": {
    "bestOverallId": "s24",
    "bestValueId": "ip15",
    "summary": "The Galaxy S24 is the better all-rounder; the iPhone 15 wins on ecosystem and resale.",
    "byPriority": {
      "camera": "s24", "battery": "ip15", "display": "s24",
      "price": "ip15", "performance": "s24"
    }
  },
  "userPriorityRecommendations": {
    "camera": "s24", "battery": "ip15", "price": "ip15"
  },
  "categoryComparisons": [
    {
      "key": "camera",
      "title": "Camera",
      "insight": "The S24's dedicated telephoto gives real optical zoom.",
      "winnerId": "s24",
      "scores": [
        { "productId": "s24", "score": 92, "valueLabel": "50 MP", "isWinner": true, "normalized": 1.0 },
        { "productId": "ip15", "score": 84, "valueLabel": "48 MP", "isWinner": false, "normalized": 0.8 }
      ],
      "specGroup": [
        { "label": "Main sensor", "values": [
          { "productId": "s24", "displayValue": "50 MP" },
          { "productId": "ip15", "displayValue": "48 MP" } ], "bestProductId": "s24" },
        { "label": "Telephoto", "values": [
          { "productId": "s24", "displayValue": "10 MP, 3× optical" },
          { "productId": "ip15", "displayValue": "None (digital only)" } ], "bestProductId": "s24" }
      ]
    }
  ],
  "tradeoffs": [
    { "productId": "s24", "text": "No 3.5mm headphone jack", "severity": "caution" },
    { "productId": "ip15", "text": "Display limited to 60Hz", "severity": "caution" }
  ],
  "warnings": [
    { "text": "Battery benchmarks are 6 months old", "confidence": "medium" }
  ],
  "sourceConfidence": [
    { "url": "https://example.com/specs/s24", "retrievedAt": "2026-08-20", "confidence": "high" }
  ],
  "generatedAt": "2026-08-27T11:00:00Z"
}
```

---

## 9. Accessibility

- **Touch targets:** minimum 44×44 pt for all interactive elements (chips,
  expand toggles, CTA buttons).
- **Dynamic type:** respect system font scaling; use `allowFontScaling` and
  test layouts up to the largest accessibility size.
- **Color independence:** never signal a winner by color alone. Pair every
  colored bar with a rank label ("1st", "2nd") or a check mark. Avoid red/green
  pairings for win/loss.
- **Contrast:** body text 4.5:1 minimum, large text 3:1 (WCAG AA). The token
  palette above meets this in both themes.
- **Screen reader:** every `CategoryScoreCard` announces
  "Camera. Winner: Galaxy S24. 92 out of 100." Use `accessibilityRole`,
  `accessibilityLabel`, and `accessibilityHint` on interactive elements.
- **Reduced motion:** gate the bar-grow and expand animations behind
  `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled()`.
- **Loading/error:** skeleton screens with shimmer for loading; actionable error
  state with a "Retry" button — never a blank screen.

---

## 10. Implementation Notes

- **List rendering:** use `SectionList` for the body (categories as sections),
  or `FlatList` with sticky header support. Avoid rendering all cards in a plain
  `ScrollView` — long comparisons will jank.
- **Sticky header:** `SectionList` supports `StickyHeaderComponent`; or wrap the
  scroll view and use `Animated.ScrollView` + `onScroll` to drive a sticky
  header opacity/translate.
- **Animation:** keep it minimal — `LayoutAnimation` for expand/collapse, and
  a 600–800ms width animation on `SpecVisualBar` when data or priority changes.
  Reach for `react-native-reanimated` only if `Animated` proves janky.
- **State separation:** keep raw scraped specs (`ScrapeSpec`) separate from AI
  insights (`ComparisonResult`) in your store. Re-scraping should not discard a
  cached AI verdict if specs haven't changed.
- **Caching:** cache `ComparisonResult` keyed by sorted `productIds`; show
  cached instantly, revalidate in background (stale-while-revalidate).
- **2 vs 3 products:** branch the layout — 2 products use side-by-side rows,
  3 products use a horizontal pager + stacked bars. Do not force a 3-column
  spec grid on a 390pt-wide screen.
- **Priority re-weighting:** do this client-side from the AI's per-category
  scores (see §5 formula) so toggling a chip is instant and free — no AI
  re-invocation.
- **Data freshness:** surface `sourceConfidence` and `generatedAt` near the
  verdict so users know how stale the comparison is.
- **Empty/missing specs:** render an explicit "Not enough verified info" row
  rather than hiding the category — trust comes from honesty about gaps.

---

## 11. Suggested File Structure

```
src/
├── features/compare/
│   ├── CompareScreen.tsx
│   ├── components/
│   │   ├── ProductCompareHeader.tsx
│   │   ├── AIVerdictCard.tsx
│   │   ├── UseCaseSelector.tsx
│   │   ├── CategoryScoreCard.tsx
│   │   ├── SpecVisualBar.tsx
│   │   ├── ExpandableSpecGroup.tsx
│   │   ├── TradeoffCard.tsx
│   │   └── DealCTA.tsx
│   ├── hooks/
│   │   ├── useComparison.ts        // fetch + cache + revalidate
│   │   └── usePriorityWeighting.ts  // client-side re-rank
│   ├── api/
│   │   └── compareClient.ts        // source collection → AI → ComparisonResult
│   └── types.ts                    // the data contract from §4
└── theme/
    ├── tokens.ts                    // §6 tokens
    └── ThemeProvider.tsx
```

---

## 12. Starter Component Skeleton

Minimal, dependency-free `CompareScreen` to bootstrap from. Pair with the types in
§4 and tokens in §6.

```tsx
// src/features/compare/CompareScreen.tsx
import { useState, useCallback } from 'react';
import { SectionList, RefreshControl, StyleSheet, View } from 'react-native';
import type { ComparisonResult, PriorityKey } from './types';
import { useComparison } from './hooks/useComparison';
import { usePriorityWeighting } from './hooks/usePriorityWeighting';
import { ProductCompareHeader } from './components/ProductCompareHeader';
import { AIVerdictCard } from './components/AIVerdictCard';
import { UseCaseSelector } from './components/UseCaseSelector';
import { CategoryScoreCard } from './components/CategoryScoreCard';
import { TradeoffCard } from './components/TradeoffCard';
import { DealCTA } from './components/DealCTA';

interface Props {
  productIds: string[];
  category: string;
}

export function CompareScreen({ productIds, category }: Props) {
  const { result, isLoading, error, refetch } = useComparison(productIds, category);
  const [priorities, setPriorities] = useState<PriorityKey[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Re-rank verdict client-side when priorities change — no network call.
  const ranked = usePriorityWeighting(result, priorities);

  const togglePriority = useCallback((key: PriorityKey) => {
    setPriorities((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key],
    );
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  if (isLoading || !result) {
    return <LoadingSkeleton />; // shimmer placeholders
  }
  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  const sections = [
    { title: '', data: [{}], renderItem: () => <AIVerdictCard result={ranked} /> },
    { title: '', data: [{}], renderItem: () => (
      <UseCaseSelector selected={priorities} onToggle={togglePriority} />
    ) },
    ...result.categoryComparisons.map((c) => ({
      title: c.title,
      data: [c],
      renderItem: () => (
        <CategoryScoreCard
          category={c}
          isExpanded={expanded.has(c.key)}
          onToggle={() => toggleCategory(c.key)}
        />
      ),
    })),
  ];

  return (
    <View style={styles.container}>
      <SectionList
        stickyHeaderHiddenOnScroll={false}
        StickyHeaderComponent={() => (
          <ProductCompareHeader products={result.products} />
        )}
        sections={sections}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={styles.list}
      />
      <TradeoffCard tradeoffs={result.tradeoffs} warnings={result.warnings} />
      <DealCTA products={result.products} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'bg' },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  gap: { height: 16 },
});

function LoadingSkeleton() { return null; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return null; }
```

Key points this skeleton encodes:

- `SectionList` for the body; `StickyHeaderComponent` keeps products visible.
- `usePriorityWeighting` re-ranks client-side from cached category scores —
  toggling a chip is instant and costs no AI call.
- Expand/collapse is local state keyed by category id.
- Pull-to-refresh re-runs source collection + AI; cached result shows instantly
  via stale-while-revalidate in `useComparison`.
- Sticky `DealCTA` and `TradeoffCard` sit outside the list so they always pin to
  the bottom.
