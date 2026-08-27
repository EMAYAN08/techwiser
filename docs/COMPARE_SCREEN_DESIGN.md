# Compare Screen — Design Specification

**Version:** 2.0
**Status:** Active
**Owner:** SpecMatch
**Last Updated:** 2026-08-27
**Target:** React Native (Expo SDK 52, iOS 16+ / Android 10+)
**Reference width:** 390pt · Portrait only

---

## 0. Why this version exists

The current `app/compare.tsx` (v1) is structurally a **spec table** — the
advisor scrolls rows of values and finds the green box. That works for a
power user. It fails Jordan, our Phase-1 persona, who needs a 5-second
answer in front of a customer on the sales floor.

This v2 spec turns the same data into a **decision flow**. Specs become
*evidence* under AI-derived insights, not the interface itself. Nothing
is removed — the spec table stays, just demoted to the last section.

| v1 (current) | v2 (this spec) |
|---|---|
| Tabbed categories → table of boxes | AI verdict → priorities → category scores → trade-offs → expandable spec evidence |
| Spec wins/loses highlighted | Specs are evidence; **category winners** are highlighted |
| No personalization | Use-case chips re-rank client-side (no network call) |
| 2 products only (in practice) | Branched layout: 2-up side-by-side vs 3-up horizontal pager |
| Honest gaps hidden | "Not enough verified info" surfaced as a first-class state |

---

## 1. Design tokens (source of truth)

All tokens below already exist in `mobile/constants/Colors.ts` and
`mobile/constants/Typography.ts`. This section is the **index** the
implementation must follow; new tokens are added at the end, not redefined
inline in components.

### 1.1 Color (dark-first, mirrors `Colors.ts`)

| Token | Hex | Use |
|---|---|---|
| `colors.background` | `#0A0A0A` | Screen ground |
| `colors.surface` | `#141414` | Cards, sticky surfaces |
| `colors.surfaceHighlight` | `#1F1F1F` | Pressed states, secondary cards |
| `colors.border` | `#2A2A2A` | 1px hairlines, card edges |
| `colors.text` | `#FFFFFF` | Primary text (renders at 92% opacity in design) |
| `colors.textSecondary` | `rgba(255,255,255,0.6)` | Captions, support copy |
| `colors.textTertiary` | `rgba(255,255,255,0.38)` | Section eyebrows, timestamps |
| `colors.primary` | `#2383E2` | Primary CTA, focus rings, AI verdict border |
| `colors.primaryMuted` | `rgba(35,131,226,0.12)` | AI verdict background fill |
| `colors.success` | `#2EA043` | Category winner, "best for" pill |
| `colors.successMuted` | `rgba(46,160,67,0.08)` | Winner row tint |
| `colors.error` | `#EB5757` | Trade-off severity: dealbreaker |
| `colors.errorMuted` | `rgba(235,87,87,0.1)` | Trade-off: dealbreaker bg |
| `colors.ai` | `#A259FF` | AI confidence indicator, summary eyebrow |
| `colors.aiMuted` | `rgba(162,89,255,0.10)` | AI section fill |

**Light theme** values are already in `Colors.ts` — components consume
`useThemeColors()`. **Never hardcode a hex in a component.**

### 1.2 Spacing (8pt grid, mirrors design.md §4)

```
xs:  4pt   — gap inside a chip, icon-to-text
sm:  8pt   — gap between row of icons, between category header items
md:  16pt  — card padding, gap between cards, page horizontal margin
lg:  24pt  — section separation, between hero card and next section
xl:  32pt  — top of major sections
xxl: 48pt  — sticky CTA + safe-area inset
```

### 1.3 Radius

```
sm:   8pt  — small chips, secondary buttons
md:  12pt  — product card
lg:  16pt  — category score cards, AI verdict card
pill: 999  — priority chips, retailer pills
```

### 1.4 Typography

Reuse the four-scale system in `Typography.ts` (`display`, `headline`,
`body`, `caption`). The compare screen adds two **screen-local** sizes
that map onto the existing scale — do not introduce a new font face.

