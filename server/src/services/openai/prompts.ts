import { preferredGroupsJson } from "../../schemas/spec_groups";

const MAX_RETAILER_CHARS = 12_000;

const NOISE_LINE = /^(cookie|accept all|sign in|log in|newsletter|privacy policy|terms of use|skip to|add to cart|buy now|related products|customers also|breadcrumb|javascript must)/i;
const SPEC_TOKEN = /\b(hz|gb|tb|hdmi|usb|oled|qled|mah|wifi|bluetooth|4k|8k|inch|nits|watt|ghz|mpix|megapixel)\b/i;

export function trimRetailerText(text: string, max = MAX_RETAILER_CHARS): string {
  if (!text) return "";
  const kept: string[] = [];
  let size = 0;
  const push = (line: string) => {
    const clipped = line.trim().slice(0, 360);
    if (!clipped || size + clipped.length + 1 > max) return;
    kept.push(clipped);
    size += clipped.length + 1;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || NOISE_LINE.test(line)) continue;
    if (line.length > 500) {
      const pairs = line.match(/[A-Za-z][^:\n]{1,48}:\s+\S[^.]{0,100}/g);
      if (pairs && pairs.length >= 3) {
        for (const pair of pairs.slice(0, 80)) push(pair);
        continue;
      }
      if (SPEC_TOKEN.test(line)) push(line.slice(0, 500));
      continue;
    }
    push(line);
    if (size >= max) break;
  }
  const trimmed = kept.join("\n").trim();
  if (trimmed.length >= 80) return trimmed.slice(0, max);
  const head = Math.min(4_000, Math.floor(max * 0.45));
  const tail = Math.max(0, max - head - 80);
  return `${text.slice(0, head)}\n\n[...truncated middle of page...]\n\n${text.slice(-tail)}`.slice(0, max);
}

export function clipRetailerText(text: string, max = MAX_RETAILER_CHARS): string {
  if (!text) return "";
  if (text.length <= max && text.split("\n").length > 1 && text.length <= 6_000) return text;
  return trimRetailerText(text, max);
}

export function buildHarvestPrompt(
  productDataList: { url: string; retailerText: string; title: string }[]
): string {
  const dataString = productDataList
    .map(
      (d, i) => `
--- PRODUCT ${i + 1} ---
URL: ${d.url}
Title: ${d.title}
RETAILER SOURCE TEXT:
${clipRetailerText(d.retailerText)}
------------------------
`
    )
    .join("\n\n");

  return `
You are a meticulous consumer-electronics spec researcher.

TASK: Build a COMPLETE flat specification list for each product. Grouping happens later. Do not omit specs.

HOW TO GATHER SPECS
1. Parse the retailer source text. Extract EVERY technical specification mentioned (hardware, software, dimensions, ports, sensors, codecs, charging, box contents, warranty, ratings).
2. Fill gaps with your knowledge of the exact model (manufacturer spec sheets you know, typical published specs). Never invent a value — use "Unknown" if you cannot verify it.
3. Align labels across products where they describe the same attribute (e.g. both "RAM", not "Memory" vs "RAM").
4. Prefer specific values ("16 GB LPDDR5X") over marketing copy.
5. Display / native / screen resolution must be a pixel grid (e.g. 2556 x 1179 or 3840 x 2160), never a camera megapixel figure. Put 12MP/48MP only on camera rows.
6. Never copy a brightness or nits number from one product onto another. If that product's source text does not contain the number, use "Unknown".

ZERO DATA LOSS: If a spec appears in the scrape or is a commonly published spec for this exact model, it MUST appear in specs[]. Aim for a thorough sheet (typically 20–60 rows for phones/laptops/TVs; fewer only for simple accessories).

SOURCE TAGS
- scraped: taken from the retailer text
- knowledge: filled from model knowledge when the retailer page omitted it
- web: only if you are certain of an official published value

Return one object in products[] per input product, in the same order.
${dataString}
`.trim();
}

export function buildGroupPrompt(
  harvest: { products: { name: string; brand: string; specs: { label: string; value: string; source?: string }[] }[] },
  productDataList: { url: string; retailerText: string; title: string }[]
): string {
  const harvestJson = JSON.stringify(harvest, null, 2);
  const urlBlock = productDataList
    .map((d, i) => `Product ${i + 1} URL: ${d.url}\nProduct ${i + 1} page title: ${d.title}`)
    .join("\n");

  return `
You are an elite consumer electronics reviewer.

You are given a COMPLETE flat spec harvest for 2–3 products (already researched). Your job is to STRUCTURE it for a comparison UI — not to drop specs.

--- RULES ---
1. EVERY harvested spec must appear in groupedSpecsList. Do not omit, merge-away, or "simplify" a spec out of existence.
2. Preferred group names below are a GUIDELINE, not a whitelist. Use them when they fit. If a spec does not fit, CREATE a new group (e.g. "AI Features", "Cooling", "Camera") or put it in "Other Features". Never drop it.
3. Pick deviceType from the keys in the guideline (smartphone, laptop, television, ...). Use "other" if unsure.
4. iconKey must be one of: cpu, battery, display, camera, wifi, speaker, ports, design, software, health, storage, memory, graphics, keyboard, smart, audio, other.
5. products[] MUST stay in the same order as the PRODUCT URLS list (Product 1, Product 2, …). Never sort, swap, or put a "winner" first.
6. values[i] MUST be the spec for products[i] / Product {i+1} in that URL order. Swapping values between products is a critical error. Use "—" only when that product truly has no value. Do not copy nits, HDR lists, or refresh rates across columns.
6b. A row labeled Display Resolution, Native Resolution, or Screen Resolution must use the pixel grid (2556 x 1179), never a camera megapixel value such as 12MP.
7. winnerIndex: 0 or 1 (or 2) for the better spec in that same product order, -1 for a draw or when better/worse does not apply.
8. products[].rawSpecs MUST be the full harvested list for that product (label + value).
9. Write a punchy 2–3 sentence overall aiSummary and 3–5 keyDifferences that actually differ. Lead appliances with capacity, energy, and noise (not hoses, SKUs, or model numbers); drones with flight time, range, and weight; soundbars with channels, wattage, and Atmos/HDMI; cameras with sensor, video, and lens; headphones with noise cancelling, battery, and Bluetooth. Do not put RAM or chipset on those categories, and do not file appliance specs under Camera.
10. Keep retailer names short (Best Buy, Amazon, Walmart, ...). Pass the original URL through. Keep the scraped/known price if present.
11. For EACH product fill:
    - aiSummary: 2–3 sentences on what this model is best suited for (use cases).
    - badges: 3–6 short highlight tags such as "Fast", "Best battery", "Bright display".
    - userInsights: 2–4 sentences of real-world buyer sentiment (not marketing copy).
    - userPros: 3–5 short buyer-loved points.
    - userCons: 2–4 short recurring complaints. If reviews are thin, still give honest trade-offs from known limitations.

You MUST return a single JSON object.

--- PREFERRED GROUPS BY DEVICE TYPE ---
${preferredGroupsJson()}

--- PRODUCT URLS ---
${urlBlock}

--- HARVESTED SPECS (source of truth — do not drop any row) ---
${harvestJson}
`.trim();
}

