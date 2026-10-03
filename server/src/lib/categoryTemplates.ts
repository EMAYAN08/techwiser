/**
 * Shared device classification, spec-group templates, and key-diff priority.
 * Retailer-agnostic: titles and spec labels only, no per-store branches.
 */

import { enrichProductTitles } from "./titleEnrich";

export type GroupRule = { group: string; icon: string; pattern: RegExp };

export type Classification = {
  deviceType: string;
  /** fridge/washer/… when every titled product agrees; otherwise the deviceType. */
  subtype: string;
  mixed: boolean;
  mixedSubtypes: boolean;
};

const CATEGORY_NAME: Record<string, string> = {
  appliance: "Appliances & Home",
  drone: "Cameras & Drones",
  soundbar: "Home Entertainment & Displays",
  camera: "Cameras & Optics",
  headphones: "Audio & Headphones",
  television: "Home Entertainment & Displays",
  laptop: "Computing & Mobile",
  smartphone: "Computing & Mobile",
  tablet: "Computing & Mobile",
};

const KEEP_COMPUTE = new Set([
  "smartphone",
  "tablet",
  "laptop",
  "desktop",
  "console",
  "television",
  "monitor",
  "streaming",
  "router",
]);

const APPLIANCE_RULES: GroupRule[] = [
  { group: "Capacity", icon: "storage", pattern: /capacity|cu\.?\s*ft|cubic|place setting|bin capacity|load size/i },
  { group: "Energy", icon: "battery", pattern: /energy|kwh|efficiency|power consumption|annual energy/i },
  { group: "Performance", icon: "cpu", pattern: /cycle|spin|\brpm\b|noise|decibel|\bdba?\b|suction|air\s*watt|steam|filtration|hepa|wash program/i },
  { group: "Smart Features", icon: "smart", pattern: /wi-?fi|smart|app control|voice assistant/i },
  { group: "Design", icon: "design", pattern: /dimension|\bwidth\b|\bheight\b|\bdepth\b|\bweight\b|colour|color|finish/i },
];

const DRONE_RULES: GroupRule[] = [
  { group: "Flight", icon: "other", pattern: /flight|range|transmission|\bspeed\b|wind|obstacle|avoidance|hover/i },
  { group: "Camera", icon: "camera", pattern: /camera|megapixel|\bmp\b|video|sensor|photo|gimbal|resolution/i },
  { group: "Battery", icon: "battery", pattern: /battery|charge|\bmah\b|runtime/i },
  { group: "Design", icon: "design", pattern: /weight|dimension|fold/i },
];

const SOUNDBAR_RULES: GroupRule[] = [
  { group: "Sound", icon: "audio", pattern: /channel|\bwatt|dolby|atmos|\bdts\b|speaker|subwoofer|driver|surround|audio/i },
  { group: "Connectivity", icon: "wifi", pattern: /bluetooth|\bhdmi\b|wi-?fi|wireless|optical|\barc\b|earc/i },
  { group: "Smart Features", icon: "smart", pattern: /alexa|assistant|\bsmart\b|\bapp\b|voice/i },
  { group: "Design", icon: "design", pattern: /dimension|\bweight\b|\bsize\b|colour|color/i },
];

const HEADPHONE_RULES: GroupRule[] = [
  { group: "Noise Cancellation", icon: "audio", pattern: /noise|\banc\b|cancell|transparency/i },
  { group: "Sound", icon: "audio", pattern: /driver|frequency|codec|\bsound\b|audio/i },
  { group: "Battery", icon: "battery", pattern: /battery|playtime|runtime|charg/i },
  { group: "Connectivity", icon: "wifi", pattern: /bluetooth|wireless|multipoint|wired|3\.5|\busb\b/i },
  { group: "Design", icon: "design", pattern: /form factor|wearing|\bweight\b|over-ear|on-ear|in-ear|fold|colour|color/i },
];

