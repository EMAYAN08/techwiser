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

/** Floating bottom dock. Content padding must include the lift, not just the pill height. */
export const dock = {
  height: size.tabBar,
  /** Inset from the left and right screen edges. */
  side: 14,
  /** Gap between the pill and the home indicator (or the screen edge). */
  lift: 12,
} as const;

/** Distance from the bottom of the screen to the floating dock. */
export function dockBottomOffset(bottomInset: number): number {
  const inset = Math.max(bottomInset, 0);
  // When there is no home indicator, still float off the edge.
  return (inset > 0 ? inset : 8) + dock.lift;
}

/** Bottom scroll padding so lists clear the floating dock + home indicator. */
export function tabBarScrollPadding(bottomInset: number, extra: number = 28): number {
  return dock.height + dockBottomOffset(bottomInset) + extra;
}
