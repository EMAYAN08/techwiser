import { applyTitleEnrichment } from "./titleEnrich";

/**
 * Post-LLM / post-harvest enrichment for sparse or contradictory retailer specs.
 * Pattern-based + small series maps — avoid one-off SKU hardcodes where possible.
 */

export type SpecPair = { label: string; value: string };

function normLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isBlankSpec(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  return !s || /^(n\/a|na|unknown|none|null|undefined|—|–|-)$/i.test(s);
}

function findSpec(specs: SpecPair[], pred: (label: string) => boolean): SpecPair | undefined {
  return specs.find((s) => pred(normLabel(s.label)));
}

function upsertSpec(specs: SpecPair[], label: string, value: string): SpecPair[] {
  const key = normLabel(label);
  const idx = specs.findIndex((s) => normLabel(s.label) === key);
  if (idx >= 0) {
    const next = specs.slice();
    next[idx] = { ...next[idx], value };
    return next;
  }
  return [...specs, { label, value }];
}

function blobOf(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(" \n ");
}

/** Series / model → canonical panel resolution (manufacturer truth). */
const RESOLUTION_SERIES: Array<{ id: RegExp; full: string; short: string; note: string }> = [
  // LG StanbyME 2 (27LX6…) is QHD even when some retailers slug/title say FHD.
  { id: /\b27LX6[A-Z0-9.]*\b/i, full: "2560 x 1440 (QHD)", short: "1440p QHD", note: "LG StanbyME 2 27LX6 series" },
  { id: /\bLX6TYGA\b/i, full: "2560 x 1440 (QHD)", short: "1440p QHD", note: "LG StanbyME 2 LX6TYGA" },
  // Common LG C-series OLED 4K when model encodes C + size (conservative: only clear 4K OLED lines).
  { id: /\b(OLED)?\d{2}C[2-5]\w*\b/i, full: "3840 x 2160 (4K UHD)", short: "4K UHD", note: "LG C-series OLED" },
];

export function inferResolutionFromModel(modelOrTitle: string): { full: string; short: string; note: string } | null {
  const text = modelOrTitle || "";
  if (!text.trim()) return null;
  for (const row of RESOLUTION_SERIES) {
    if (row.id.test(text)) return { full: row.full, short: row.short, note: row.note };
  }
  return null;
}

/** True when retailer/LLM resolution conflicts with a stronger model-derived value. */
export function shouldOverrideResolution(current: string | undefined, inferredShort: string): boolean {
  if (isBlankSpec(current)) return true;
  const cur = current!.toLowerCase();
  const inf = inferredShort.toLowerCase();
  if (cur.includes("1440") || cur.includes("qhd") || cur.includes("2560")) return false;
  // Retailer said FHD / 1080 while model implies QHD/4K/etc.
  if (/(^|[^0-9])1080(p)?\b|fhd|full\s*hd|1920\s*[x×]\s*1080/i.test(cur)) {
    return /1440|qhd|2160|4k|uhd|2560|3840/i.test(inf);
  }
  return false;
}

/** OEM laptop weight hints by model family prefix (kg). Prefer longest prefix match. */
const LAPTOP_WEIGHT_KG: Array<{ prefix: RegExp; weightKg: number; source: string }> = [
  { prefix: /\bUX3405/i, weightKg: 1.28, source: "ASUS Zenbook 14 OLED UX3405" },
  { prefix: /\bTP3407/i, weightKg: 1.57, source: "ASUS Vivobook 14 Flip TP3407" },
  { prefix: /\bUX3402/i, weightKg: 1.3, source: "ASUS Zenbook 14 UX3402" },
  { prefix: /\bG16|GU605/i, weightKg: 1.85, source: "ASUS ROG Zephyrus G16 family (approx)" },
];

export function inferLaptopWeightKg(modelOrTitle: string): { kg: number; label: string; source: string } | null {
  const text = modelOrTitle || "";
  for (const row of LAPTOP_WEIGHT_KG) {
    if (row.prefix.test(text)) {
      return { kg: row.weightKg, label: `${row.weightKg} kg`, source: row.source };
    }
  }
  return null;
}

/** Pull a kg weight from free text when retailer omitted structured weight. */
export function extractWeightKgFromText(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /\bWeight[^.\n]{0,40}?(\d+(?:\.\d+)?)\s*kg\b/i,
    /\b(\d+(?:\.\d+)?)\s*kg\s*\(\s*\d+(?:\.\d+)?\s*lb/i,
    /\b(\d+(?:\.\d+)?)\s*kg\b/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (!m?.[1]) continue;
    const n = Number(m[1]);
    // Laptop/TV panel range guardrails
    if (n >= 0.7 && n <= 30) return `${n} kg`;
  }
  return null;
}