const CAMERA_RULES: GroupRule[] = [
  { group: "Sensor", icon: "camera", pattern: /sensor|megapixel|\bmp\b|\biso\b/i },
  { group: "Video", icon: "display", pattern: /video|resolution|frame\s*rate|\bfps\b/i },
  { group: "Lens", icon: "camera", pattern: /lens|zoom|aperture|focal|stabil/i },
  { group: "Battery", icon: "battery", pattern: /battery|endurance|runtime/i },
  { group: "Design", icon: "design", pattern: /weight|dimension|body/i },
];

/** Fallback buckets used when a category template does not claim the label. */
const GENERIC_RULES: GroupRule[] = [
  { group: "Display", icon: "display", pattern: /display|screen|panel|resolution|refresh|\bhdr\b|\bnit\b|oled|qled|mini.?led|brightness|contrast|picture/i },
  { group: "Sound", icon: "audio", pattern: /audio|sound|speaker|dolby|atmos|\bdts\b|\bwatt\b|channel|acoustic/i },
  { group: "Performance", icon: "cpu", pattern: /processor|\bcpu\b|chip|\bsoc\b|\bgpu\b|graphics|\bram\b|memory|core|speed|benchmark/i },
  { group: "Storage", icon: "storage", pattern: /storage|\bssd\b|\bhdd\b|capacity gb|internal storage/i },
  { group: "Battery", icon: "battery", pattern: /battery|charge|charging|runtime|endurance|power supply/i },
  { group: "Camera", icon: "camera", pattern: /camera|lens|megapixel|photo|video|optical|sensor|\biso\b/i },
  { group: "Connectivity", icon: "wifi", pattern: /wifi|wi-fi|bluetooth|wireless|cellular|\b5g\b|\blte\b|ethernet|cast|airplay/i },
  { group: "Ports", icon: "ports", pattern: /\bhdmi\b|\busb\b|\bport\b|thunderbolt|input|output|optical out/i },
  { group: "Smart Features", icon: "smart", pattern: /\bos\b|operating|tizen|roku|fire tv|google tv|\bapp\b|alexa|assistant|smart/i },
  { group: "Design", icon: "design", pattern: /weight|dimension|\bsize\b|stand|vesa|material|color|finish|build/i },
];

const SUBTYPE_PRIORITY: Record<string, RegExp[]> = {
  fridge: [
    /capacity|cu\.?\s*ft|cubic/i,
    /\bdoor\b|french|freezer|ice maker|dispenser/i,
    /energy|\bkwh\b/i,
    /noise|decibel|\bdba?\b/i,
    /dimension|\bwidth\b|\bheight\b|\bdepth\b/i,
  ],
  washer: [
    /capacity|cu\.?\s*ft|cubic/i,
    /front[\s-]?load|top[\s-]?load|load type/i,
    /spin|\brpm\b/i,
    /energy|\bkwh\b|efficiency/i,
    /noise|decibel|\bdba?\b|steam|cycle/i,
    /dimension|\bwidth\b|\bheight\b|\bdepth\b/i,
  ],
  dryer: [
    /capacity|cu\.?\s*ft|cubic/i,
    /steam|sensor dry|cycle/i,
    /energy|\bkwh\b/i,
    /noise|decibel|\bdba?\b/i,
    /dimension|\bwidth\b|\bheight\b|\bdepth\b/i,
  ],
  dishwasher: [
    /place setting|capacity/i,
    /noise|decibel|\bdba?\b/i,
    /energy|cycle/i,
    /dimension|\bwidth\b|\bheight\b|\bdepth\b/i,
  ],
  microwave: [
    /capacity|cu\.?\s*ft|cubic/i,
    /\bwatt/i,
    /sensor cook|cooking power|turntable/i,
    /dimension|\bwidth\b|\bheight\b|\bdepth\b/i,
  ],
  vacuum: [
    /suction|air\s*watt/i,
    /runtime|battery/i,
    /bin|dust capacity|capacity/i,
    /filtration|hepa/i,
    /weight|dimension/i,
  ],
};

