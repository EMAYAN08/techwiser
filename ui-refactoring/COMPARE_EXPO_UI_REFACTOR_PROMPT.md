# COMPARE APP — UI-ONLY REFACTOR (Expo / React Native)

You are working in an **existing Expo React Native** tech-product comparison app. The product already works. This is a **pure visual refactor** to match the attached mockups and the tokens in `theme.ts`.

If a choice is “make it nicer” vs “keep existing behavior”, **keep the behavior**.

---

## 0. Hard constraints

1. **UI only.** No new features, no removed features, no new tabs, no new screens, no API/schema/store shape changes unless a color/font/asset swap requires it.
2. **Do not rewrite architecture.** Do not eject, do not migrate to a new navigation library, do not add NativeWind / Tamagui / Restyle / Paper if the repo does not already use them. Style with **whatever the repo already uses** (StyleSheet, NativeWind, styled-components, etc.).
3. **Do not change business logic:** URL parse, product fetch, compare, winner scoring, AI copy, recents persistence, currency conversion, haptics gating, share payload, barcode/QR, View Product linking, add-up-to-4-products, clear-history.
4. Bind new chrome to **existing view models / hooks / stores**. Do not invent mock product data that replaces live data.
5. Mockups are layout + chrome truth. If a mockup has garbled AI text, extra junk icons, or the winner ring on the wrong phone, **ignore the junk** and follow this prompt.
6. **One saturated color in the entire app: Lime `#D4FF3A`.** Delete iOS/Android system blue as brand tint, delete purple AI cards, delete extra “winner green”. Platform destructive red is allowed **only** on the confirm-delete alert button.
7. Light **and** dark must both ship. The existing Appearance control (System / Light / Dark) must keep working.

---

## 1. Expo-specific setup (do this first)

### 1.1 Fonts — static TTF only

Expo does **not** fully support variable fonts across iOS + Android. Do **not** load Clash Display Variable or Satoshi Variable.

Download static files from Fontshare (ITF Free Font License — commit the license txt):

- https://www.fontshare.com/fonts/clash-display
- https://www.fontshare.com/fonts/satoshi

Put them in `assets/fonts/` with these **exact filenames** (filename becomes the Android family; iOS uses PostScript — name files to match):

```
assets/fonts/ClashDisplay-Medium.ttf      // 500
assets/fonts/ClashDisplay-Semibold.ttf    // 600
assets/fonts/ClashDisplay-Bold.ttf        // 700
assets/fonts/Satoshi-Regular.ttf          // 400
assets/fonts/Satoshi-Medium.ttf           // 500
assets/fonts/Satoshi-Bold.ttf             // 700
```

Load with `expo-font` **and** the config plugin so they are available before first paint.

`app.json` / `app.config.js` (merge into existing expo-font plugin, do not duplicate):

```json
[
  "expo-font",
  {
    "fonts": [
      "./assets/fonts/ClashDisplay-Medium.ttf",
      "./assets/fonts/ClashDisplay-Semibold.ttf",
      "./assets/fonts/ClashDisplay-Bold.ttf",
      "./assets/fonts/Satoshi-Regular.ttf",
      "./assets/fonts/Satoshi-Medium.ttf",
      "./assets/fonts/Satoshi-Bold.ttf"
    ]
  }
]
```

Also `useFonts` in the existing root `_layout` / `App.tsx` (keep the current splash-hide pattern; do not invent a second splash):

```ts
const [loaded] = useFonts({
  "ClashDisplay-Medium": require("./assets/fonts/ClashDisplay-Medium.ttf"),
  "ClashDisplay-Semibold": require("./assets/fonts/ClashDisplay-Semibold.ttf"),
  "ClashDisplay-Bold": require("./assets/fonts/ClashDisplay-Bold.ttf"),
  "Satoshi-Regular": require("./assets/fonts/Satoshi-Regular.ttf"),
  "Satoshi-Medium": require("./assets/fonts/Satoshi-Medium.ttf"),
  "Satoshi-Bold": require("./assets/fonts/Satoshi-Bold.ttf"),
});
```

