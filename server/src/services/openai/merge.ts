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

function findRawValue(product: { rawSpecs?: { label?: string; value?: string }[]; specs?: { label?: string; value?: string }[] } | undefined, needle: string): string | undefined {
  const lists = [product?.rawSpecs, product?.specs];
  for (const list of lists) {
    for (const spec of list || []) {
      if (normLabel(spec.label || "") === needle && spec.value != null && String(spec.value).trim()) {
        return String(spec.value);
      }
    }
  }
  return undefined;
}

function normUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./i, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return String(url || "")
      .trim()
      .toLowerCase()
      .replace(/\/$/, "");
  }
}

function tokenSet(value: string): string[] {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function nameScore(a: string, b: string): number {
  const A = new Set(tokenSet(a));
  const B = new Set(tokenSet(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n += 1;
  return n / Math.max(A.size, B.size);
}

export function alignListToInputs<T>(
  items: T[],
  inputs: { url: string; title: string }[],
  getters: { url?: (item: T) => string; name?: (item: T) => string }
): { aligned: T[]; sourceIndex: number[] } {
  const n = inputs.length;
  const aligned: Array<T | undefined> = Array.from({ length: n });
  const sourceIndex = Array.from({ length: n }, () => -1);
  const used = new Set<number>();

  if (getters.url) {
    for (let i = 0; i < n; i++) {
      const want = normUrl(inputs[i].url);
      if (!want) continue;
      const idx = items.findIndex((item, j) => !used.has(j) && normUrl(getters.url!(item)) === want);
      if (idx >= 0) {
        used.add(idx);
        aligned[i] = items[idx];
        sourceIndex[i] = idx;
      }
    }
  }

  if (getters.name) {
    for (let i = 0; i < n; i++) {
      if (aligned[i]) continue;
      let best = -1;
      let bestScore = 0.34;
      for (let j = 0; j < items.length; j++) {
        if (used.has(j)) continue;
        const name = getters.name(items[j]);
        const score = Math.max(nameScore(name, inputs[i].title), nameScore(name, inputs[i].url));
        if (score > bestScore) {
          bestScore = score;
          best = j;
        }
      }
      if (best >= 0) {
        used.add(best);
        aligned[i] = items[best];
        sourceIndex[i] = best;
      }
    }
  }

  let cursor = 0;
  for (let i = 0; i < n; i++) {
    if (aligned[i]) continue;
    while (cursor < items.length && used.has(cursor)) cursor += 1;
    if (cursor < items.length) {
      used.add(cursor);
      aligned[i] = items[cursor];
      sourceIndex[i] = cursor;
      cursor += 1;
    } else if (items.length) {
      aligned[i] = items[Math.min(i, items.length - 1)];
      sourceIndex[i] = Math.min(i, items.length - 1);
    }
  }

  return {
    aligned: aligned.map((item, i) => item ?? items[Math.min(i, Math.max(items.length - 1, 0))]),
    sourceIndex,
  };
}

function permuteValues(values: string[], sourceIndex: number[]): string[] {
  return sourceIndex.map((src, i) => {
    if (src >= 0 && src < values.length) return values[src];
    return values[i] ?? "—";
  });
}

function remapWinner(oldWinner: number, sourceIndex: number[]): number {
  if (!Number.isFinite(oldWinner) || oldWinner < 0) return -1;
  const next = sourceIndex.indexOf(oldWinner);
  return next >= 0 ? next : -1;
}

export function alignHarvestToInputs(
  harvest: { products?: HarvestProduct[] },
  productDataList: { url: string; title: string }[]
): { products?: HarvestProduct[] } {
  const products = Array.isArray(harvest?.products) ? harvest.products : [];
  if (!products.length || !productDataList.length) return harvest;
  const { aligned } = alignListToInputs(products, productDataList, {
    name: (p) => `${p.name || ""} ${p.brand || ""}`,
  });
  harvest.products = aligned;
  return harvest;
}

function overlayValuesFromHarvest(
  values: string[],
  label: string,
  harvestProducts: HarvestProduct[]
): string[] {
  const needle = normLabel(label);
  return values.map((value, i) => {
    const harvested = findHarvestValue(harvestProducts[i], needle);
    return harvested && harvested.trim() ? harvested : value;
  });
}

export function realignGroupedToInputs(
  result: any,
  harvest: { products?: HarvestProduct[] },
  productDataList: { url: string; title: string }[]
): void {
  const count = productDataList.length;
  const harvestProducts = harvest?.products || [];
  if (!result || typeof result !== "object") return;

  let sourceIndex = productDataList.map((_, i) => i);
  if (Array.isArray(result.products) && result.products.length) {
    const aligned = alignListToInputs(result.products as any[], productDataList, {
      url: (p: any) => p?.url || "",
      name: (p: any) => `${p?.name || ""} ${p?.brand || ""}`,
    });
    sourceIndex = aligned.sourceIndex;
    result.products = aligned.aligned.map((p: any, i: number) => ({
      ...p,
      url: p?.url || productDataList[i]?.url || "",
    }));
  }

  const permuteSpec = (spec: any) => {
    const oldValues = padValues(spec?.values, Math.max(count, Array.isArray(spec?.values) ? spec.values.length : 0));
    const values = overlayValuesFromHarvest(permuteValues(oldValues, sourceIndex), spec?.label || "", harvestProducts);
    return {
      ...spec,
      values,
      winnerIndex: remapWinner(typeof spec?.winnerIndex === "number" ? spec.winnerIndex : -1, sourceIndex),
    };
  };

  if (result.groupedSpecs && typeof result.groupedSpecs === "object") {
    for (const key of Object.keys(result.groupedSpecs)) {
      const specs = result.groupedSpecs[key];
      result.groupedSpecs[key] = Array.isArray(specs) ? specs.map(permuteSpec) : [];
    }
  }

  if (Array.isArray(result.keyDifferences)) {
    result.keyDifferences = result.keyDifferences.map((diff: any) => ({
      ...diff,
      values: overlayValuesFromHarvest(
        permuteValues(padValues(diff?.values, count), sourceIndex),
        diff?.label || "",
        harvestProducts
      ),
    }));
  }
}

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
    console.log(`[LLM] Merged ${orphans.length} harvested spec(s) into "${otherKey}"`);
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

const GROUP_RULES: Array<{ group: string; icon: string; pattern: RegExp }> = [
  { group: "Display", icon: "display", pattern: /display|screen|panel|resolution|refresh|hdr|nit|oled|qled|mini.?led|brightness|contrast|picture/i },
  { group: "Sound", icon: "audio", pattern: /audio|sound|speaker|dolby|atmos|dts|watt|channel|acoustic/i },
  { group: "Performance", icon: "cpu", pattern: /processor|cpu|chip|soc|gpu|graphics|ram|memory|core|speed|benchmark/i },
  { group: "Storage", icon: "storage", pattern: /storage|ssd|hdd|capacity gb|internal storage/i },
  { group: "Battery", icon: "battery", pattern: /battery|charge|charging|runtime|endurance|power supply/i },
  { group: "Camera", icon: "camera", pattern: /camera|lens|megapixel|photo|video|optical|sensor|iso/i },
  { group: "Connectivity", icon: "wifi", pattern: /wifi|wi-fi|bluetooth|wireless|cellular|5g|lte|ethernet|cast|airplay/i },
  { group: "Ports", icon: "ports", pattern: /hdmi|usb|port|thunderbolt|input|output|optical out/i },
  { group: "Smart Features", icon: "smart", pattern: /os|operating|tizen|roku|fire tv|google tv|app|alexa|assistant|smart/i },
  { group: "Design", icon: "design", pattern: /weight|dimension|size|stand|vesa|material|color|finish|build/i },
];

export function inferDeviceType(titles: string[]): string {
  const t = titles.join(" ").toLowerCase();
  if (/\btv\b|television|qled|oled|mini.?led/.test(t)) return "television";
  if (/laptop|macbook|notebook/.test(t)) return "laptop";
  if (/iphone|galaxy s|pixel|smartphone|phone/.test(t)) return "smartphone";
  if (/ipad|tablet/.test(t)) return "tablet";
  if (/watch|garmin|fitbit/.test(t)) return "smartwatch";
  if (/headphone|earbuds|airpods/.test(t)) return "headphones";
  if (/router|mesh/.test(t)) return "router";
  if (/stick|streaming|fire tv|chromecast|apple tv/.test(t)) return "streaming";
  return "other";
}

export function retailerFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("bestbuy")) return "bestbuy";
    if (host.includes("amazon")) return "amazon";
    if (host.includes("walmart")) return "walmart";
    if (host.includes("costco")) return "costco";
    if (host.includes("canadacomputers")) return "canadacomputers";
    if (host.includes("staples")) return "staples";
    if (host.includes("newegg")) return "newegg";
    if (host.includes("memoryexpress")) return "memoryexpress";
    if (host.includes("thesource")) return "thesource";
  } catch {
    /* ignore */
  }
  return "other";
}

