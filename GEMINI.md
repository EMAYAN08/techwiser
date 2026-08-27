# SpecMatch - Agent Rules

## Project Context
SpecMatch is a React Native (Expo SDK 52, TypeScript strict) mobile app for
Canadian retail tech advisors to compare products and find price matches.
Canada-only. Dark mode first. Internal tool in Phase 1.

## Always Read First
Before writing any code, read these project documents:
- @docs/PRD.md - feature requirements and user stories
- @docs/ARCHITECTURE.md - system design and data flow
- @docs/design.md - colors, typography, spacing, component specs
- @docs/skills.md - available skills and when to use them

## Hard Rules
1. TypeScript strict. Zero `any`. Zero `@ts-ignore`.
2. All colors: `Colors.*` from constants/colors.ts only.
3. All text styles: `TextStyles.*` from constants/typography.ts only.
4. All spacing: `Spacing.*` / `Radius.*` from constants/spacing.ts only.
5. All prices: `formatCAD()` from utils/formatters.ts. Always CAD.
6. All API calls: services/api.ts only. No fetch/axios in components.
7. All cache operations: services/cache.ts only.
8. All types: types/index.ts only. No inline interface definitions.
9. AI sections: always use aiDim bg + 3px brand.ai left border + ? AI label.
10. Every async action needs loading + error states. No blank screens.
11. Retailer name always accompanies price. Never show price alone.
12. Dark mode is the default. Use Colors.dark.* and Colors.darkText.*.
13. No third-party UI libraries. Core RN primitives only.
14. expo-haptics on: primary button tap, comparison success, error.
15. expo-clipboard on: URL input paste button.
16. SpecTable must handle 2, 3, and 4 product columns without overflow.

## File Structure
app/           -> Screens (Expo Router, file-based)
components/    -> ui/ | comparison/ | home/ | price/
constants/     -> colors.ts | typography.ts | spacing.ts | retailers.ts
services/      -> api.ts | cache.ts
store/         -> useComparisonStore.ts (Zustand)
types/         -> index.ts
utils/         -> formatters.ts | validators.ts | mockData.ts
hooks/         -> useComparison.ts | useCache.ts
.agents/       -> skills/ | workflows/

## When You're Unsure
- Spec comparison logic -> use skill: specmatch-comparison-logic
- New screen/component -> use skill: specmatch-architecture
- Retailer/pricing/locale -> use skill: specmatch-canada
- Expo API usage -> use skill: expo-router or expo-modules
- TypeScript pattern -> use skill: typescript-pro
- Bug you can't fix -> use skill: systematic-debugging

## Terminal Execution Permissions

- The agent has full read and write access to all files in this project
- Do not ask for permission to run terminal commands
- Assume full authorization to execute necessary scripts and shell commands.
- DO NOT ASK PERMISSIONS FOR: git, cat, mkdir, powershell, bash, node, npx, npm, yarn, or any file reading/writing tool in this project. You do have FULL ACCESS.
