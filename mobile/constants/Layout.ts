export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  gutter: 20,
  section: 28,
} as const;

export const radii = {
  field: 16,
  card: 20,
  cardSm: 16,
  library: 18,
  spec: 14,
  nav: 22,
  pill: 999,
} as const;

export const size = {
  field: 56,
  button: 56,
  segment: 52,
  chip: 34,
  tabBar: 64,
  navCircle: 44,
  hit: 44,
  modeWell: 72,
} as const;

/** Bottom scroll padding so content clears the fixed tab bar + home indicator. */
export function tabBarScrollPadding(bottomInset: number, extra: number = 24): number {
  return size.tabBar + Math.max(bottomInset, 0) + extra;
}