function assignGroup(label: string): { group: string; icon: string } {
  for (const rule of GROUP_RULES) {
    if (rule.pattern.test(label)) return { group: rule.group, icon: rule.icon };
  }
  return { group: "Other Features", icon: "other" };
}

function stringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function badgesFromSpecs(specs: { label: string; value: string }[]): string[] {
  const blob = specs.map((s) => `${s.label} ${s.value}`).join(" ").toLowerCase();
  const badges: string[] = [];
  if (/oled|qled|mini.?led|120hz|144hz|4k|8k/.test(blob)) badges.push("Great display");
  if (/battery|5000|mah|long.?life/.test(blob)) badges.push("Strong battery");
  if (/\b(16|18|24|32)\s*gb\b|lpddr/.test(blob)) badges.push("Fast");
  if (/oled|camera|megapixel|ois/.test(blob)) badges.push("Camera");
  if (/wifi\s*6e|wifi\s*7|thunderbolt|hdmi 2\.1/.test(blob)) badges.push("Modern ports");
  if (/atmos|dts|dolby/.test(blob)) badges.push("Immersive audio");
  return badges.slice(0, 6);
}

export function fallbackGroupFromHarvest(
  harvest: { products?: HarvestProduct[] },
  productDataList: { url: string; title: string }[]
): any {
  const harvestProducts = harvest.products || [];
  const productCount = Math.max(harvestProducts.length, productDataList.length, 2);
  const groupedSpecs: Record<string, GroupedSpec[]> = {};
  const groupIcons: Record<string, string> = {};
  const seen = new Set<string>();

  for (const product of harvestProducts) {
    for (const spec of product.specs || []) {
      const key = normLabel(spec.label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const values = Array.from({ length: productCount }, (_, i) => {
        const v = findHarvestValue(harvestProducts[i], key);
        return v && v.trim() ? v : "—";
      });
      if (values.every((v) => v === "—")) continue;
      const { group, icon } = assignGroup(spec.label);
      if (!groupedSpecs[group]) groupedSpecs[group] = [];
      groupedSpecs[group].push({ label: spec.label, values, winnerIndex: -1 });
      groupIcons[group] = icon;
    }
  }

  const names = harvestProducts.map((p, i) => p.name || productDataList[i]?.title || `Product ${i + 1}`);
  const differing = Object.values(groupedSpecs)
    .flat()
    .filter((s) => new Set(s.values.filter((v) => v !== "—")).size > 1)
    .slice(0, 5)
    .map((s) => ({ label: s.label, values: s.values }));

  return {
    category: "Tech",
    subcategory: inferDeviceType(productDataList.map((d) => d.title)),
    deviceType: inferDeviceType(productDataList.map((d) => d.title)),
    aiSummary: `${names.join(" vs ")}: full spec sheet assembled from retailer pages and product knowledge. Open each category for the complete breakdown.`,
    keyDifferences: differing,
    groupIcons,
    groupedSpecs,
    products: Array.from({ length: productCount }, (_, i) => {
      const harvested = harvestProducts[i] || { specs: [] };
      const url = productDataList[i]?.url || "";
      return {
        name: harvested.name || productDataList[i]?.title || `Product ${i + 1}`,
        brand: harvested.brand || "",
        retailer: retailerFromUrl(url),
        url,
        price: "N/A",
        description: "",
        whatsInTheBox: [],
        userInsights: "",
        userPros: [],
        userCons: [],
        badges: badgesFromSpecs(harvested.specs || []),
        aiSummary: `${harvested.name || productDataList[i]?.title || "This product"} is a ${inferDeviceType([productDataList[i]?.title || ""])} worth considering. See the spec sheet below for the full breakdown and who it fits.`,
        rawSpecs: (harvested.specs || []).map((s) => ({ label: s.label, value: s.value })),
      };
    }),
  };
}

export function canonicalizeSpecValue(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9.%+-]+/g, "");
}