const DEVICE_PRIORITY: Record<string, RegExp[]> = {
  appliance: [
    /capacity|cu\.?\s*ft|cubic|place setting|bin capacity/i,
    /suction|air\s*watt|spin|\brpm\b|wattage|cooking power/i,
    /energy|\bkwh\b|efficiency/i,
    /noise|decibel|\bdba?\b/i,
    /runtime|battery/i,
    /dimension|\bwidth\b|\bheight\b|\bdepth\b/i,
    /wi-?fi|smart|app control/i,
  ],
  drone: [
    /flight\s*time|max(?:imum)?\s*flight|endurance|\bflight\b/i,
    /range|transmission|control distance/i,
    /\bweight\b/i,
    /\bspeed\b|wind/i,
    /video|camera|sensor|resolution/i,
    /battery/i,
    /obstacle|avoidance/i,
  ],
  soundbar: [
    /channel|\b[257]\.\d|configuration/i,
    /\bwatt|power output/i,
    /atmos|dolby|\bdts\b|surround/i,
    /subwoofer/i,
    /\bhdmi\b|bluetooth|wi-?fi/i,
    /dimension|\bsize\b/i,
  ],
  camera: [
    /sensor|megapixel|\bmp\b/i,
    /video|resolution|frame\s*rate|\bfps\b/i,
    /lens|zoom|aperture|focal/i,
    /stabili[sz]/i,
    /battery|endurance/i,
    /weight|dimension/i,
  ],
  headphones: [
    /noise|\banc\b|cancell/i,
    /form factor|wearing|over[\s-]?ear|on[\s-]?ear|in[\s-]?ear/i,
    /driver/i,
    /battery|playtime|runtime/i,
    /bluetooth|codec|wireless/i,
    /\bweight\b/i,
  ],
};

