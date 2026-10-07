/**
 * The AsyncStorage web shim reads `window.localStorage`, which Node lacks.
 * Stores that persist on import (e.g. tw-recents) would throw unhandled
 * rejections, so give the test env an in-memory localStorage. Tests that
 * need their own storage still use vi.stubGlobal or vi.mock.
 */
if (typeof (globalThis as any).window === "undefined") {
  const data = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
      setItem: (k: string, v: string) => void data.set(k, String(v)),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
    },
  };
}
