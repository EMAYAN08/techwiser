# SpecMatch — Design Specifications

## 1. Design Philosophy
- **Aesthetic:** Strict, Elite Minimalism (inspired by Notion and Linear).
- **Vibe:** Highly polished, extremely clean, flat. No complex shadows or extrusion.
- **Lighting & Depth:** Dark-mode first. Use flat surfaces with ultra-subtle 1px borders (`#2A2A2A`) to define hierarchy. Zero Neumorphic undertones or heavy drop shadows.
- **Lively & Tactile:** Every tap should have a micro-interaction (scale down, opacity change, haptic feedback). Lists and components should stagger-animate on mount.

## 2. Color Tokens
- **Background:** `#0A0A0A` (Deep True Black)
- **Surfaces:** `#141414` (Elevated Cards)
- **Accent/Brand:** `#2383E2` (Vibrant Blue for Primary Actions / AI)
- **Semantic:** 
  - Success: `#2EA043`
  - Danger: `#EB5757`
  - Warning: `#D97706`
- **Text:** 
  - Primary: `rgba(255, 255, 255, 0.92)`
  - Secondary: `rgba(255, 255, 255, 0.60)`
  - Tertiary: `rgba(255, 255, 255, 0.38)`

## 3. Typography
- **Primary Font:** Inter (or System UI if unavailable). Clean, geometric, highly legible.
- **Monospace Font:** SF Mono or JetBrains Mono for spec values and numbers.
- **Hierarchy:**
  - Display: 28px, Bold, tracking tight
  - Headline: 18px, SemiBold
  - Body: 15px, Regular, 140% line height
  - Caption: 13px, Medium, uppercase for section headers

## 4. UI Components & Polish
- **Buttons:** 
  - Primary: Brand Blue background, 8px radius, subtle inner highlight. Pressing scales button to `0.96` with `ImpactFeedbackStyle.Light`.
  - Ghost: Dashed borders or subtle semi-transparent backgrounds `rgba(255,255,255,0.05)`.
- **Inputs:** 
  - Floating labels, 1px `#2A2A2A` border. On focus, border transitions to Brand Blue.
- **Cards (Spec Tables):** 
  - Flat base, but interactive rows. Winning specs receive a subtle green background tint (`rgba(46,160,67,0.1)`) and a sharp 2px green left-border.

## 5. Animation System
- **Library:** React Native `Animated` API (Avoid `react-native-reanimated` as it causes issues).
- **Mount Animations:** Fade and slide up (`translateY: 10 -> 0`) over 400ms using smooth spring physics.
- **Lists:** Staggered entrance for product cards and spec rows (50ms delay per index).
- **Loading States:** No static spinners. Use elegant, shimmering skeletons that match the exact shape of the incoming data, or a lively pulsating logo for the main AI extraction wait time.