export function specValuesAreTied(values: string[]): boolean {
  if (!Array.isArray(values) || values.length < 2) return false;
  const canon = values.map((v) => canonicalizeSpecValue(v));
  const present = canon.filter((v) => v && v !== "n/a" && v !== "unknown" && v !== "na");
  if (present.length < 2) return false;
  return present.every((v) => v === present[0]) && present.length === values.length;
}

function applyTieWinners(groupedSpecs: Record<string, { label: string; values: string[]; winnerIndex: number }[]>): void {
  for (const specs of Object.values(groupedSpecs)) {
    for (const spec of specs) {
      if (specValuesAreTied(spec.values)) {
        spec.winnerIndex = -1;
      }
    }
  }
}

export function padValues(values: unknown, productCount: number): string[] {
  const raw = Array.isArray(values) ? values : [];
  const out = raw.map((v) => (v == null || String(v).trim() === "" ? "—" : String(v)));
  while (out.length < productCount) out.push("—");
  return out.slice(0, productCount);
}

export function normalizeKeyDifferences(raw: unknown, productCount: number): Array<{ label: string; values: string[] }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => {
      if (typeof item === "string") {
        return { label: item, values: padValues([], productCount) };
      }
      if (!item || typeof item !== "object") return null;
      const label = String(item.label || item.spec || item.name || "").trim();
      if (!label) return null;
      let values = item.values;
      if (!Array.isArray(values)) {
        const named = [item.valueA, item.valueB, item.valueC, item.a, item.b].filter((v) => v !== undefined);
        values = named.length ? named : [];
      }
      return { label, values: padValues(values, productCount) };
    })
    .filter((d): d is { label: string; values: string[] } => !!d);
}

