import { BROWSER_UA } from "../config/constants";

export async function fetchJson(
  url: string,
  timeoutMs = 7000,
  headers: Record<string, string> = {}
): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
