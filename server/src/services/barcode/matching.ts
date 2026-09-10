import { NAME_STOP_WORDS } from "../../config/constants";

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !NAME_STOP_WORDS.has(t));
}

function isModelToken(t: string): boolean {
  return /[a-z]/.test(t) && /\d/.test(t) && t.length >= 4;
}

export function similarName(query: string, candidate: string): boolean {
  const q = tokens(query);
  const cList = tokens(candidate);
  const c = new Set(cList);
  if (q.length === 0 || cList.length === 0) return false;

  const qYears = q.filter((t) => /^20\d{2}$/.test(t));
  const cYears = new Set(cList.filter((t) => /^20\d{2}$/.test(t)));
  if (qYears.length > 0 && !qYears.some((y) => cYears.has(y))) return false;

  const qModels = q.filter(isModelToken);
  const cModels = new Set(cList.filter(isModelToken));
  if (qModels.length > 0) {
    return qModels.some((t) => cModels.has(t));
  }

  const hits = q.filter((t) => c.has(t));
  const need = Math.min(2, q.length);
  if (hits.length < need) return false;
  return hits.length / q.length >= 0.45;
}

export function searchQueryFromTitle(title: string): string {
  const t = title.replace(/[®™]/g, " ").replace(/\s+/g, " ").trim();
  const head = t.split(/\s*[-|–—,:]\s*/)[0].trim();
  return (head.split(/\s+/).length >= 3 ? head : t).slice(0, 80);
}

export function cleanQuery(title: string): string {
  return title
    .replace(/\b(\d+\s?pk|\d+\s?pack|fridge pack|cans?|fl oz|ml|l)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