function normLabel(label: string): string {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rulesFor(deviceType: string): GroupRule[] {
  switch (deviceType) {
    case "appliance":
      return APPLIANCE_RULES;
    case "drone":
      return DRONE_RULES;
    case "soundbar":
      return SOUNDBAR_RULES;
    case "headphones":
    case "earbuds":
      return HEADPHONE_RULES;
    case "camera":
      return CAMERA_RULES;
    default:
      return [];
  }
}

function isRealCameraLabel(label: string): boolean {
  return /\b(camera|megapixel|lens)\b|\bmp\b/i.test(label);
}

export function groupForLabel(label: string, deviceType = "other"): { group: string; icon: string } {
  for (const rule of rulesFor(deviceType)) {
    if (rule.pattern.test(label)) return { group: rule.group, icon: rule.icon };
  }
  const skipLooseCamera = deviceType === "appliance" || deviceType === "soundbar" || deviceType === "headphones" || deviceType === "earbuds";
  for (const rule of GENERIC_RULES) {
    if (rule.group === "Camera" && skipLooseCamera && !isRealCameraLabel(label)) continue;
    if (rule.pattern.test(label)) return { group: rule.group, icon: rule.icon };
  }
  return { group: "Other Features", icon: "other" };
}

/**
 * One title → deviceType. Order matters: soundbar before TV, dishwasher
 * before washer, headphones before the word "phone", drone before camera.
 */
export function classifyProductTitle(title: string): { deviceType: string; subtype: string } {
  const t = (title || "").toLowerCase();
  if (!t.trim()) return { deviceType: "other", subtype: "other" };

  if (/sound\s*bar|\bsoundbar\b/.test(t)) return { deviceType: "soundbar", subtype: "soundbar" };

  if (/\bdrone\b|\buav\b|quadcopter/.test(t)) return { deviceType: "drone", subtype: "drone" };
  if (/\bdji\b/.test(t) && (/\b(mini|mavic|avata|neo|flip)\b/.test(t) || /\bair\s*\d/.test(t))) {
    return { deviceType: "drone", subtype: "drone" };
  }

  if (/\bdish\s*washer\b/.test(t)) return { deviceType: "appliance", subtype: "dishwasher" };
  if (/\b(washing machine|clothes washer)\b/.test(t) || /\b(?<!dish)washer\b/.test(t)) {
    return { deviceType: "appliance", subtype: "washer" };
  }
  if (/\bdryer\b/.test(t) && !/\bhair\s*dryer\b/.test(t)) return { deviceType: "appliance", subtype: "dryer" };
  if (/\bfridge\b|refrigerator|french\s*door/.test(t)) return { deviceType: "appliance", subtype: "fridge" };
  if (/\bmicrowave\b/.test(t)) return { deviceType: "appliance", subtype: "microwave" };
  if (/\bvacuum\b|\broomba\b|stick vac|robot vac/.test(t)) return { deviceType: "appliance", subtype: "vacuum" };
  if (/\b(cooktop|dehumidifier|air conditioner|air fryer)\b/.test(t) || /\bac unit\b/.test(t)) {
    return { deviceType: "appliance", subtype: "appliance" };
  }
  if (/\b(oven|range)\b/.test(t) && !/\b(microwave|camera|lens)\b/.test(t)) {
    return { deviceType: "appliance", subtype: "appliance" };
  }

  if (/headphone|earbuds|airpods|\bheadset\b/.test(t)) return { deviceType: "headphones", subtype: "headphones" };
  if (/\b(over|on|in)[\s-]?ear\b/.test(t)) return { deviceType: "headphones", subtype: "headphones" };
  if (/\b(noise[\s-]?cancell?ing|anc)\b/.test(t) && /\b(bluetooth|wireless|audio)\b/.test(t)) {
    return { deviceType: "headphones", subtype: "headphones" };
  }

  if (/laptop|macbook|notebook|chromebook|zenbook|ultrabook/.test(t)) return { deviceType: "laptop", subtype: "laptop" };
  if (/\b(iphone|smartphone)\b/.test(t) || /galaxy s|\bpixel\b/.test(t) || /\bphone\b/.test(t)) {
    return { deviceType: "smartphone", subtype: "smartphone" };
  }
  if (/\bipad\b|\btablet\b/.test(t)) return { deviceType: "tablet", subtype: "tablet" };
  if (/\b(smartwatch|smart watch)\b|\bgarmin\b|\bfitbit\b|\bwatch\b/.test(t)) {
    return { deviceType: "smartwatch", subtype: "smartwatch" };
  }

  if (/\bcamera\b|\bdslr\b|mirrorless|\bgopro\b|action cam/.test(t)) return { deviceType: "camera", subtype: "camera" };
  if (/\bmonitor\b/.test(t)) return { deviceType: "monitor", subtype: "monitor" };
  if (/\btv\b|television|\bqled\b|\boled\b|mini.?led/.test(t)) return { deviceType: "television", subtype: "television" };
  if (/\brouter\b|\bmesh\b/.test(t)) return { deviceType: "router", subtype: "router" };
  if (/\bstick\b|streaming|fire tv|chromecast|apple tv/.test(t)) return { deviceType: "streaming", subtype: "streaming" };

  return { deviceType: "other", subtype: "other" };
}

export function classifyTitles(titles: string[]): Classification {
  const known = (titles || []).map((t) => classifyProductTitle(t)).filter((p) => p.deviceType !== "other");
  if (!known.length) return { deviceType: "other", subtype: "other", mixed: false, mixedSubtypes: false };
  const types = new Set(known.map((p) => p.deviceType));
  if (types.size > 1) return { deviceType: "other", subtype: "other", mixed: true, mixedSubtypes: true };
  const subtypes = new Set(known.map((p) => p.subtype));
  const mixedSubtypes = subtypes.size > 1;
  return {
    deviceType: known[0].deviceType,
    subtype: mixedSubtypes ? known[0].deviceType : known[0].subtype,
    mixed: false,
    mixedSubtypes,
  };
}

export function isLowValueKeyDiffLabel(label: string): boolean {
  const l = normLabel(label);
  if (!l) return false;
  if (/^(model|model number|model no|model name|model code|sku|upc|mpn|part number|item number|manufacturer part number)$/.test(l)) {
    return true;
  }
  if (/\bhose\b/.test(l)) return true;
  if (/\b(sku|upc|mpn|part number|item number)\b/.test(l)) return true;
  return false;
}

function isPhoneComputeLabel(label: string): boolean {
  const l = normLabel(label);
  return (
    /^(ram|memory|chipset|processor|soc|gpu|graphics|graphics card)$/.test(l) ||
    l.includes("chipset") ||
    l.includes("system on")
  );
}

export function keyDiffRank(label: string, deviceType: string, subtype?: string): number {
  if (isLowValueKeyDiffLabel(label)) return 1000;
  if (!KEEP_COMPUTE.has(deviceType) && isPhoneComputeLabel(label)) return 900;
  const list =
    subtype && subtype !== deviceType && SUBTYPE_PRIORITY[subtype]
      ? SUBTYPE_PRIORITY[subtype]
      : DEVICE_PRIORITY[deviceType] || [];
  const idx = list.findIndex((re) => re.test(label));
  return idx >= 0 ? idx : 400;
}

function canon(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isBlankValue(value: string): boolean {
  const c = canon(value);
  return !c || c === "na" || c === "unknown" || c === "none" || c === "n";
}

function valuesDiffer(values: string[]): boolean {
  const present = values.filter((v) => !isBlankValue(v));
  if (present.length < 2) return false;
  return new Set(present.map(canon)).size > 1;
}

type SpecRow = { label: string; values: string[]; winnerIndex?: number };

function findRaw(product: { rawSpecs?: Array<{ label: string; value: string }> }, label: string): string | undefined {
  const specs = product?.rawSpecs || [];
  const key = normLabel(label);
  const hit = specs.find((s) => normLabel(s.label) === key);
  return hit ? String(hit.value ?? "") : undefined;
}

function shouldRelocate(currentGroup: string, label: string, deviceType: string, suggested: string): boolean {
  if (!suggested || suggested === currentGroup) return false;
  const cameraMisfile = /camera/i.test(currentGroup) && !isRealCameraLabel(label);
  if (cameraMisfile && !["camera", "drone", "smartphone", "tablet"].includes(deviceType)) return true;
  const templated = ["appliance", "drone", "soundbar", "headphones", "earbuds", "camera"].includes(deviceType);
  if (!templated || suggested === "Other Features") return false;
  if (!/^(other features|design|performance|camera|display)$/i.test(currentGroup)) return false;
  return keyDiffRank(label, deviceType) < 400;
}

function relocateGroups(
  groupedSpecs: Record<string, SpecRow[]>,
  deviceType: string
): { grouped: Record<string, SpecRow[]>; icons: Record<string, string> } {
  const grouped: Record<string, SpecRow[]> = {};
  const icons: Record<string, string> = {};
  for (const [group, rows] of Object.entries(groupedSpecs || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const label = String(row?.label || "");
      const suggested = groupForLabel(label, deviceType);
      const move = shouldRelocate(group, label, deviceType, suggested.group);
      const dest = move ? suggested.group : group;
      if (!grouped[dest]) grouped[dest] = [];
      grouped[dest].push(row);
      if (move) icons[dest] = suggested.icon;
    }
  }
  return { grouped, icons };
}

/**
 * Rebuild keyDifferences so same-type compares lead with the fields a shopper
 * actually uses (capacity, flight time, channels, ANC) and sink hose/model/RAM.
 */
export function prioritizeKeyDifferences(
  result: {
    products?: Array<{ rawSpecs?: Array<{ label: string; value: string }> }>;
    keyDifferences?: Array<{ label: string; values: string[] }>;
    groupedSpecs?: Record<string, SpecRow[]>;
  },
  deviceType: string,
  subtype?: string,
  limit = 5
): Array<{ label: string; values: string[] }> {
  const products = result.products || [];
  const n = products.length;
  if (n < 2) return Array.isArray(result.keyDifferences) ? result.keyDifferences : [];

  const byNorm = new Map<string, { label: string; values: string[] }>();

  const remember = (label: string, values: string[]) => {
    const key = normLabel(label);
    if (!key) return;
    const padded = values.slice(0, n);
    while (padded.length < n) padded.push("—");
    const prev = byNorm.get(key);
    if (!prev) {
      byNorm.set(key, { label, values: padded });
      return;
    }
    // Prefer a row that already has more real values.
    const score = (vals: string[]) => vals.filter((v) => !isBlankValue(v)).length;
    if (score(padded) > score(prev.values)) byNorm.set(key, { label: prev.label, values: padded });
  };

  for (const diff of result.keyDifferences || []) {
    if (diff?.label) remember(diff.label, diff.values || []);
  }
  for (const rows of Object.values(result.groupedSpecs || {})) {
    for (const row of rows || []) {
      if (row?.label) remember(row.label, row.values || []);
    }
  }
  const rawLabels: string[] = [];
  const seenRaw = new Set<string>();
  for (const product of products) {
    for (const spec of product.rawSpecs || []) {
      const key = normLabel(spec.label);
      if (!key || seenRaw.has(key)) continue;
      seenRaw.add(key);
      rawLabels.push(spec.label);
    }
  }
  for (const label of rawLabels) {
    const values = products.map((p, i) => {
      const raw = findRaw(p, label);
      if (raw != null && !isBlankValue(raw)) return raw;
      return byNorm.get(normLabel(label))?.values[i] || "—";
    });
    remember(label, values);
  }

  const ranked = [...byNorm.values()]
    .filter((row) => valuesDiffer(row.values))
    .map((row, index) => ({ row, index, rank: keyDiffRank(row.label, deviceType, subtype) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const good = ranked.filter((r) => r.rank < 900);
  const chosen = (good.length ? good : ranked).slice(0, limit);
  return chosen.map((r) => ({ label: r.row.label, values: r.row.values }));
}

/**
 * Set deviceType from titles when the sheet said "other" (or disagreed),
 * move appliance specs out of Camera/Design, and rerank key diffs.
 */
export function applyCategoryTemplates(result: any): void {
  if (!result || !Array.isArray(result.products) || result.products.length < 1) return;

  enrichProductTitles(result.products);

  const titles = result.products.map((p: any) => String(p?.name || ""));
  const classified = classifyTitles(titles);
  const cur = String(result.deviceType || "other").toLowerCase();

  if (classified.deviceType !== "other" && (cur === "other" || cur !== classified.deviceType)) {
    result.deviceType = classified.deviceType;
    result.subcategory = classified.subtype;
    result.category = CATEGORY_NAME[classified.deviceType] || result.category || "Tech";
  } else if (classified.deviceType !== "other" && (!result.subcategory || result.subcategory === "other")) {
    result.subcategory = classified.subtype;
  }

  const deviceType = String(result.deviceType || classified.deviceType || "other");
  const subtype = classified.mixed || classified.mixedSubtypes ? undefined : classified.subtype;

  if (result.groupedSpecs && typeof result.groupedSpecs === "object") {
    const moved = relocateGroups(result.groupedSpecs, deviceType);
    result.groupedSpecs = moved.grouped;
    result.groupIcons = result.groupIcons && typeof result.groupIcons === "object" ? result.groupIcons : {};
    for (const key of Object.keys(result.groupIcons)) {
      if (!result.groupedSpecs[key]) delete result.groupIcons[key];
    }
    for (const [key, icon] of Object.entries(moved.icons)) {
      if (!result.groupIcons[key]) result.groupIcons[key] = icon;
    }
  }

  if (result.products.length >= 2) {
    const prioritized = prioritizeKeyDifferences(result, deviceType, subtype);
    if (prioritized.length) result.keyDifferences = prioritized;
  }
}