Use `fontFamily: "ClashDisplay-Bold"` etc. **Never** `fontWeight: "700"` on a family that has no matching face — on Android that synthesizes fake bold. Each weight is its own file.

Do **not** use the Fontshare CSS API (`api.fontshare.com`) — that is web-only.

### 1.2 Theme wiring

- Copy `theme.ts` into the repo next to the existing theme, **or merge** its values into the existing theme module. One source of truth.
- Drive colors from the **existing Appearance setting**:
  - System → `useColorScheme()`
  - Light / Dark → user override
- Do not add a second AppearanceContext if one exists. Extend the current one.
- `expo-status-bar`: light scheme → `style="dark"`; dark scheme → `style="light"`.
- Navigation theme (`DefaultTheme` / `DarkTheme`): map `colors.background`, `card`, `text`, `border`, `primary` to the tokens. `primary` must **not** stay `#007AFF`.

### 1.3 Do not install new libraries unless missing

Allowed only if not already present and required to load fonts:

- `expo-font` (almost certainly already there)
- `expo-splash-screen` (keep current usage)

Do **not** add: NativeWind, Tamagui, Reanimated, Gesture Handler, Bottom Sheet, Skia, LinearGradient, BlurView — unless already in `package.json`. No glassmorphism, no gradients.

Keep using:

- `expo-haptics` for the existing haptic toggle (do not change when it fires)
- `expo-clipboard` for paste on URL fields
- existing camera / barcode modules for those input modes
- existing navigation (Expo Router or React Navigation — do not switch)

### 1.4 Styling rules for RN

- 4 pt grid. Gutter 20. No magic `13` / `17` / `23`.
- `Pressable` with `android_ripple={null}` or a fog ripple. `style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}`. 150 ms.
- Hit slop so every tappable is ≥ 44 pt.
- `includeFontPadding: false` + `textAlignVertical: "center"` on Android for buttons/chips.
- Tabular numbers on prices: `fontVariant: ["tabular-nums"]`.
- No `PlatformColor` / `SystemPurple` / default `tintColor`.
- Keyboard: keep existing `KeyboardAvoidingView` / `KeyboardStickyView` on Home. Don’t break it.
- Safe areas: keep `SafeAreaView` / `useSafeAreaInsets`. Tab bar sits **above** the home indicator (`insets.bottom + 12`).

---

## 2. Feature inventory — must still work

### Tabs (same 4, same order)
Home · Library · Price · Settings

Keep the **floating capsule** tab bar. Do not switch to a default Expo Tabs / native UITabBar flush to the bottom.

### Home (currently titled “Workspace”)
- Input modes: URL | Name | Barcode | QR. Mode switch still changes the fields.
- Default 2 product fields, each with clipboard paste.
- `+ Add product` appends a field, max 4. Existing remove-field still works.
- Compare disabled until at least 2 valid inputs (same validation).
- Recents: existing titles + relative timestamps; tap opens that comparison.
- **On-screen title** “Workspace” → **“Compare”**. Tab label stays **Home**.

### Library
- 2-col grid of saved products.
- Card: retailer, name, price in selected currency, tags, `+N` overflow.
- Tap → existing product detail.
- Keep any existing search/filter. Do not add one.

### Price
- Keep coming-soon. Do **not** build tracking. Restyle only.

### Settings
- Appearance System / Light / Dark — keep wiring.
- Haptic Feedback toggle — keep wiring to `expo-haptics`.
- Currency row → existing picker (CAD currently).
- Clear Search History → existing confirm + wipe.
- Privacy Policy, Terms → existing routes/links.
- App Version from `expo-constants` / `Application.nativeApplicationVersion`, not a hardcoded `"1.0.0"` unless that’s already how it works.

### Comparison
- Back, title Comparison, Share (same payload).
- 2–4 product header cards (must still adapt to 2, 3, 4).
- Info (`i`) still opens existing product info.
- Winner crown uses **existing winner logic** — only paint changes (lime ring + lime crown).
- Retailer pill bound to real retailer.
- Horizontal chips: Overview, Performance, Display, **and every other category already in the app**. Do not drop Camera/Battery/etc.
- Overview: AI Verdict + Key Differences (existing copy/data).
- Spec tabs: existing comparison engine; ties still highlight both.

