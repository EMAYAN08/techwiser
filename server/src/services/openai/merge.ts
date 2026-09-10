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
    console.log(`[OpenAI] Merged ${orphans.length} harvested spec(s) into "${otherKey}"`);
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
        badges: [],
        aiSummary: "",
        rawSpecs: (harvested.specs || []).map((s) => ({ label: s.label, value: s.value })),
      };
    }),
  };
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
        winnerIndex: typeof s.winnerIndex === "number" ? s.winnerIndex : -1,
      }));
  }

  return next;
}