/** Rank marketing resolution tokens. 0 = unknown / not a panel class (e.g. 1920x1200). */
export function resolutionRank(text: string): number {
  const s = text || "";
  if (/\b8k\b|7680/i.test(s)) return 5;
  if (/\b4k\b|2160|3840|\buhd\b/i.test(s)) return 4;
  if (/\bqhd\b|1440|2560/i.test(s)) return 3;
  if (/\bfhd\b|full\s*hd|\b1080p\b|1920\s*[x×]\s*1080/i.test(s)) return 2;
  if (/\b720p\b|1366\s*[x×]\s*768/i.test(s)) return 1;
  return 0;
}

/**
 * When a title or display field claims FHD/1080 but a higher canonical resolution is known,
 * rewrite those tokens. Does not touch 1920×1200 or unlabeled sizes.
 */
export function alignMarketingResolution(text: string, canonical: string): string {
  if (!text || !canonical) return text;
  const canonRank = resolutionRank(canonical);
  if (canonRank < 3) return text;
  if (resolutionRank(text) >= canonRank && !/\b(fhd|full\s*hd|1080p)\b/i.test(text)) return text;
  if (!/\b(fhd|full\s*hd|1080p|1920\s*[x×]\s*1080)\b/i.test(text)) return text;
  // Only upgrade explicit FHD/1080 claims, not a higher-but-different wording already at canon rank.
  if (resolutionRank(text) > canonRank) return text;
  const word = canonRank >= 4 ? "4K" : "QHD";
  const pWord = canonRank >= 4 ? "2160p" : "1440p";
  const grid = canonRank >= 4 ? "3840 x 2160" : "2560 x 1440";
  return text
    .replace(/\bFull\s*HD\b/gi, word)
    .replace(/\bFHD\b/gi, word)
    .replace(/\b1080p\b/gi, pWord)
    .replace(/1920\s*[x×]\s*1080/gi, grid);
}

/** Canonical panel grids. Near-miss widths (3820×2160) are not a real mode. */
const CANONICAL_GRIDS: Array<[number, number]> = [
  [7680, 4320],
  [3840, 2160],
  [2560, 1440],
  [1920, 1080],
];

function formatGrid(w: number, h: number): string {
  return `${w} x ${h}`;
}

function extractPixelGrids(text: string): Array<{ w: number; h: number }> {
  const out: Array<{ w: number; h: number }> = [];
  const re = /(\d{3,5})\s*[x×]\s*(\d{3,5})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ w: Number(m[1]), h: Number(m[2]) });
  }
  return out;
}

/** Snap an off-by-a-few LLM grid onto a real panel size. Does not touch 1920×1200. */
function snapCanonicalGrid(w: number, h: number): { w: number; h: number } | null {
  for (const [cw, ch] of CANONICAL_GRIDS) {
    if (w === cw && h === ch) return null;
    const dw = Math.abs(w - cw);
    const dh = Math.abs(h - ch);
    if (dw <= 40 && dh <= 16 && dw + dh > 0) return { w: cw, h: ch };
  }
  return null;
}

/**
 * Near-miss pixel grids are not real modes (3820×2160 is not UHD).
 * Snap those to the canonical grid. A bare "4K" with no grid is left as 4K.
 * An exact grid the page printed (including 1920×1200) is kept.
 */
export function canonicalizeResolutionValue(value: string, pageText = ""): string {
  if (!value) return value;
  const page = pageText || "";
  const pageGrids = extractPixelGrids(page);
  return value.replace(/(\d{3,5})\s*[x×]\s*(\d{3,5})/gi, (full, aw, ah) => {
    const w = Number(aw);
    const h = Number(ah);
    const snapped = snapCanonicalGrid(w, h);
    if (!snapped) return full;
    // Page explicitly printed this exact (odd) grid — still reject the known UHD typo.
    const uhdTypo = snapped.w === 3840 && snapped.h === 2160 && w >= 3800 && w <= 3880 && Math.abs(h - 2160) <= 16;
    if (uhdTypo) return formatGrid(3840, 2160);
    const pagePrintedOdd = pageGrids.some((g) => g.w === w && g.h === h);
    if (pagePrintedOdd) return full;
    return formatGrid(snapped.w, snapped.h);
  });
}