### Product detail
- Back, retailer, Share.
- Brand, full name, price in selected currency.
- AI Summary + tags (existing).
- Specs list (existing fields).
- Sticky footer: **View Product** (opens URL) + **Compare** (existing add-to-compare / prefill). Do not swap those actions.
- No tab bar on this pushed screen (same as today).

---

## 3. Design tokens

Import from `theme.ts`. No one-off hex in screens.

### Dual CTA rule (critical)
- **Light primary** = solid **black** pill, **white** label.
- **Dark primary** = solid **lime `#D4FF3A`** pill, **black** label.
- Secondary = ghost: 1.5 pt `line`/`ink` stroke, ink label, transparent fill.
- Light-mode Compare is **not** lime.

### Lime is allowed to mean only
1. Winner (ring, trophy, spec cell, crown)
2. On / selected (haptic toggle ON, selected tab icon, **dark** input-mode segment)
3. Dark-mode primary CTA

### Banned
- `#007AFF` / `tintColor` / `Colors.primary` blue
- Purple / violet AI cards and tags
- Extra greens (`#34C759`, emerald) — winners are lime
- Green prices
- Colored retailer badges (no Best Buy blue)
- `?` on tags

Exception: Clear History **confirm** button may be platform destructive.

---

## 4. Typography

| Role | fontFamily | size | notes |
|---|---|---|---|
| Screen title | ClashDisplay-Bold | 40–42 | tracking -0.8, lineHeight ≈ fontSize. Title case. Never all-caps. |
| Product hero name | ClashDisplay-Bold | 32 | 2–3 lines |
| Product name on card | ClashDisplay-Medium | 16 | max 2 lines |
| Price | ClashDisplay-Medium | 16 / 22 hero | ink, tabular-nums, **never lime** |
| Subtitle / body | Satoshi-Regular | 15 | lineHeight 22 |
| Eyebrow | Satoshi-Medium | 11 | UPPERCASE, letterSpacing 1.6, stone |
| Button | Satoshi-Bold | 16 | |
| Chip | Satoshi-Medium | 13 | |
| Spec label | Satoshi-Medium | 11 | UPPERCASE |
| Spec value | Satoshi-Bold | 16 | |
| Caption / time | Satoshi-Regular | 13 | stone |

Case: sentence case almost everywhere. Title case on screen titles + product names. ALL CAPS = eyebrows only.

---

## 5. Shape / space

- Gutter 20. Section 24–32.
- Field radius 16 (rounded rect, **not** pill). Field height 56.
- Card radius 20. Spec cell 14–16.
- Buttons / chips / tab bar / toggles: pill 999.
- Segment **track** radius 16; **thumb** pill.
- Button height 56. Chip 34. Nav circles 44. Tab bar 64.
- Hairline borders only (`StyleSheet.hairlineWidth` or 1 pt `line` token). **No** card shadows except a soft shadow on the floating tab bar (`shadowOpacity: 0.2`, radius 16, offset `{0, 8}`).
- No BlurView, no LinearGradient, no neon glow.

### Tab bar
- Absolute / tabBar custom component, 12 pt from left/right, `bottom: insets.bottom + 12`.
- Dark capsule `#1A1A1A` (light) / `#141414` (dark).
- 4 items. Selected: lime icon + white label on a slightly lighter inner pill. Unselected: stone.
- Icons: bolt, book, tag, gear (keep current icon pack: `@expo/vector-icons` / SF via `expo-symbols` / lucide-react-native — **do not add a new icon library**).
- Keep existing tab-change haptic if present.

---

## 6. Screen-by-screen