export function buildMergedComparePrompt(
  productDataList: { url: string; retailerText: string; title: string }[]
): string {
  const dataString = productDataList
    .map(
      (d, i) => `
--- PRODUCT ${i + 1} ---
URL: ${d.url}
Title: ${d.title}
RETAILER SOURCE TEXT:
${clipRetailerText(d.retailerText)}
------------------------
`
    )
    .join("\n\n");

  return `
You are an elite consumer electronics reviewer doing ONE pass: extract specs and structure the comparison.

TASK
1. Read each retailer source. Extract every technical spec that is actually present (hardware, display, ports, battery, dimensions, box contents, warranty).
2. Fill obvious gaps only from knowledge of that exact model. Never invent refresh rates, resolutions, capacities, or model numbers. Use "Unknown" when you cannot verify a value.
3. Align labels across products. values[i] is Product i in URL order. Swapping products is a critical error. Do not copy a nits/brightness, HDR list, or refresh rate from one product's text onto another product.
3b. Display Resolution, Native Resolution, and Screen Resolution must be pixel dimensions from that product (e.g. 2556 x 1179 or 3840 x 2160). Never put camera megapixels (12MP, 13MP, 48MP) in a display-resolution row.
4. Put EVERY kept spec into groupedSpecsList and into that product's rawSpecs. Do not drop rows to save space.
5. deviceType is a guideline key (smartphone, laptop, television, ...) or "other".
6. iconKey must be one of: cpu, battery, display, camera, wifi, speaker, ports, design, software, health, storage, memory, graphics, keyboard, smart, audio, other.
7. winnerIndex is 0, 1, or 2 for the better value in URL order, or -1 for a tie / not comparable.
8. Write a punchy 2–3 sentence overall aiSummary and 3–5 keyDifferences that actually differ.
9. Lead appliances with capacity, energy, and noise; drones with flight time, range, and weight; soundbars with channels, wattage, and Atmos/HDMI; cameras with sensor, video, and lens; headphones with noise cancelling, battery, and Bluetooth. Do not put RAM or chipset on those categories.
10. Keep retailer names short. Pass the original URL through. Keep the scraped price if present.
11. For each product fill aiSummary (2–3 sentences), badges (3–6 short tags), userInsights (2–4 sentences), userPros (3–5), userCons (2–4).

Preferred group names are a guideline, not a whitelist. Create a group or use "Other Features" instead of dropping a spec.

--- PREFERRED GROUPS BY DEVICE TYPE ---
${preferredGroupsJson()}

${dataString}
`.trim();
}

export function buildExplainSpecPrompt(productNames: string[], specLabel: string, specValues: string[]): string {
  return `
You are a technical analyst explaining specs to a shopper who is not an engineer.

Specification: "${specLabel}"
${productNames.map((name, i) => `- ${name}: ${specValues[i] || "N/A"}`).join("\n")}

Return:
- concept: 1–2 sentences on what this spec means in daily use
- breakdowns: one object per product with productName, value, and a 1–2 sentence insight (who it is best for)
`.trim();
}

export function buildAlternativesPrompt(products: any[]): string {
  return `
You are a highly knowledgeable tech advisor shopping for a Canadian buyer.

The user is comparing:
${JSON.stringify(products, null, 2)}

Use your knowledge of current Canadian/North American alternatives in a similar price range.

If the compared products are already the best in class for the money, return an empty alternatives array.
Otherwise suggest up to 3 strictly better alternatives (value, performance, or recency).

Each alternative MUST use a specific model name including generation/year (e.g. "Sony WH-1000XM5", "ASUS ROG Zephyrus G14 (2024)").
estimatedPrice like "$999".
reasonWhyBetter: 2–4 sentences covering who it is for and why it beats the compared products. Do not truncate.
highlights: 2–4 short punchy tags in the same style as product badges, e.g. "Best Camera", "Better Value", "Longer Battery", "Best Display". Each tag 1–3 words.
imageUrl: a real http(s) product image if you can find one, otherwise "".
`.trim();
}
