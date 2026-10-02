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
  }

  // Laptop weight: fill Unknown from OEM map or nearby text.
  const weightSpec = findSpec(specs, (l) => l === "weight" || l === "product weight");
  const looksLaptop =
    /laptop|notebook|zenbook|vivobook|macbook|ultrabook/i.test(identity) ||
    ctx.deviceHint === "laptop" ||
    Boolean(findSpec(specs, (l) => l.includes("processor") || l.includes("ram") || l.includes("ssd")));

  if (looksLaptop && (!weightSpec || isBlankSpec(weightSpec.value))) {
    const fromText = extractWeightKgFromText(ctx.retailerText || "");
    const fromOem = inferLaptopWeightKg(identity);
    const value = fromText || (fromOem ? fromOem.label : null);
    if (value) {
      specs = upsertSpec(specs, weightSpec?.label || "Weight", value);
    }
  }

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
    return { ...p, rawSpecs: enriched };
  });

  // Push enriched resolution/weight into groupedSpecs / keyDifferences by label match.
  const syncLabels = [/native resolution/i, /^resolution$/i, /display resolution/i, /^weight$/i, /weight \(without stand\)/i];
  if (result.groupedSpecs) {
    for (const specs of Object.values(result.groupedSpecs) as Array<Array<{ label: string; values: string[] }>>) {
      for (const spec of specs) {
        if (!syncLabels.some((re) => re.test(spec.label))) continue;
        spec.values = spec.values.map((v, i) => {
          const raw = result.products[i]?.rawSpecs as SpecPair[] | undefined;
          const hit = raw?.find((s) => normLabel(s.label) === normLabel(spec.label) || ( /resolution/i.test(spec.label) && /resolution/i.test(s.label)));
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
        const hit = raw?.find(
          (s) =>
            normLabel(s.label) === normLabel(diff.label) ||
            (/resolution/i.test(diff.label) && /resolution/i.test(s.label))
        );
        return hit && !isBlankSpec(hit.value) ? hit.value : v;
      });
    }
  }

  normalizeWeightComparisons(result);
}