### Home
1. `Compare` ClashDisplay-Bold 42. Subtitle `Any 2–4 tech products.` (or keep the longer original subtitle if you must — prefer the short line).
2. Segmented 52 pt, fog track. Light selected = black/white. Dark selected = lime/black. Items: URL, Name, Barcode, QR. If labels wrap, icon + 11 pt label — do not break “Barcode” onto two lines.
3. Eyebrow `PRODUCT URLS` (swap to NAMES / BARCODES / QR when mode changes — keep existing placeholders).
4. Fields 56 / radius 16 / surface / 1 pt line / trailing clipboard icon stone.
5. Row of two equal buttons, 12 gap: ghost `+ Add product` | primary `Compare`. Hide/disable Add at 4 items as today.
6. Eyebrow `RECENT`. Rows: surface, radius 16, hairline. Leading overlapping circular thumbs (real image if on the model; else fog circle + outline device — **no** Ionicons cube as the hero). Title Satoshi-Medium 16 1-line. Time stone 13.
7. Empty recents: `No comparisons yet` in stone. No illustration.

### Library
- Title `Library` (drop “Tech”). Count caption only if a count already exists.
- 2-col, 12 gutter, 20 inset.
- Card: surface, radius 18, hairline, **no shadow**.
  - 4:5 image well on fog. Real `Image` if URI exists (`contentFit: "cover"` / `resizeMode: "cover"`). Else fog + outline silhouette.
  - Retailer hairline pill, 10 pt caps, stone.
  - Name 14 / 2 lines. Price ClashDisplay-Medium 16 ink.
  - Tags: lime **outline** 1.5, ink text, pill. Overflow `+N` fog chip stone — **never `?`**.
- Keep existing tag strings.

### Price
- Surface card, radius 20, hairline, centered.
- Tag outline icon stone (not lime).
- Title `Coming soon` ClashDisplay-Semibold 28.
- Keep existing body copy.
- No fake charts.

### Settings
- Title `Settings`.
- Grouped inset cards: surface, radius 16, hairline, inner separators.
- Eyebrows: `PREFERENCES`, `DATA` (or keep `DATA & STORAGE`), `ABOUT`.
- Appearance: 3-segment System / Light / Dark. Selected = black fill, white icon (monitor / sun / moon). **No blue.**
- Haptic: use existing Switch. Track ON = lime, thumb white. iOS: `trackColor={{ true: "#D4FF3A", false: stone }}` `thumbColor="#FFFFFF"`. Android: same + `thumbColor` / `trackColor`.
- Currency: `$` + title + trailing `CAD` stone + chevron.
- Clear Search History: **ink** (not red) + trash. Confirm alert unchanged; confirm may be destructive.
- About: keep chevrons; version trailing stone.

### Comparison header (all category tabs)
- 44 fog circles: Back, Share. Ink glyphs. No blue.
- Center `Comparison` Satoshi-Bold 17.
- Header cards in a horizontal row (2/3/4):
  - Surface, radius 20, hairline.
  - Winner: 2 pt lime ring + lime crown top-trailing. Loser: neither.
  - Info top-leading, existing action.
  - Image in fog rounded square.
  - Name ClashDisplay-Medium 16. Price stone 14. Retailer hairline pill.
- Chip `ScrollView` horizontal, 8 gap, `showsHorizontalScrollIndicator={false}`.
  - Selected: black pill, white label + existing icon.
  - Unselected: 1.5 line, transparent fill.
  - Keep every existing category. Peek the next chip (`paddingRight: 20`).

### Overview
**Delete the purple gradient card.**
- AI Verdict: black `#0A0A0A` card, radius 20, padding 20.
  - Lime spark/bolt + `AI VERDICT` lime eyebrow.
  - **Existing AI copy**, white Satoshi-Regular 15, lineHeight 22. Do not rewrite prompts.
- Key Differences: existing rows. Winner cell = lime stroke + limeWash + trophy. Loser = fog, no stroke, stone. Tie = all tied cells get winner treatment.

### Performance and other spec tabs
- Same winner/loser/tie recipe. Do not change which spec wins.
- Labels `PROCESSOR` / `RAM` / `STORAGE` + every spec you already show.
- Equal-width cells, radius 14, gap 8.

### Product detail
- Back circle, retailer pill, share circle.
- Hero `Image` full width ~4:5 if you have a URI. **Do not copy the mockup’s extra camera overlay** — junk.
- Brand stone. Name ClashDisplay-Bold 32 wrapping. Price ClashDisplay-Medium 22 **ink**.
- AI Summary: surface, hairline, radius 20. Lime bolt + `AI summary` ink. Existing copy. Lime-outline tag pills.
- Specs: existing keys/values, hairline separators, label stone left, value ink right.
- Sticky footer on `bg`: ghost `View Product` | primary `Compare`. `position: "absolute"` or SafeArea footer. Same actions as today.

