import { useEffect, useRef } from "react";
import { PanResponder, Platform, type GestureResponderEvent, type PanResponderGestureState } from "react-native";

export const TAB_ROUTES = ["index", "library", "price", "settings"] as const;
export type TabRouteName = (typeof TAB_ROUTES)[number];

const PATH_TO_TAB: Record<string, TabRouteName> = {
  "/": "index",
  "/library": "library",
  "/price": "price",
  "/settings": "settings",
};

const TAB_TO_PATH: Record<TabRouteName, string> = {
  index: "/",
  library: "/library",
  price: "/price",
  settings: "/settings",
};

export function tabNameFromPath(path: string): TabRouteName | null {
  const p = (path || "/").replace(/\/$/, "") || "/";
  return PATH_TO_TAB[p] ?? null;
}

export function pathForTab(name: TabRouteName): string {
  return TAB_TO_PATH[name];
}

export function adjacentTab(current: TabRouteName, direction: 1 | -1): TabRouteName | null {
  const i = TAB_ROUTES.indexOf(current);
  if (i < 0) return null;
  const next = i + direction;
  if (next < 0 || next >= TAB_ROUTES.length) return null;
  return TAB_ROUTES[next];
}

function isIgnoredTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  let el = target as { tagName?: string; getAttribute?: (n: string) => string | null; parentElement?: unknown } | null;
  while (el) {
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.getAttribute?.("contenteditable") === "true") return true;
    if (el.getAttribute?.("data-tab-swipe-ignore") === "true") return true;
    el = (el.parentElement as typeof el) ?? null;
  }
  return false;
}

function isHorizontalClaim(g: PanResponderGestureState, slop: number): boolean {
  return Math.abs(g.dx) > slop && Math.abs(g.dx) > Math.abs(g.dy) * 1.35;
}

function shouldCommit(g: PanResponderGestureState): boolean {
  return Math.abs(g.dx) > 64 || Math.abs(g.vx) > 0.55;
}

export function createTabSwipeResponder(opts: {
  getPath: () => string;
  onSwipe: (direction: 1 | -1) => void;
  capture?: boolean;
  slop?: number;
}) {
  const slop = opts.slop ?? 18;
  const claim = (e: GestureResponderEvent, g: PanResponderGestureState) => {
    if (!tabNameFromPath(opts.getPath())) return false;
    if (isIgnoredTarget(e.nativeEvent.target)) return false;
    return isHorizontalClaim(g, slop);
  };

  return PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: claim,
    onMoveShouldSetPanResponderCapture: opts.capture ? claim : () => false,
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: (_, g) => {
      if (!shouldCommit(g)) return;
      opts.onSwipe(g.dx < 0 ? 1 : -1);
    },
    onPanResponderTerminate: () => {},
  });
}

export function useWebTabSwipe(opts: {
  getPath: () => string;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let claimed = false;
    let eatClick = false;
    let pointerId: number | null = null;

    const down = (e: PointerEvent) => {
      if (pointerId !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!tabNameFromPath(optsRef.current.getPath())) return;
      if (isIgnoredTarget(e.target)) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      claimed = false;
    };

    const move = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!claimed) {
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
        if (Math.abs(dx) <= Math.abs(dy) * 1.35) {
          tracking = false;
          pointerId = null;
          return;
        }
        claimed = true;
      }
    };

    const finish = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const didSwipe = claimed && Math.abs(dx) > 56;
      tracking = false;
      claimed = false;
      pointerId = null;
      if (!didSwipe) return;
      eatClick = true;
      optsRef.current.onSwipe(dx < 0 ? 1 : -1);
      window.setTimeout(() => {
        eatClick = false;
      }, 320);
    };

    const click = (e: Event) => {
      if (!eatClick) return;
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("pointercancel", finish, true);
    window.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", finish, true);
      window.removeEventListener("pointercancel", finish, true);
      window.removeEventListener("click", click, true);
    };
  }, []);
}
