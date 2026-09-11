import { preferredGroupsJson } from "../../schemas/spec_groups";

const MAX_RETAILER_CHARS = 40_000;

export function clipRetailerText(text: string, max = MAX_RETAILER_CHARS): string {
  if (!text || text.length <= max) return text || "";
  const head = 8_000;
  const tail = max - head - 80;
  return `${text.slice(0, head)}\n\n[...truncated middle of page...]\n\n${text.slice(-tail)}`;
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
6. values[i] MUST be the spec for products[i] / Product {i+1} in that URL order. Swapping values between products is a critical error. Use "—" only when that product truly has no value.
7. winnerIndex: 0 or 1 (or 2) for the better spec in that same product order, -1 for a draw or when better/worse does not apply.
8. products[].rawSpecs MUST be the full harvested list for that product (label + value).
9. Write a punchy 2–3 sentence overall aiSummary and 3–5 keyDifferences that actually differ.
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
