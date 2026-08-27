---
name: react-native-design
description: Strict guidelines for building elite, tactile, and highly animated React Native UI components.
---

# React Native Elite Design Skill

When building frontend components for this project, you MUST adhere to the following rules to ensure an enterprise-grade, polished UI:

## 1. Animation & Micro-interactions
- **Reanimated Only:** ALWAYS use `react-native-reanimated` for animations. NEVER use the built-in `Animated` API from `react-native`.
- **Haptics:** Import `expo-haptics`. Trigger `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on button presses, tab switches, and when items successfully load.
- **Pressables:** Instead of `TouchableOpacity`, prefer `Pressable` wrapped with a Reanimated scale effect (scale down to `0.96` on pressIn, return to `1` on pressOut).
- **Staggering:** When rendering lists or tables (like the Spec Table), wrap the rows in a staggered entrance animation using Reanimated's `FadeInDown.delay(index * 50)`.

## 2. Hit Targets
- ALL interactive elements MUST have a minimum tap target of 44x44. If the visual element is smaller, use `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`.

## 3. Styling & Layout
- Strictly follow the colors and typography outlined in `docs/design.md`.
- **Flat Minimalism:** Use clean, flat cards with subtle 1px borders (`#2A2A2A`). Do NOT use Neumorphic shadows or heavy drop shadows. Keep everything crisp and minimal.
- **No Inline Styles:** Always use `StyleSheet.create`.

## 4. Performance
- Use `FlashList` from `@shopify/flash-list` if lists exceed 20 items. Otherwise, `FlatList` is fine.
- Never use inline arrow functions in render loops if they cause unnecessary re-renders. Use `useCallback`.
