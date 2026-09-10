function normLabel(label: string): string {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type HarvestProduct = {
  name?: string;
  brand?: string;
  specs?: { label: string; value: string; source?: string }[];
};

type GroupedSpec = {
  label: string;
  values: string[];
  winnerIndex: number;
};

function groupedLabelSet(groupedSpecs: Record<string, GroupedSpec[]>): Set<string> {
  const set = new Set<string>();
  for (const specs of Object.values(groupedSpecs)) {
    for (const spec of specs || []) {
      set.add(normLabel(spec.label));
    }
  }
  return set;
}

function findHarvestValue(product: HarvestProduct | undefined, needle: string): string | undefined {
  for (const spec of product?.specs || []) {
    if (normLabel(spec.label) === needle) return spec.value;
  }
  return undefined;
}

/**
 * Guarantee every harvested spec appears in groupedSpecs.
 * Orphans land in "Other Features" so the compare screen never hides them.
 */
export function mergeOrphanSpecs(result: any, harvest: { products?: HarvestProduct[] }, productCount: number): void {
  if (!result.groupedSpecs || typeof result.groupedSpecs !== "object") {
    result.groupedSpecs = {};
  }

  const harvestProducts = harvest.products || [];
  const present = groupedLabelSet(result.groupedSpecs);
  const orphans: GroupedSpec[] = [];
  const seenOrphan = new Set<string>();

  for (const product of harvestProducts) {
    for (const spec of product.specs || []) {
      const key = normLabel(spec.label);
      if (!key || present.has(key) || seenOrphan.has(key)) continue;
      seenOrphan.add(key);

      const values = Array.from({ length: productCount }, (_, i) => {
        const v = findHarvestValue(harvestProducts[i], key);
        return v && v.trim() ? v : "—";
      });

      if (values.every((v) => v === "—")) continue;
      orphans.push({ label: spec.label, values, winnerIndex: -1 });
    }
  }

  if (orphans.length > 0) {
    const otherKey = Object.keys(result.groupedSpecs).find((k) => /other/i.test(k)) || "Other Features";
    result.groupedSpecs[otherKey] = [...(result.groupedSpecs[otherKey] || []), ...orphans];
    if (!result.groupIcons) result.groupIcons = {};
    if (!result.groupIcons[otherKey]) result.groupIcons[otherKey] = "other";
    console.log(`[Grok] Merged ${orphans.length} harvested spec(s) into "${otherKey}"`);
  }

  if (Array.isArray(result.products)) {
    result.products = result.products.map((p: any, i: number) => {
      const harvested = (harvestProducts[i]?.specs || []).map((s) => ({ label: s.label, value: s.value }));
      const existing: { label: string; value: string }[] = Array.isArray(p.rawSpecs) ? p.rawSpecs : [];
      const have = new Set(existing.map((s) => normLabel(s.label)));
      const extra = harvested.filter((s) => s.label && !have.has(normLabel(s.label)));
      return { ...p, rawSpecs: [...existing, ...extra] };
    });
  }
}

export function applyGroupedSpecsList(result: any): void {
  result.groupedSpecs = result.groupedSpecs || {};
  result.groupIcons = result.groupIcons || {};

  if (!Array.isArray(result.groupedSpecsList)) return;

  for (const group of result.groupedSpecsList) {
    const name = group?.groupName;
    if (!name) continue;
    result.groupedSpecs[name] = group.specs || [];
    if (group.iconKey) result.groupIcons[name] = group.iconKey;
  }

  delete result.groupedSpecsList;
}