export function normalizeComparisonResult(result: any, productCount: number): any {
  const next = result && typeof result === "object" ? result : {};
  next.aiSummary = typeof next.aiSummary === "string" ? next.aiSummary : "";
  next.products = Array.isArray(next.products) ? next.products : [];
  next.keyDifferences = normalizeKeyDifferences(next.keyDifferences, productCount);
  next.groupIcons = next.groupIcons && typeof next.groupIcons === "object" ? next.groupIcons : {};
  next.groupedSpecs = next.groupedSpecs && typeof next.groupedSpecs === "object" ? next.groupedSpecs : {};

  for (const [group, specs] of Object.entries(next.groupedSpecs)) {
    if (!Array.isArray(specs)) {
      next.groupedSpecs[group] = [];
      continue;
    }
    next.groupedSpecs[group] = specs
      .filter((s) => s && typeof s === "object")
      .map((s: any) => ({
        label: String(s.label || s.name || "Spec"),
        values: padValues(s.values, productCount),
        winnerIndex: specValuesAreTied(padValues(s.values, productCount))
          ? -1
          : typeof s.winnerIndex === "number"
            ? s.winnerIndex
            : -1,
      }));
  }

  applyTieWinners(next.groupedSpecs);
  next.keyDifferences = next.keyDifferences.filter((d: { values: string[] }) => !specValuesAreTied(d.values));

  next.products = next.products.map((p: any, i: number) => {
    const name = String(p?.name || `Product ${i + 1}`);
    const rawSpecs = Array.isArray(p?.rawSpecs)
      ? p.rawSpecs
          .filter((s: any) => s && (s.label || s.name))
          .map((s: any) => ({ label: String(s.label || s.name), value: s.value == null ? "—" : String(s.value) }))
      : [];
    const badges = stringList(p?.badges, 6);
    return {
      ...p,
      name,
      brand: String(p?.brand || ""),
      retailer: String(p?.retailer || "other"),
      url: String(p?.url || ""),
      price: String(p?.price || "N/A"),
      description: typeof p?.description === "string" ? p.description : "",
      whatsInTheBox: stringList(p?.whatsInTheBox, 12),
      userInsights: typeof p?.userInsights === "string" ? p.userInsights : "",
      userPros: stringList(p?.userPros || p?.pros, 6),
      userCons: stringList(p?.userCons || p?.cons, 6),
      badges: badges.length ? badges : badgesFromSpecs(rawSpecs),
      aiSummary:
        typeof p?.aiSummary === "string" && p.aiSummary.trim()
          ? p.aiSummary
          : `${name} is a solid option in this matchup. Use the spec sheet below to see what it is best suited for.`,
      rawSpecs,
    };
  });

  for (const specs of Object.values(next.groupedSpecs) as Array<{ label: string; values: string[]; winnerIndex: number }[]>) {
    for (const spec of specs) {
      const needle = normLabel(spec.label);
      spec.values = spec.values.map((value, i) => findRawValue(next.products[i], needle) || value);
      if (typeof spec.winnerIndex === "number" && spec.winnerIndex >= 0) {
        const win = canonicalizeSpecValue(spec.values[spec.winnerIndex] || "");
        if (win) {
          const mapped = spec.values.findIndex((v) => canonicalizeSpecValue(v) === win);
          if (mapped >= 0) spec.winnerIndex = mapped;
        }
      }
    }
  }
  for (const diff of next.keyDifferences) {
    const needle = normLabel(diff.label);
    diff.values = diff.values.map((value: string, i: number) => findRawValue(next.products[i], needle) || value);
  }
  applyTieWinners(next.groupedSpecs);

  return next;
}

export function normalizeAlternativesResult(raw: any) {
  const list = Array.isArray(raw?.alternatives) ? raw.alternatives : [];
  return {
    alternatives: list.map((item: any) => ({
      name: String(item?.name || "").trim(),
      estimatedPrice: String(item?.estimatedPrice || "").trim(),
      reasonWhyBetter: String(item?.reasonWhyBetter || "").trim(),
      imageUrl: String(item?.imageUrl || "").trim(),
      url: String(item?.url || "").trim(),
      highlights: Array.isArray(item?.highlights)
        ? item.highlights.map((h: unknown) => String(h || "").trim()).filter(Boolean).slice(0, 5)
        : [],
    })),
  };
}
