/**
 * Fill structured audio/style fields from the product title when the
 * retailer sheet left them blank. Never overwrites a real value.
 */

export type SpecPair = { label: string; value: string };

function isBlankSpec(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  return !s || /^(n\/a|na|unknown|none|null|undefined|—|–|-)$/i.test(s);
}

function fillBlank(specs: SpecPair[], label: string, value: string, match: RegExp): SpecPair[] {
  const idx = specs.findIndex((s) => match.test(s.label));
  if (idx >= 0) {
    if (!isBlankSpec(specs[idx].value)) return specs;
    const next = specs.slice();
    next[idx] = { ...next[idx], value };
    return next;
  }
  return [...specs, { label, value }];
}

/** Over-ear wins over in-ear when a title somehow says both. */
export function formFactorFromTitle(title: string): string | null {
  if (/\bover[\s-]?ear\b/i.test(title)) return "Over-ear";
  if (/\bon[\s-]?ear\b/i.test(title)) return "On-ear";
  if (/\bin[\s-]?ear\b/i.test(title) || /\bearbuds?\b/i.test(title)) return "In-ear";
  if (/\btrue wireless\b/i.test(title) && /\b(earbud|headphone|airpod|in[\s-]?ear)\b/i.test(title)) return "In-ear";
  return null;
}

export function bluetoothFromTitle(title: string): string | null {
  const version = title.match(/\bbluetooth\s*(\d(?:\.\d+)?)\b/i);
  if (version) return `Bluetooth ${version[1]}`;
  if (/\bbluetooth\b/i.test(title)) return "Yes";
  return null;
}

export function noiseCancellingFromTitle(title: string): string | null {
  if (/\b(noise[\s-]?cancell?ing|active noise(?:\s+cancell?ing)?)\b/i.test(title)) return "Yes";
  if (/\banc\b(?!\d)/i.test(title)) return "Yes";
  return null;
}

/**
 * Pull ANC / Bluetooth / ear style out of the title into spec rows.
 * Existing non-blank values are left alone.
 */
export function applyTitleEnrichment(specs: SpecPair[], title: string | undefined | null): SpecPair[] {
  const text = title || "";
  if (!text.trim()) return specs;
  let next = specs.map((s) => ({ label: s.label, value: String(s.value ?? "") }));

  const anc = noiseCancellingFromTitle(text);
  if (anc) {
    next = fillBlank(next, "Noise Cancelling", anc, /noise[\s-]?cancell|active noise|\banc\b/i);
  }

  const bt = bluetoothFromTitle(text);
  if (bt) {
    next = fillBlank(next, "Bluetooth", bt, /bluetooth/i);
  }

  const style = formFactorFromTitle(text);
  if (style) {
    next = fillBlank(next, "Form Factor", style, /form factor|wearing style|ear style|headphone style/i);
  }

  return next;
}

/** Re-apply title tokens after a later pass blanks thin-scrape fields back to Unknown. */
export function enrichProductTitles(products: Array<{ name?: string; rawSpecs?: SpecPair[] }> | undefined): void {
  if (!Array.isArray(products)) return;
  for (const product of products) {
    product.rawSpecs = applyTitleEnrichment(product.rawSpecs || [], product.name);
  }
}