function isMainsPowerHz(page: string, index: number, hz: number): boolean {
  // Judge only the matched token. A later "50-60Hz" mains line must not void a real 144 Hz.
  const tight = page.slice(Math.max(0, index - 18), index + 8);
  if (/50\s*[-–/]\s*60\s*hz/i.test(tight)) return true;
  if (hz <= 60 && /\b(\d{2,3}\s*v|volts?|voltage|power\s*supply|mains|ac\s*120|100\s*[-–]\s*240)\b/i.test(tight)) {
    return true;
  }
  return false;
}

/**
 * Display refresh figures actually printed on the retailer page / title.
 * Ignores AC mains (50–60 Hz, 120 V) and kHz/GHz.
 */
export function statedRefreshHz(pageText: string): number[] {
  if (!pageText) return [];
  const found: number[] = [];
  const re = /(?<![A-Za-z\d.])(\d{2,3})\s*hz\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pageText))) {
    const n = Number(m[1]);
    if (n < 48 || n > 540) continue;
    const start = Math.max(0, m.index - 56);
    const end = Math.min(pageText.length, m.index + m[0].length + 36);
    const ctx = pageText.slice(start, end);
    if (isMainsPowerHz(pageText, m.index, n)) continue;
    const displayNear =
      /\b(refresh|vrr|variable\s+refresh|g-?\s*sync|freesync|gaming|native|panel|motion|hdmi|display|screen|resolution|qled|oled|qned|mini-?\s*led|\b4k\b|\b8k\b|\bqhd\b)\b/i.test(
        ctx
      );
    const titleStyle = /\d{2,3}\s*hz\b[^.\n]{0,16}\b(tv|monitor|display)\b/i.test(ctx);
    // 50/60 Hz is mains unless the words "refresh" / "native" / "panel" are right there.
    if (n <= 60 && !/\b(refresh|native|panel|gaming)\b/i.test(ctx)) continue;
    if (displayNear || titleStyle || n >= 90) {
      if (!found.includes(n)) found.push(n);
    }
  }
  return found;
}

function pageAffirmsVrr(pageText: string): boolean {
  if (!pageText) return false;
  return /\b(vrr|variable\s+refresh(?:\s+rate)?)\b[^.\n]{0,32}\b(yes|supported|available|enabled|true)\b/i.test(pageText)
    || /\b(yes|supported|available|enabled)\b[^.\n]{0,20}\b(vrr|variable\s+refresh(?:\s+rate)?)\b/i.test(pageText)
    || /\bvrr\b/i.test(pageText);
}