| Screen role | Existing scale | Notes |
|---|---|---|
| Screen title (`Comparison`) | `headline` (18/600) | Header bar, with tight tracking |
| Section eyebrow (`AI VERDICT`) | `caption` (13/500, uppercase) | Letter-spacing 1, tertiary text |
| AI verdict body | `body` (15/400, 21 lh) | The 1–2 sentence summary |
| Card title (Camera, Battery) | `headline` (18/600) | Category score card heading |
| Spec value (numbers, units) | `body` (15/400) with `fontVariant: ['tabular-nums']` | Critical — values must align |
| Micro label (rank "1st", "2nd") | 12/700, letter-spacing 0.4 | Color-independent winner signal |

**Fonts:** existing `Fonts.primary` (System) and `Fonts.mono` (Menlo /
monospace). Spec values get the mono treatment for table alignment when
the expandable spec group opens.

### 1.5 Motion

Reuse the existing Animated pattern from `components/ui/Button.tsx`
(0.96 scale on press, spring physics, native driver). The compare screen
adds two **specific** motions — do not introduce a new animation library.

- **Mount stagger:** product cards and category score cards fade in with
  `translateY: 10 → 0` over 400ms, 80ms delay per index (currently 100ms
  in `ProductCard.tsx` — reduce to 80ms for the 6 category cards).
- **Spec bar grow:** when a category card expands or a priority chip is
  toggled, the `SpecVisualBar` width animates 0 → target over 250ms with
  ease-out. Use `Animated.timing` (existing) unless a developer measures
  jank, then promote to `react-native-reanimated`.

### 1.6 Elevation

**No drop shadows.** SpecMatch is flat; hierarchy comes from 1px
`colors.border` hairlines and surface tone shifts. Sticky elements
(distinct from non-sticky) earn a `borderBottomWidth: 1, borderBottomColor: colors.border` —
never a shadow.

---

## 2. Screen anatomy (top → bottom)

```
┌──────────────────────────────────────────────┐
│  ←  Comparison                          ⋮    │   App bar (non-sticky, 56pt)
├──────────────────────────────────────────────┤
│ ╭──────────────────────────────────────────╮ │   Sticky product selector
│ │  [Product 1]   vs   [Product 2]          │ │   (pager for 3+)
│ │  RetailerA          RetailerB            │ │
│ │  $1,299             $1,099               │ │
│ ╰──────────────────────────────────────────╯ │
├──────────────────────────────────────────────┤
│  ✦ AI VERDICT                                │   Hero card
│  "The S24 wins on display and zoom; the      │   (16pt rounded, primary
│   iPhone 15 wins on battery efficiency and    │    3px left border, aiMuted bg)
│   long-term resale value."                   │
│  [Best for Zoom: S24] [Best Value: iPhone]   │
├──────────────────────────────────────────────┤
│  What matters to you?                        │   Priority chip row
│  ☐ Camera  ☑ Battery  ☐ Performance  ☐ Value │   (horizontal scroll)
├──────────────────────────────────────────────┤
│  Camera                            1st: S24  │   Category score card
│  "S24's 3× optical zoom is real zoom."       │   (16pt rounded, surface)
│  S24   ████████████████████  50 MP           │   ← SpecVisualBar
│  iP15  ████████████████      48 MP           │
│  [▸ Show 4 specs]                            │   Expand toggle
├──────────────────────────────────────────────┤
│  Battery                           1st: iP15 │
│  ...                                         │
├──────────────────────────────────────────────┤
│  ⚠  Trade-offs & data gaps                   │   Honest section
│  • S24: No headphone jack (caution)          │
│  • iP15: 60Hz display (caution)              │
│  • Battery data 6 months old (medium conf.)  │
├──────────────────────────────────────────────┤
│                                              │
│   ⋮  (scroll continues, more categories)     │
│                                              │
├──────────────────────────────────────────────┤
│  [ View Deals ]   Save  Share  Price Alert   │   Sticky CTA bar
└──────────────────────────────────────────────┘
```

### 2.1 Sticky product selector

**Why sticky:** Jordan is mid-conversation with a customer. They scroll
down to read trade-offs, then glance up — products must still be
identifiable without scrolling back.

- **2 products:** two equal-width cards in a row, `flex: 1` each, 12pt
  gap. Each card shows: product image (44pt), name (truncated to 2
  lines), retailer pill, price.
- **3 products:** **horizontal pager**, not a 3-column grid. 390pt is
  too narrow for 3 product cards to be useful. Use
  `FlatList` horizontal with `pagingEnabled`, `snapToInterval` equal
  to the card width, and a small dot indicator below.