---

## 7. Shared components (build once)

Create (or restyle existing) in the current components folder:

- `PrimaryButton` — 56, pill. Light: bg ink fg white. Dark: bg lime fg limeInk. Disabled opacity 0.3. `includeFontPadding: false`.
- `GhostButton` — 56, pill, 1.5 stroke.
- `Field` — 56, radius 16, trailing icon slot.
- `SegmentedControl` — fog track radius 16, animated thumb 200 ms (`Animated` or existing Reanimated — don’t add Reanimated just for this). Light thumb black; dark thumb lime.
- `Chip` — variants: `selected` (black), `tag` (lime outline), `overflow` (fog).
- `WinnerCell` / `LoserCell`
- `ListCard`
- `NavCircle` — 44 fog
- `RetailerPill`
- `FloatingTabBar` — restyle the existing custom tab bar; don’t replace navigation config.

Do not introduce a filled-blue button variant. Delete unused brand color files after migration.

---

## 8. Non-goals

- No new auth, paywall, onboarding, settings rows.
- Do not implement Price Tracking.
- Do not change AI prompts or winner math.
- Do not rename the Expo `name` / `slug` / bundle id. Only the Home **screen title** becomes Compare.
- Do not add a 5th tab.
- Do not copy mockup garbage (misspellings, extra camera glyph, winner on the wrong product, all-caps LIBRARY).

---

## 9. Implementation order

1. Fonts + merge `theme.ts` + map Appearance to tokens + StatusBar + Navigation theme (kill `#007AFF`).
2. Shared components listed in §7.
3. Home
4. Library
5. Product detail
6. Comparison header + chips + Overview (replace purple card)
7. Spec tabs (replace green cells)
8. Settings
9. Price empty state
10. Dark-mode pass (CTA dual rule) on every screen.
11. Regression §2 + §10.

Work in small diffs. Do not drive-by move files or “clean up” stores.

---

## 10. Acceptance tests

Functional — identical to pre-refactor:
- [ ] 2 pasted URLs → Compare → same products, same comparison.
- [ ] Add to 3 and 4 products; 5th blocked.
- [ ] Name / Barcode / QR still switch and accept the same inputs.
- [ ] Recent opens the same saved comparison; Clear History still wipes after confirm.
- [ ] Winner matches pre-refactor; ties still highlight both.
- [ ] Every previous category chip still exists; tab bodies unchanged.
- [ ] Info `i`, Share, View Product still do the same things.
- [ ] Compare from product detail still does the same thing.
- [ ] Appearance System/Light/Dark still works (System follows OS).
- [ ] Haptic toggle still gates `expo-haptics`.
- [ ] Currency still changes displayed prices.
- [ ] Privacy / Terms / version still work.
- [ ] Android + iOS both load Clash Display / Satoshi (no silent fallback to system font on titles).

Visual:
- [ ] No system blue, no purple, no extra green (except optional destructive confirm).
- [ ] Light primary CTAs black; dark primary CTAs lime.
- [ ] Lime only for winner / on / selected-tab / dark-CTA.
- [ ] Screen titles are Clash Display, not system.
- [ ] Home title is `Compare`.
- [ ] AI Verdict is a black card with lime eyebrow.
- [ ] Tag overflow is `+N`.
- [ ] Prices are ink.
- [ ] Floating capsule tab bar, selected icon lime.
- [ ] iPhone SE / 390-wide: no horizontal overflow, 44 pt targets, tab bar clear of home indicator.
- [ ] Pixel 6 / Android: no clipped fonts, no double-bold, no blue ripples on primary buttons.

---

## 11. Authority order

1. This prompt + `theme.ts`
2. Attached mockups (home-light, home-dark, comparison, performance, product, library, settings)
3. Existing app behavior

Prompt wins over mockup junk. Mockup wins over unspecified spacing. Existing behavior wins over “improvements”.

When done, list every file touched and any behavior you were tempted to change but did not.