function hzTokens(value: string): number[] {
  const out: number[] = [];
  const re = /(?<![A-Za-z\d.])(\d{2,3})\s*hz\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    const n = Number(m[1]);
    if (n >= 24 && n <= 540 && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * Drop refresh-rate numbers the retailer page never stated.
 * VRR=Yes alone must not become "120 Hz (VRR 165Hz)".
 * When the page does state Hz, those figures win over a conflicting guess.
 * No page text → leave the value (nothing to check against).
 */
export function sanitizeRefreshRate(value: string, pageText = ""): string {
  if (!value || !pageText.trim()) return value;
  const claimed = hzTokens(value);
  if (!claimed.length) return value;
  const pageHz = statedRefreshHz(pageText);
  const invented = claimed.filter((n) => !pageHz.includes(n));
  if (!invented.length) return value;
  const kept = claimed.filter((n) => pageHz.includes(n));
  if (!kept.length) {
    if (pageHz.length) return pageHz.map((n) => `${n} Hz`).join(" / ");
    if (pageAffirmsVrr(pageText)) return "VRR";
    return "Unknown";
  }
  // A parenthetical like "(VRR 165Hz)" was only valid when that number is on the page.
  return kept.map((n) => `${n} Hz`).join(" / ");
}

function isResolutionSpecLabel(label: string): boolean {
  const l = normLabel(label);
  if (!l.includes("resolution")) return false;
  if (/\b(camera|photo|video|front|rear|print)\b/.test(l)) return false;
  return true;
}

function isRefreshSpecLabel(label: string): boolean {
  const l = normLabel(label);
  return l.includes("refresh");
}

/** Shared phone SoC map. Longer / more specific patterns first. */
const CHIPSET_SERIES: Array<{ id: RegExp; chip: string }> = [
  { id: /\biPhone\s*16\s*Pro\b/i, chip: "Apple A18 Pro" },
  { id: /\biPhone\s*16\b/i, chip: "Apple A18" },
  { id: /\biPhone\s*15\s*Pro\b/i, chip: "Apple A17 Pro" },
  { id: /\biPhone\s*15\b/i, chip: "Apple A16 Bionic" },
  { id: /\bPixel\s*9\s*Pro\b/i, chip: "Google Tensor G4" },
  { id: /\bPixel\s*9a\b/i, chip: "Google Tensor G4" },
  { id: /\bPixel\s*9\b/i, chip: "Google Tensor G4" },
  { id: /\bPixel\s*8a\b/i, chip: "Google Tensor G3" },
  { id: /\bPixel\s*8\b/i, chip: "Google Tensor G3" },
];

export function inferChipset(identity: string): string | null {
  const text = identity || "";
  for (const row of CHIPSET_SERIES) {
    if (row.id.test(text)) return row.chip;
  }
  const labeled = text.match(
    /\b(?:chipset|soc|system\s+on\s+a?\s*chip|processor)\b[^.\n]{0,40}?\b((?:Apple\s+)?A1[4-9](?:\s+Pro)?(?:\s+Bionic)?|Google\s+Tensor(?:\s+G\d)?|Snapdragon\s+\d+(?:\s+Gen\s+\d+)?(?:\s+Elite)?)\b/i
  );
  if (labeled?.[1]) return labeled[1].replace(/\s+/g, " ").trim();
  return null;
}

/**
 * Face ID–only Apple phones do not have a fingerprint sensor.
 * iPhone SE and Touch ID devices are left alone. Generic Android face unlock does not qualify.
 */
export function isFaceIdOnlyDevice(identity: string, specs: SpecPair[] = []): boolean {
  const blob = blobOf([identity, ...specs.map((s) => `${s.label} ${s.value}`)]);
  if (/\biPhone\s*SE\b/i.test(blob)) return false;
  if (/\bTouch\s*ID\b/i.test(blob) && !/\bFace\s*ID\b/i.test(blob)) return false;
  if (/\bFace\s*ID\b/i.test(blob)) return true;
  // iPhone X / XS / XR / 11 and newer (not SE, handled above).
  if (/\biPhone\b/i.test(blob) && /\biPhone\s*(?:X\b|XS|XR|1[1-9]|[2-9]\d)/i.test(blob)) return true;
  return false;
}

function chipsetLabel(specs: SpecPair[]): SpecPair | undefined {
  return (
    findSpec(specs, (l) => l.includes("chipset") || l === "soc" || l.includes("system on")) ||
    findSpec(specs, (l) => l === "processor" || l.includes("processor"))
  );
}

function applyChipset(specs: SpecPair[], identity: string): SpecPair[] {
  const existing = chipsetLabel(specs);
  if (existing && !isBlankSpec(existing.value)) return specs;
  const chip = inferChipset(identity);
  if (!chip) return specs;
  const label = existing?.label || "Chipset";
  return upsertSpec(specs, label, chip);
}

function sanitizeBiometrics(specs: SpecPair[], identity: string): SpecPair[] {
  if (!isFaceIdOnlyDevice(identity, specs)) return specs;
  let next = specs.map((s) => {
    if (!/fingerprint/i.test(s.label)) return s;
    if (/^(yes|true|supported|available|enabled)$/i.test(s.value.trim())) return { ...s, value: "No" };
    return s;
  });
  const face = findSpec(next, (l) => l.includes("face id") || l === "face unlock");
  if (!face) next = upsertSpec(next, "Face ID", "Yes");
  else if (isBlankSpec(face.value)) next = upsertSpec(next, face.label, "Yes");
  return next;
}

function applyResolutionWording(specs: SpecPair[], canonical: string): SpecPair[] {
  return specs.map((s) => {
    if (!/display|resolution|screen/i.test(s.label)) return s;
    return { ...s, value: alignMarketingResolution(s.value, canonical) };
  });
}


function panelGridFromText(text: string): string | null {
  if (!text) return null;
  const labeled = text.match(
    /(?:native resolution(?: \(pixels\))?|display resolution|screen resolution|resolution)\s*:\s*(\d{3,5})\s*[x×]\s*(\d{3,5})/i
  );
  if (labeled) return `${labeled[1]} x ${labeled[2]}`;
  const any = text.match(/(\d{3,4})\s*[x×]\s*(2160|1440|1080|1600|1200|1179|2424)/i);
  return any ? `${any[1]} x ${any[2]}` : null;
}

function fillGroundedDisplaySpecs(specs: SpecPair[], pageText: string): SpecPair[] {
  if (!pageText.trim()) return specs;
  let next = specs;
  const hz = statedRefreshHz(pageText);
  const refresh = findSpec(next, (l) => l.includes("refresh"));
  const panelHz = hz.filter((n) => n >= 90);
  const pagePick = (panelHz.length ? panelHz : hz).reduce((max, n) => Math.max(max, n), 0);
  const currentHz = (refresh?.value || "").match(/\d{2,3}(?=\s*hz)/gi)?.map((n) => Number(n)) || [];
  const currentMax = currentHz.reduce((max, n) => Math.max(max, n), 0);
  const refreshBad = !refresh || isBlankSpec(refresh.value) || !/\d+\s*hz/i.test(refresh.value);
  // 48 Hz film rates must not beat a stated 120/165 Hz panel rate.
  const refreshLow = currentMax > 0 && currentMax < 90 && pagePick >= 90;
  if (pagePick && (refreshBad || refreshLow)) {
    next = upsertSpec(next, refresh?.label || "Refresh Rate", `${pagePick} Hz`);
  }
  const grid = panelGridFromText(pageText);
  if (grid) {
    const canonical = canonicalizeResolutionValue(grid, pageText);
    const res = findSpec(next, (l) => isResolutionSpecLabel(l));
    const coarse = !!res && /^(4k|8k|uhd|fhd|qhd|4k uhd|4k ultra hd)$/i.test(res.value.trim());
    const bad = !res || isBlankSpec(res.value) || /\d+\s*mp\b/i.test(res.value) || coarse;
    if (bad) next = upsertSpec(next, res?.label || "Resolution", canonical);
  }
  const hdrMatch = pageText.match(/(?:hdr|high dynamic range)[^:\n]{0,48}:\s*([^\n]+)/i);
  const hdrValue = hdrMatch?.[1]?.trim() || "";
  const hdrSpec = findSpec(next, (l) => /\bhdr\b|high dynamic range/.test(l));
  if (hdrValue && /dolby|hdr10|\bhlg\b/i.test(hdrValue)) {
    const current = hdrSpec?.value || "";
    const richer = hdrValue.length > current.length + 8 && /hdr\s*10\+|\bhlg\b|dolby vision iq/i.test(hdrValue) && !/hdr\s*10\+|\bhlg\b/i.test(current);
    if (!hdrSpec || isBlankSpec(current) || richer) {
      next = upsertSpec(next, hdrSpec?.label || "HDR", hdrValue.slice(0, 180));
    }
  }
  return next;
}

export function enrichProductSpecs(
  rawSpecs: SpecPair[],
  ctx: { title?: string; model?: string; retailerText?: string; deviceHint?: string }
): SpecPair[] {
  let specs = rawSpecs.map((s) => ({ label: s.label, value: String(s.value ?? "") }));
  const modelSpec = findSpec(specs, (l) => l === "model" || l.includes("model number") || l === "model name");
  const identity = blobOf([ctx.model, modelSpec?.value, ctx.title, ctx.retailerText?.slice(0, 4000)]);

  // Resolution: prefer manufacturer series map over FHD slug copy.
  const inferred = inferResolutionFromModel(identity);
  if (inferred) {
    const resSpec =
      findSpec(specs, (l) => l.includes("native resolution") || l === "resolution" || l === "display resolution" || l === "screen resolution") ||
      findSpec(specs, (l) => l.includes("resolution"));
    if (!resSpec || shouldOverrideResolution(resSpec.value, inferred.short) || /1440|qhd|2560/i.test(resSpec?.value || "")) {
      const label = resSpec?.label || "Native Resolution";
      // Canonicalize to the shared short form so key-diffs tie cleanly across retailers.
      specs = upsertSpec(specs, label, inferred.short);
    }
    specs = applyResolutionWording(specs, inferred.short);
  }

  specs = applyChipset(specs, identity);
  specs = sanitizeBiometrics(specs, identity);

  // Laptop weight: OEM series map wins over a shipping-like free-text kg when the model matches.
  const weightSpec = findSpec(specs, (l) => l === "weight" || l === "product weight");
  const looksLaptop =
    /laptop|notebook|zenbook|vivobook|macbook|ultrabook/i.test(identity) ||
    ctx.deviceHint === "laptop" ||
    Boolean(findSpec(specs, (l) => l.includes("processor") || l.includes("ram") || l.includes("ssd")));

  if (looksLaptop && (!weightSpec || isBlankSpec(weightSpec.value))) {
    const fromText = extractWeightKgFromText(ctx.retailerText || "");
    const fromOem = inferLaptopWeightKg(identity);
    const value = (fromOem ? fromOem.label : null) || fromText;
    if (value) {
      specs = upsertSpec(specs, weightSpec?.label || "Weight", value);
    }
  }

  const pageText = blobOf([ctx.title, ctx.retailerText]);
  specs = specs.map((s) => {
    if (isResolutionSpecLabel(s.label)) {
      return { ...s, value: canonicalizeResolutionValue(s.value, pageText) };
    }
    if (isRefreshSpecLabel(s.label)) {
      return { ...s, value: sanitizeRefreshRate(s.value, pageText) };
    }
    return s;
  });

  specs = applyTitleEnrichment(specs, ctx.title || "");
  specs = fillGroundedDisplaySpecs(specs, pageText);

  return specs;
}

function weightBasis(label: string): "with-stand" | "without-stand" | "generic" {
  const l = normLabel(label);
  if (/without\s+stand|no\s+stand|screen\s+only/.test(l)) return "without-stand";
  if (/with\s+stand/.test(l)) return "with-stand";
  return "generic";
}

function annotateWeight(value: string, basis: "with-stand" | "without-stand" | "generic"): string {
  if (isBlankSpec(value)) return value;
  if (/\bwith(?:out)?\s+stand\b/i.test(value)) return value;
  if (basis === "with-stand") return `${value} (with stand)`;
  if (basis === "without-stand") return `${value} (without stand)`;
  return value;
}

/**
 * Prefer a consistent weight basis across products in keyDifferences / groupedSpecs.
 * Avoid comparing "with stand" vs bare panel weight as if equivalent.
 */
export function normalizeWeightComparisons(result: {
  products?: Array<{ rawSpecs?: SpecPair[] }>;
  keyDifferences?: Array<{ label: string; values: string[] }>;
  groupedSpecs?: Record<string, Array<{ label: string; values: string[]; winnerIndex?: number }>>;
}): void {
  const products = result.products || [];
  if (products.length < 2) return;

  const perProduct = products.map((p) => {
    const specs = p.rawSpecs || [];
    const withStand = findSpec(specs, (l) => weightBasis(l) === "with-stand");
    const withoutStand = findSpec(specs, (l) => weightBasis(l) === "without-stand");
    const generic = findSpec(specs, (l) => weightBasis(l) === "generic" && l.includes("weight"));
    return { withStand, withoutStand, generic };
  });

  const anyWithout = perProduct.some((p) => p.withoutStand && !isBlankSpec(p.withoutStand.value));
  const anyWith = perProduct.some((p) => p.withStand && !isBlankSpec(p.withStand.value));
  const preferred: "without-stand" | "with-stand" | "generic" = anyWithout
    ? "without-stand"
    : anyWith
      ? "with-stand"
      : "generic";

  const aligned = perProduct.map((p) => {
    if (preferred === "without-stand") {
      const v = p.withoutStand?.value || p.generic?.value || "—";
      return annotateWeight(v, p.withoutStand ? "without-stand" : p.generic ? "generic" : "without-stand");
    }
    if (preferred === "with-stand") {
      const v = p.withStand?.value || p.generic?.value || "—";
      return annotateWeight(v, p.withStand ? "with-stand" : "generic");
    }
    return p.generic?.value || "—";
  });

  // Only rewrite weight rows when bases were mixed or label is generic Weight.
  const bases = perProduct.map((p) => {
    if (p.withoutStand) return "without-stand";
    if (p.withStand) return "with-stand";
    return "generic";
  });
  const mixed = new Set(bases.filter((b) => b !== "generic")).size + (bases.includes("generic") ? 1 : 0) > 1;

  if (Array.isArray(result.keyDifferences)) {
    result.keyDifferences = result.keyDifferences.map((diff) => {
      if (!/weight/i.test(diff.label)) return diff;
      if (!mixed && preferred === "generic") return diff;
      return {
        ...diff,
        label:
          preferred === "without-stand"
            ? "Weight (without stand)"
            : preferred === "with-stand"
              ? "Weight (with stand)"
              : diff.label,
        values: aligned.map((v, i) => (diff.values[i] != null ? aligned[i] : diff.values[i])),
      };
    });
  }

  if (result.groupedSpecs) {
    for (const [group, specs] of Object.entries(result.groupedSpecs)) {
      result.groupedSpecs[group] = specs.map((spec) => {
        if (!/weight/i.test(spec.label)) return spec;
        if (!mixed && preferred === "generic") return spec;
        return {
          ...spec,
          label:
            preferred === "without-stand"
              ? "Weight (without stand)"
              : preferred === "with-stand"
                ? "Weight (with stand)"
                : spec.label,
          values: aligned,
          winnerIndex: -1,
        };
      });
    }
  }
}


function isCameraResolutionLabel(label: string): boolean {
  return /camera|front[-\s]?facing|rear\b|selfie|video capture|megapixel/i.test(label);
}

function isPanelResolutionLabel(label: string): boolean {
  return /^(resolution|display resolution|native resolution|screen resolution)$/i.test(label.trim()) || /resolution \(pixels\)|native resolution|display resolution|screen resolution/i.test(label);
}

function specMatches(rowLabel: string, specLabel: string): boolean {
  if (normLabel(rowLabel) === normLabel(specLabel)) return true;
  if (/resolution/i.test(rowLabel) && /resolution/i.test(specLabel)) {
    const rowCam = isCameraResolutionLabel(rowLabel);
    const specCam = isCameraResolutionLabel(specLabel);
    const rowPanel = isPanelResolutionLabel(rowLabel);
    const specPanel = isPanelResolutionLabel(specLabel);
    if ((rowCam && specPanel && !specCam) || (specCam && rowPanel && !rowCam)) return false;
    return true;
  }
  if (/refresh/i.test(rowLabel) && /refresh/i.test(specLabel)) return true;
  if (/\bhdr\b|high dynamic range/i.test(rowLabel) && /\bhdr\b|high dynamic range/i.test(specLabel)) return true;
  if (/chipset|processor|soc/i.test(rowLabel) && /chipset|processor|soc/i.test(specLabel)) return true;
  if (/fingerprint/i.test(rowLabel) && /fingerprint/i.test(specLabel)) return true;
  if (/face\s*id/i.test(rowLabel) && /face\s*id/i.test(specLabel)) return true;
  if (/^display$/i.test(rowLabel.trim()) && /^display$/i.test(specLabel.trim())) return true;
  if (/noise cancell|active noise|\banc\b/i.test(rowLabel) && /noise cancell|active noise|\banc\b/i.test(specLabel)) return true;
  if (/bluetooth/i.test(rowLabel) && /bluetooth/i.test(specLabel)) return true;
  if (/form factor|wearing style|ear style/i.test(rowLabel) && /form factor|wearing style|ear style/i.test(specLabel)) return true;
  return false;
}


function pickRawMatch(raw: SpecPair[] | undefined, rowLabel: string): SpecPair | undefined {
  if (!raw?.length) return undefined;
  const exact = raw.find((s) => normLabel(s.label) === normLabel(rowLabel) && !isBlankSpec(s.value));
  if (exact) return exact;
  const hits = raw.filter((s) => specMatches(rowLabel, s.label) && !isBlankSpec(s.value));
  if (isPanelResolutionLabel(rowLabel)) {
    const grid = hits.find((s) => /\d{3,5}\s*[x×]\s*\d{3,5}/.test(s.value) && !isCameraResolutionLabel(s.label));
    if (grid) return grid;
    const panel = hits.find((s) => isPanelResolutionLabel(s.label) && !isCameraResolutionLabel(s.label));
    if (panel) return panel;
  }
  if (/\bhdr\b|high dynamic range/i.test(rowLabel)) {
    const rich = hits.find((s) => /dolby|hdr10|\bhlg\b/i.test(s.value));
    if (rich) return rich;
  }
  return hits.find((s) => !(isPanelResolutionLabel(rowLabel) && isCameraResolutionLabel(s.label)));
}

function squashDigitGaps(value: string): string {
  return value.toLowerCase().replace(/(\d)[,\s](?=\d)/g, "$1");
}

/** A nits claim is kept only when that product's own retailer text states the number. */
export function brightnessClaimGrounded(value: string, pageText: string): boolean {
  const match = String(value || "").match(/(\d[\d,\s]{2,})\s*-?\s*nits?\b/i);
  if (!match) return true;
  const num = match[1].replace(/[,\s]/g, "");
  if (!num || Number(num) < 80) return true;
  const page = squashDigitGaps(pageText || "");
  if (!page.includes(num)) return false;
  return /nit|brightness|cd\/m/.test(page);
}

function scrubUngroundedBrightness(
  result: any,
  productDataList?: Array<{ retailerText?: string; title?: string }>
): void {
  const pages = (productDataList || []).map((item) => `${item?.title || ""}\n${item?.retailerText || ""}`);
  const scrub = (value: string, index: number) => (brightnessClaimGrounded(value, pages[index] || "") ? value : "—");
  for (let i = 0; i < (result.products || []).length; i++) {
    const specs = result.products[i]?.rawSpecs;
    if (!Array.isArray(specs)) continue;
    result.products[i].rawSpecs = specs.map((spec: SpecPair) => ({
      ...spec,
      value: scrub(String(spec.value || ""), i),
    }));
  }
  if (result.groupedSpecs && typeof result.groupedSpecs === "object") {
    for (const specs of Object.values(result.groupedSpecs) as Array<Array<{ values: string[] }>>) {
      for (const spec of specs || []) {
        if (!Array.isArray(spec.values)) continue;
        spec.values = spec.values.map((value, i) => scrub(String(value || ""), i));
      }
    }
  }
  if (Array.isArray(result.keyDifferences)) {
    for (const diff of result.keyDifferences) {
      if (!Array.isArray(diff?.values)) continue;
      diff.values = diff.values.map((value: string, i: number) => scrub(String(value || ""), i));
    }
  }
}


function ensureGroupedRows(result: any, patterns: RegExp[], groupName: string): void {
  const products = result.products || [];
  if (!products.length) return;
  result.groupedSpecs = result.groupedSpecs && typeof result.groupedSpecs === "object" ? result.groupedSpecs : {};
  const existing: Array<{ label: string; values: string[] }> = Object.values(result.groupedSpecs).flatMap((rows: any) =>
    Array.isArray(rows) ? rows : []
  );
  for (const pattern of patterns) {
    const sample = products
      .map((p: any) => (p.rawSpecs || []).find((s: SpecPair) => pattern.test(s.label) && !isBlankSpec(s.value)))
      .find(Boolean) as SpecPair | undefined;
    if (!sample) continue;
    if (existing.some((row) => specMatches(sample.label, row.label) || pattern.test(row.label))) continue;
    const values = products.map((p: any) => {
      const hit = (p.rawSpecs || []).find((s: SpecPair) => pattern.test(s.label) && !isBlankSpec(s.value));
      return hit ? hit.value : "—";
    });
    if (values.every((v: string) => isBlankSpec(v))) continue;
    result.groupedSpecs[groupName] = [...(result.groupedSpecs[groupName] || []), { label: sample.label, values, winnerIndex: -1 }];
    existing.push({ label: sample.label, values });
  }
}

export function enrichComparisonSpecs(result: any, productDataList?: Array<{ retailerText?: string; title?: string }>): void {
  if (!result || !Array.isArray(result.products)) return;

  result.products = result.products.map((p: any, i: number) => {
    const rawSpecs: SpecPair[] = Array.isArray(p.rawSpecs)
      ? p.rawSpecs.map((s: any) => ({ label: String(s.label || s.name || ""), value: s.value == null ? "—" : String(s.value) }))
      : [];
    const enriched = enrichProductSpecs(rawSpecs, {
      title: p.name || productDataList?.[i]?.title,
      model: rawSpecs.find((s) => /model/i.test(s.label))?.value,
      retailerText: productDataList?.[i]?.retailerText,
      deviceHint: undefined,
    });
    const res = enriched.find((s) => /resolution/i.test(s.label) && !isBlankSpec(s.value));
    const name = res ? alignMarketingResolution(String(p.name || ""), res.value) : p.name;
    return { ...p, name, rawSpecs: enriched };
  });

  // Push enriched resolution/weight/chipset/biometrics into groupedSpecs / keyDifferences by label match.
  const syncLabels = [/native resolution/i, /^resolution$/i, /display resolution/i, /resolution \(pixels\)/i, /^display$/i, /screen size/i, /^weight$/i, /weight \(without stand\)/i, /chipset/i, /^processor$/i, /fingerprint/i, /face id/i, /refresh/i, /\bhdr\b|high dynamic range/i, /brightness|\bnits?\b/i, /noise cancell/i, /\banc\b/i, /bluetooth/i, /form factor/i, /wearing style/i];
  if (result.groupedSpecs) {
    for (const specs of Object.values(result.groupedSpecs) as Array<Array<{ label: string; values: string[] }>>) {
      for (const spec of specs) {
        if (!syncLabels.some((re) => re.test(spec.label))) continue;
        spec.values = spec.values.map((v, i) => {
          const raw = result.products[i]?.rawSpecs as SpecPair[] | undefined;
          const hit = pickRawMatch(raw, spec.label);
          return hit && !isBlankSpec(hit.value) ? hit.value : v;
        });
      }
    }
  }
  if (Array.isArray(result.keyDifferences)) {
    for (const diff of result.keyDifferences) {
      if (!syncLabels.some((re) => re.test(diff.label))) continue;
      diff.values = diff.values.map((v: string, i: number) => {
        const raw = result.products[i]?.rawSpecs as SpecPair[] | undefined;
        const hit = pickRawMatch(raw, diff.label);
        return hit && !isBlankSpec(hit.value) ? hit.value : v;
      });
    }
  }

  normalizeWeightComparisons(result);
  scrubUngroundedBrightness(result, productDataList);
  ensureGroupedRows(result, [/\bhdr\b|high dynamic range/i, /peak brightness|\bnits?\b/i, /refresh rate/i], "Display");
}