- **Selected product** (in pager): 1px `colors.primary` border,
  `surfaceHighlight` background.
- The selector is **non-tappable for switching tabs** in v2 (the
  Tab-bar comparison is replaced by the priority chips below the
  verdict). Tapping a product card opens the product detail screen —
  that is the existing behaviour in `ProductCard.tsx` and stays.

### 2.2 AI Verdict card

The **single most important element** on the screen. The advisor's
5-second answer.

- Surface: `colors.surface` (16pt radius), with a 3pt left border in
  `colors.primary`. Background fill: `colors.primaryMuted` (8% brand blue).
- Eyebrow: `✦ AI VERDICT` in `caption` scale, `colors.primary`. The
  sparkle character (`✦`) is intentional — it's the only emoji used
  on the screen and signals "AI-generated, read me first."
- Body: `Typography.body` (15/400, 21 line-height), `colors.text`.
  Max 2 sentences. Plain English. **The AI prompt in
  `services/api.ts` must enforce this length** — long verdicts are a
  regression.
- "Best for" pills row beneath the body: `Best for X` in 11/600, white
  on `colors.aiMuted` background, 4pt radius, 6pt horizontal padding.
  Pills wrap to a second line if needed; never truncate.
- Tapping a "Best for" pill scrolls to that product's first winning
  category card.

### 2.3 Priority chip row

**The personalization surface.** Lets Jordan re-rank the verdict
client-side without an API call.

```
[ Camera ] [ Battery✓ ] [ Performance ] [ Display ] [ Gaming ] [ Value ] [ Sound ] →
```

