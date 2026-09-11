import { getApiBase } from "../utils/apiBase";

export interface SpecExplanationResponse {
  concept: string;
  breakdowns: {
    productName: string;
    value: string;
    insight: string;
  }[];
}

export interface AlternativeProduct {
  name: string;
  estimatedPrice: string;
  reasonWhyBetter: string;
  url: string;
  imageUrl: string;
  highlights?: string[];
}

export interface AlternativesResponse {
  alternatives: AlternativeProduct[];
}

const MAX_CACHE_ENTRIES = 48;

function remember<T>(map: Map<string, T>, key: string, value: T) {
  if (!key) return;
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > MAX_CACHE_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest == null) break;
    map.delete(oldest);
  }
}

function lookup<T>(map: Map<string, T>, key: string): T | undefined {
  if (!key || !map.has(key)) return undefined;
  const value = map.get(key) as T;
  map.delete(key);
  map.set(key, value);
  return value;
}

function normalizeSpecPart(specLabel: string, specValues: string[]) {
  const label = String(specLabel || "").trim().toLowerCase();
  const values = (Array.isArray(specValues) ? specValues : [])
    .map((v) => String(v ?? "").trim().toLowerCase())
    .join("|");
  return `${label}::${values}`;
}

export function specExplanationKey(specLabel: string, specValues: string[]) {
  return normalizeSpecPart(specLabel, specValues);
}

function comparisonIdOf(comparisonId?: string) {
  return String(comparisonId || "").trim();
}

function alternativesCacheKey(
  comparisonId: string | undefined,
  products: { id?: string; url?: string; name?: string }[]
) {
  const id = comparisonIdOf(comparisonId);
  if (id) return `alt:${id}`;
  const tokens = (products || [])
    .map((p) => {
      const url = String(p.url || "").trim().toLowerCase();
      if (url) return url;
      return String(p.name || "").trim().toLowerCase();
    })
    .filter(Boolean);
  return tokens.length ? `altprod:${tokens.join("||")}` : "";
}

function explainCacheKey(
  comparisonId: string | undefined,
  specLabel: string,
  specValues: string[]
) {
  const id = comparisonIdOf(comparisonId);
  if (!id) return "";
  return `explain:${id}::${normalizeSpecPart(specLabel, specValues)}`;
}

const alternativesCache = new Map<string, AlternativesResponse>();
const alternativesInflight = new Map<string, Promise<AlternativesResponse>>();
const alternativesEpoch = new Map<string, number>();
const explainCache = new Map<string, SpecExplanationResponse>();
const explainInflight = new Map<string, Promise<SpecExplanationResponse>>();
const explainEpoch = new Map<string, number>();

export function peekAlternativesCache(
  comparisonId: string | undefined,
  products: { id?: string; url?: string; name?: string }[] = []
): AlternativesResponse | null {
  const key = alternativesCacheKey(comparisonId, products);
  if (!key) return null;
  return lookup(alternativesCache, key) ?? null;
}

export function peekExplainSpecCache(
  comparisonId: string | undefined,
  specLabel: string,
  specValues: string[]
): SpecExplanationResponse | null {
  const key = explainCacheKey(comparisonId, specLabel, specValues);
  if (!key) return null;
  return lookup(explainCache, key) ?? null;
}

function normalizeExplanation(json: unknown): SpecExplanationResponse {
  const raw = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const breakdowns = Array.isArray(raw.breakdowns)
    ? raw.breakdowns.map((row) => {
        const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
        return {
          productName: String(item.productName ?? ""),
          value: String(item.value ?? ""),
          insight: String(item.insight ?? ""),
        };
      })
    : [];
  return {
    concept: typeof raw.concept === "string" ? raw.concept : "",
    breakdowns,
  };
}

function isUsableExplanation(data: SpecExplanationResponse) {
  return Boolean(data.concept.trim()) || data.breakdowns.some((b) => b.insight.trim() || b.productName.trim());
}

async function readError(response: Response) {
  let errMsg = response.statusText;
  try {
    const errJson = await response.json();
    if (errJson?.error) errMsg = errJson.error;
  } catch {
    /* keep statusText */
  }
  return errMsg || "Unknown error occurred";
}

export async function explainSpec(
  productNames: string[],
  specLabel: string,
  specValues: string[],
  options?: { comparisonId?: string; force?: boolean }
): Promise<SpecExplanationResponse> {
  const key = explainCacheKey(options?.comparisonId, specLabel, specValues);
  if (!options?.force && key) {
    const hit = lookup(explainCache, key);
    if (hit) return hit;
    const inflight = explainInflight.get(key);
    if (inflight) return inflight;
  }

  const epoch = (explainEpoch.get(key) || 0) + 1;
  if (key) explainEpoch.set(key, epoch);

  const run = (async () => {
    const apiUrl = getApiBase();
    const response = await fetch(`${apiUrl}/api/explain-spec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productNames,
        specLabel,
        specValues,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = normalizeExplanation(await response.json());
    if (!isUsableExplanation(data)) {
      throw new Error("Empty spec explanation");
    }
    if (key && explainEpoch.get(key) === epoch) {
      remember(explainCache, key, data);
    }
    return data;
  })();

  if (key) explainInflight.set(key, run);

  try {
    return await run;
  } finally {
    if (key && explainInflight.get(key) === run) {
      explainInflight.delete(key);
    }
  }
}

export async function fetchAlternatives(
  products: { id?: string; name: string; price?: string; retailer?: string; url?: string }[],
  options?: { force?: boolean; comparisonId?: string }
): Promise<AlternativesResponse> {
  const key = alternativesCacheKey(options?.comparisonId, products);
  if (!options?.force && key) {
    const hit = lookup(alternativesCache, key);
    if (hit) return hit;
    const inflight = alternativesInflight.get(key);
    if (inflight) return inflight;
  }

  const epoch = (alternativesEpoch.get(key) || 0) + 1;
  if (key) alternativesEpoch.set(key, epoch);

  const run = (async () => {
    const apiUrl = getApiBase();
    const response = await fetch(`${apiUrl}/api/alternatives`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ products }),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const json = (await response.json()) as AlternativesResponse;
    const normalized: AlternativesResponse = {
      alternatives: Array.isArray(json?.alternatives) ? json.alternatives : [],
    };
    if (key && alternativesEpoch.get(key) === epoch) {
      remember(alternativesCache, key, normalized);
    }
    return normalized;
  })();

  if (key) alternativesInflight.set(key, run);

  try {
    return await run;
  } finally {
    if (key && alternativesInflight.get(key) === run) {
      alternativesInflight.delete(key);
    }
  }
}

export async function resolveProductNames(names: string[]): Promise<string[]> {
  const apiUrl = getApiBase();
  const response = await fetch(`${apiUrl}/api/resolve-names`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ names }),
  });

  if (!response.ok) {
    throw new Error("Failed to resolve product names");
  }

  const json = await response.json();
  return json.urls || [];
}