- Default state: nothing selected. Verdict and category winners render
  from `overallRecommendation` (AI's unweighted pick).
- Multi-select. Toggling a chip calls `usePriorityWeighting()` — pure
  client-side math on the cached per-category scores. **Zero network.**
- Selected chip: `colors.primary` background, white text, 1px primary
  border.
- Unselected chip: transparent background, `colors.textSecondary` text,
  1px `colors.border`.
- Chip height: 32pt, horizontal padding 12pt, `pill` radius. Min tap
  target 44pt is honored by `hitSlop` (8pt each side).
- Horizontal scroll with chevron `→` at the right edge when content
  overflows. 8pt gap between chips.

### 2.4 Category score card

One per category — Display, Performance, Battery, Camera, Sound, Value.
Rendered in a `SectionList` so the sticky selector can pin to the top
while categories scroll.

Each card has three states: **collapsed (default)**, **expanded**, and
**loading skeleton**. Skeleton is the same shape with shimmer, not a
spinner.

**Collapsed card contents (top → bottom):**

1. **Header row** — Category icon (16pt) + title (18/600) on the left,
   rank pill (`1st` / `2nd` / `3rd`) in `caption` (12/700) on the right.
   The rank pill is the color-independent winner signal — it stays
   even for colorblind users.
2. **Winner line** — `Winner: <Product Name>` in 13/500, `colors.text`.
3. **Insight** — AI one-liner in 14/400, `colors.textSecondary`.
   Example: "S24's dedicated telephoto gives real optical zoom."
4. **SpecVisualBar × n** — one bar per product. Leader bar in
   `colors.success`; other bars in `colors.textTertiary` (so they
   recede). Bar width = `normalized` (0–1) × 100%. Numeric value
   labelled at the bar's end in 13/500 mono.
5. **Expand toggle** — `▸ Show N specs` in 13/500 `colors.textTertiary`,
   full-width pressable, 36pt tall.

**Expanded card** — adds the `ExpandableSpecGroup` beneath: a list of
`SpecRow`s grouped logically (e.g. *Main sensor · Telephoto · Selfie ·
Video*). Each spec row has its own per-value winner highlight (2px
`colors.success` left border on the winning cell, `successMuted` tint).
This is the **table view** from v1, demoted to evidence.

### 2.5 Trade-off & warnings card

Honesty section. Surfaces what the AI *doesn't* recommend, and data
freshness.

- Single card, `colors.surface`, 16pt radius, 1px border.
- Header: `⚠ Trade-offs & data gaps` in `caption` (13/500, uppercase,
  letter-spacing 1), `colors.textTertiary`.
- Each row: severity icon + product name + text. Severity color:
  - `info` — `colors.textSecondary` text, no icon
  - `caution` — `colors.textSecondary` text, `△` icon in `colors.textTertiary`
  - `dealbreaker` — `colors.error` text + icon
- Confidence row: `Battery benchmarks 6 months old · medium confidence`
  in 12/500, `colors.textTertiary`. The `medium confidence` tag is a
  pill, 1px `colors.border`, 4pt radius.

### 2.6 Sticky CTA bar

Bottom-pinned, 56pt + safe-area. Translucent `colors.surface` with
1px top border. Contents:

- Primary: `[ View Deals → ]` — full width minus the icon actions,
  48pt tall, `colors.primary` background, white text.
- Secondary icons: Save (bookmark), Share (arrow-up), Price Alert
  (bell). Each 44×44pt, `colors.textSecondary` icon, transparent
  background.

In Phase 1 (no price data yet), the primary CTA becomes
`[ Compare with another ]` and the deal button is a disabled
`Coming soon` skeleton — matches PRD F-005.1.

---

## 3. Component tree

```
CompareScreen                          app/compare.tsx
├── StickyProductSelector              components/comparison/StickyProductSelector.tsx
│   ├── ProductMiniCard × 2-3
│   └── PagerDots (only when 3 products)
├── AIVerdictCard                      components/comparison/AIVerdictCard.tsx
│   ├── SparkleIcon
│   └── BestForPill × n
├── PriorityChipRow                    components/comparison/PriorityChipRow.tsx
│   └── PriorityChip × n
├── CategoryList (SectionList)         components/comparison/CategoryList.tsx
│   └── CategoryScoreCard × 6          components/comparison/CategoryScoreCard.tsx
│       ├── CategoryHeader (icon + title + rank)
│       ├── WinnerLine
│       ├── InsightLine
│       ├── SpecVisualBar × n          components/comparison/SpecVisualBar.tsx
│       ├── ExpandToggle
│       └── ExpandableSpecGroup        components/comparison/ExpandableSpecGroup.tsx
│           └── SpecRow × n
│               └── SpecCell × n
├── TradeoffCard                       components/comparison/TradeoffCard.tsx
│   └── TradeoffRow × n
├── StickyCTABar                       components/comparison/StickyCTABar.tsx
│   ├── PrimaryDealButton
│   └── IconAction × 3
└── CompareLoadingSkeleton             components/comparison/CompareLoadingSkeleton.tsx
```

State lives in `CompareScreen`. Children are controlled via props
(replacing the current v1 style of `useState` calls inside sub-blocks
like `ProductHeaderBox` and `SpecResultBoxes`).

---

## 4. Data contract

The existing `Product` type in `store/useComparisonStore.ts` already
has: `id`, `name`, `imageUrl`, `retailer`, `retailerColor`, `price`,
`specs[]`, `badges?`. v2 adds four **AI-side** fields that the
backend (`/api/compare`) must return alongside the existing payload.
These are not stored in the comparison cache directly — they're
returned in the same response and live in a new `ComparisonInsight`
slice of the store.

```ts
// New types in store/useComparisonStore.ts

export type PriorityKey =
  | 'camera' | 'battery' | 'performance' | 'display'
  | 'gaming' | 'value' | 'sound' | 'durability';

export interface CategoryScore {
  productId: string;
  score: number;          // 0–100 within this category
  valueLabel: string;     // human, e.g. "4,400 mAh"
  isWinner: boolean;
  normalized: number;     // 0–1, for SpecVisualBar width
}

export interface CategoryComparison {
  key: PriorityKey;
  title: string;          // "Camera"
  icon: string;           // lucide-react-native icon name
  insight: string;        // AI one-liner
  winnerId: string | null;
  scores: CategoryScore[];
  specGroup: SpecRow[];   // raw specs, expandable
}

export interface Tradeoff {
  productId: string;
  text: string;
  severity: 'info' | 'caution' | 'dealbreaker';
}

export interface DataWarning {
  text: string;
  confidence: 'low' | 'medium' | 'high';
  ageDays?: number;       // surfaces "6 months old" in UI
}

export interface BestForBadge {
  productId: string;
  label: string;          // "Best for Zoom"
}

export interface ComparisonInsight {
  verdict: string;                            // 1–2 sentence summary
  bestFor: BestForBadge[];                    // 1–2 per product
  categories: CategoryComparison[];           // 6 categories
  tradeoffs: Tradeoff[];
  warnings: DataWarning[];
  byPriority: Record<PriorityKey, string>;    // winner per priority key
  bestOverallId: string;
  bestValueId: string;
  generatedAt: string;                        // ISO timestamp
  sourceConfidence: 'low' | 'medium' | 'high';
}
```

**AI prompt contract** (lives in `server/src/services/gemini.ts`):
The Gemini call already runs per-comparison. v2 extends the response
schema with `ComparisonInsight` shape above and instructs the model
to: (a) keep `verdict` to ≤ 2 sentences, (b) return **exactly 6**
categories regardless of product type, (c) include at least one
tradeoff per product or an empty array (never `null`).

---

## 5. Interaction model

| Trigger | Effect | Network? |
|---|---|---|
| User toggles a priority chip | Re-weight category scores client-side; verdict + winner pills re-derive from `byPriority` | No |
| User expands a category card | Animate `ExpandableSpecGroup` height; show raw spec table with per-cell winner highlight | No |
| User collapses | Reverse animation | No |
| User taps a product in sticky selector | Push product detail screen (existing behaviour) | No |
| User taps a `Best for` pill | Scroll `SectionList` to the matching product's first winning category | No |
| Pull to refresh | Re-fetch `/api/compare`, replace cache, preserve scroll position | Yes |
| Tap primary CTA | Phase 1 → "Compare with another" (back to home); Phase 2 → open retailer page | Phase 1: No |
| Tap save / share / alert | Existing hooks (save = store, share = `expo-sharing`, alert = store) | No |
| 3-product comparison | Switch product selector to horizontal pager; render 3 stacked bars in each category card instead of 2 | No |

### 5.1 Client-side re-weighting formula

When a priority chip is toggled, `usePriorityWeighting()` re-derives
the "best for you" winner per category without a network call. The
math is intentionally simple so the team can ship and revise:

```ts
function weightedScore(productId, categories, selectedPriorities) {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const cat of categories) {
    const weight = selectedPriorities.includes(cat.key) ? 2.5 : 1;
    const score = cat.scores.find(s => s.productId === productId)?.score ?? 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  return weightedSum / totalWeight;
}
```

**Note:** the formula weights selected categories ×2.5, default ×1.
The constants are placeholders for v2; **tune them in user testing
before Phase 2**. A 2.5× multiplier may be too aggressive if Jordan
selects 3+ priorities.

### 5.2 The 2-vs-3 product branch

Branch in the `CompareScreen` container, not in individual cards:

```ts
const layoutMode = products.length >= 3 ? 'pager' : 'split';
```

- `split` (2 products): two equal columns, side-by-side bars.
- `pager` (3+ products): horizontal pager selector, **stacked bars**
  within each category card. **Never** force a 3-column spec grid at
  390pt — the values become unreadable, and the PRD explicitly forbids
  it (F-004.7).

### 5.3 Empty / loading / error states

Every state is a **first-class render**, not a branch inside a happy
path. PRD F-008.1 is explicit: no blank screens.

| State | Render |
|---|---|
| Loading (first fetch) | `CompareLoadingSkeleton`: pulsing logo + 6 greyed category cards in the exact final shape (no spinner) |
| Cached (instant) | Render from `useComparisonStore`, then revalidate in background (stale-while-revalidate) |
| Partial failure (1 product missing) | Other 2 products render fully; missing product row in sticky selector shows `—` and a small `!` icon; tapping it opens an inline retry sheet |
| Full failure | `ErrorState` with `Try again` button — reuse the existing `components/home/ErrorOverlay.tsx` pattern |
| No categories returned (very rare) | Trade-off card becomes the dominant element; verdict still renders with category-less recommendation |

---

## 6. Wireframe — 2 products, collapsed

```
390pt
┌──────────────────────────────────────────────┐
│  ←  Comparison                          ⋮    │   56pt
├──────────────────────────────────────────────┤
│ ╭────────────────╮ ╭────────────────╮        │   Sticky
│ │ [img]  S24     │ │  iPhone 15     │        │   96pt
│ │  SAMSUNG        │ │  APPLE          │        │
│ │  $1,299         │ │  $1,099         │        │
│ ╰────────────────╯ ╰────────────────╯        │
├──────────────────────────────────────────────┤
│ ┃  ✦ AI VERDICT                              │   AI card
│ ┃  "The S24 wins on display and zoom; the    │   16pt padding
│ ┃   iPhone 15 wins on battery and resale."   │   3pt primary border
│ ┃  [Best Zoom: S24] [Best Value: iPhone]     │
├──────────────────────────────────────────────┤
│  What matters to you?                        │
│  [ Camera ] [ Battery✓ ] [ Perf ] [ Value ]→ │
├──────────────────────────────────────────────┤
│  📸  Camera                       1st: S24   │   Category card
│  Winner: Galaxy S24                          │   16pt padding
│  "S24's 3× optical zoom is real zoom."       │   12pt row gap
│                                              │
│  S24   ██████████████████  50 MP             │
│  iP15  ███████████████      48 MP             │
│                                              │
│  ▸ Show 4 specs                              │   Expand toggle
├──────────────────────────────────────────────┤
│  🔋  Battery                     1st: iPhone  │   Category card
│  ...                                         │
├──────────────────────────────────────────────┤
│  ⚠  Trade-offs & data gaps                   │   16pt margin-top
│  • S24: No headphone jack (caution)          │
│  • iPhone 15: 60Hz display only (caution)    │
│  • Battery data 6 months old · medium        │
├──────────────────────────────────────────────┤
│  [ View Deals ]   🔖  ↗  🔔                  │   Sticky CTA
└──────────────────────────────────────────────┘
```

### 6.1 Wireframe — 3 products (pager)

The sticky product selector changes only:

```
390pt
┌──────────────────────────────────────────────┐
│ ←  Comparison                                │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐    │   Single product card
│  │ [img]  Galaxy S24                    │    │   in horizontal pager
│  │  SAMSUNG · $1,299                    │    │
│  └──────────────────────────────────────┘    │
│              ● ○ ○                            │   Pager dots
├──────────────────────────────────────────────┤
│  (AI verdict, chips, categories — same as 2-product)
│  (Category cards: bars stack vertically: 3 rows)
```

---

## 7. Accessibility

The PRD is explicit (NF-011 through NF-014). v2 inherits and tightens:

- **Color independence:** every winner indicator pairs a color with a
  non-color signal — `1st` / `2nd` / `3rd` rank pill, `✓` icon, or
  bold weight. **Never** green/red alone.
- **Tap targets:** all chips, expand toggles, and CTA buttons are
  ≥ 44×44pt via intrinsic size or `hitSlop`.
- **Dynamic type:** every `Text` uses `allowFontScaling` (default
  true). Card layouts re-validate at largest accessibility size; the
  sticky selector and category cards must not clip text.
- **Screen reader:** `CategoryScoreCard` reads
  `"Camera. Winner: Galaxy S24. 92 out of 100. 4 specs. Double tap to
  expand."` — wired via `accessibilityRole="summary"`,
  `accessibilityLabel`, and `accessibilityHint`.
- **Reduced motion:** the bar-grow and expand animations are gated
  on `AccessibilityInfo.isReduceMotionEnabled()`. When true, the
  expanded spec group appears immediately without height transition.
- **Focus order:** top-to-bottom, left-to-right within a card. Skip
  links are not needed on a single screen.

---

## 8. Implementation notes

### 8.1 Reuse, don't re-invent

- `Card` (`components/ui/Card.tsx`) is the surface primitive — every
  card on this screen uses it. The 16pt radius becomes the default
  for `CategoryScoreCard` and `AIVerdictCard`.
- `Button` (`components/ui/Button.tsx`) for the primary CTA — its
  existing 0.96 scale + haptic on press is the spec. **Do not write
  a new press animation** in `StickyCTABar`.
- `useThemeColors` is the only color source. The hex literals in
  `app/compare.tsx` lines 177 (`'rgba(35, 131, 226, 0.15)'`) and 194
  (`colors.background`) are a v1 leak — v2 routes everything through
  the token map.
- `ProductCard` already animates fade + slide on mount. v2 keeps the
  same animation primitive but reduces the per-index delay from
  100ms → 80ms so 6 category cards feel snappy.

### 8.2 List rendering

Use `SectionList` (not `ScrollView`) for the body. This is the
**single most important performance change** from v1: 6 category
cards × 6 spec bars + expandable spec groups inside = a real DOM,
and a `ScrollView` will jank on a 3-year-old device (PRD NF-004).
The `StickyHeaderComponent` prop on `SectionList` pins the
`StickyProductSelector` to the top.

### 8.3 Sticky element rendering

The sticky selector and sticky CTA are **outside** the `SectionList`,
rendered as siblings in a `View` with `flex: 1` for the list between
them. This avoids sticky-list bugs on Android where a sticky header
in a `SectionList` can flicker during fast scrolls.

```tsx
<View style={{ flex: 1, backgroundColor: colors.background }}>
  <StickyProductSelector products={products} />
  <SectionList sections={sections} /* ... */ />
  <TradeoffCard /* ... */ />   {/* inline, not sticky */}
  <StickyCTABar /* ... */ />
</View>
```

### 8.4 Caching

`ComparisonInsight` is cached client-side keyed by sorted product
URLs (`productUrls.sort().join('|')`) with a 24h TTL — matches
PRD F-002.7. On a cache hit, the screen renders instantly; a
background revalidation refreshes the insight. The store exposes:

```ts
useComparisonStore.getInsight(productIds): ComparisonInsight | null
useComparisonStore.setInsight(productIds, insight): void
```

### 8.5 Empty/missing data

When a category has no comparable data across products (rare, but
the AI can return it), the category card renders an explicit
"**Not enough verified info**" row instead of hiding the section —
this is the same rule as v1 but stated explicitly. Trust comes
from honesty about gaps (PRD §9 risk: AI extracts wrong values).

### 8.6 What v1 gets **removed** (intentionally)

These v1 elements do not appear in v2 and should be deleted in the
refactor:

- `selectedCategory` state and the horizontal category chip tabs at
  the top — replaced by the priority chips + collapsed-by-default
  category cards.
- `CategoryBox` and its pill-style tab UI.
- `Overview` view — replaced by the AI Verdict card at the top.
- `bigBox` and `specResultBoxesRow` — the winner-highlighted box
  pattern is preserved but moves **inside** the expanded
  `SpecRow`, not as a top-level tab content.
- The hard-coded `vsBadge` / `vsText` "VS" between two product
  values — v2's stacked bars communicate the same idea without
  the inline label.

---

## 9. Acceptance criteria (what "done" means)

Phase 1 v2 ships when **all** of the following are observable on a
real iPhone SE (4.7") and a real Pixel 6a:

- [ ] Tapping a priority chip re-ranks the verdict and the
      per-category "Winner:" line in under 100ms with no network
      call (verify in DevTools network tab).
- [ ] The AI Verdict card is the first non-header element the user
      sees. Its body is ≤ 2 sentences and uses the words "wins on"
      and "best for" naturally.
- [ ] Every category card shows a rank pill (`1st` / `2nd` / `3rd`)
      alongside any color-based winner indicator. Removing all color
      from a screenshot still leaves the winner identifiable.
- [ ] 3-product comparisons use the pager selector and stacked bars
      inside each category card. A 3-column spec grid never appears
      at 390pt width.
- [ ] The expandable spec group inside a category card shows the
      existing v1 spec table (winner-highlighted cells), preserving
      the per-cell winner indication.
- [ ] All hex literals in `app/compare.tsx` are removed; every
      color reads from `useThemeColors()`.
- [ ] Trade-off & warnings card is present even when the AI returns
      zero trade-offs (renders an empty-state line: "No notable
      trade-offs identified").
- [ ] Sticky product selector and sticky CTA bar remain pinned
      through a full scroll, on both iOS and Android, with no
      flicker.
- [ ] No `useNativeDriver: false` on bar-grow or expand animations
      (the Animated API native driver must be used for transform
      and opacity only — height animations use `LayoutAnimation`).
- [ ] SpecTable behaviour from PRD hard rule #16 (2, 3, and 4
      product columns) is honored by `ExpandableSpecGroup`.

---

## 10. Open questions for Phase 2

- **SpecVisualBar** in 4-product mode — does it become a radar chart,
  or stay as 4 stacked bars? The PRD allows 4 products; the current
  spec handles 3. Decide before Phase 2.
- **Best for value** — the "best value" badge is the AI's
  price-to-performance judgment. Phase 1 has no live prices, so the
  badge is currently qualitative. Phase 2 needs a deterministic
  price-to-score formula in the AI prompt.
- **Sticky product selector on landscape** — out of scope (PRD
  NF-019 portrait only), but worth revisiting if a tablet build is
  ever considered.
