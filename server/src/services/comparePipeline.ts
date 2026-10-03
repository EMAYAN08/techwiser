import {
  alignHarvestToInputs,
  applyGroupedSpecsList,
  fallbackGroupFromHarvest,
  mergeOrphanSpecs,
  normalizeComparisonResult,
  realignGroupedToInputs,
} from "./openai/merge";
import { buildGroupPrompt, buildHarvestPrompt, buildMergedComparePrompt, clipRetailerText } from "./openai/prompts";
import { groupResponseSchema as openaiGroupSchema, harvestResponseSchema as openaiHarvestSchema } from "./openai/schemas";

export type CompareInput = { url: string; retailerText: string; title: string };

export type CompareJsonCall = (options: {
  operation: string;
  prompt: string;
  schemaName?: string;
  schema?: Record<string, unknown>;
  timeoutMs?: number;
}) => Promise<any>;

function prepareInputs(productDataList: CompareInput[]): CompareInput[] {
  return productDataList.map((item) => ({
    ...item,
    retailerText: clipRetailerText(item.retailerText || ""),
  }));
}

function harvestFromGrouped(grouped: any, productDataList: CompareInput[]) {
  const products = productDataList.map((item, index) => {
    const product = grouped?.products?.[index] || {};
    const specs: { label: string; value: string; source: "scraped" }[] = [];
    const seen = new Set<string>();
    const push = (label: unknown, value: unknown) => {
      const l = String(label || "").trim();
      const v = String(value || "").trim();
      const key = l.toLowerCase();
      if (!l || !v || seen.has(key)) return;
      seen.add(key);
      specs.push({ label: l, value: v, source: "scraped" });
    };
    for (const row of product.rawSpecs || []) push(row?.label, row?.value);
    const groups = grouped?.groupedSpecs && typeof grouped.groupedSpecs === "object" ? grouped.groupedSpecs : {};
    for (const rows of Object.values(groups) as any[]) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) push(row?.label, Array.isArray(row?.values) ? row.values[index] : "");
    }
    return {
      name: String(product.name || item.title || ""),
      brand: String(product.brand || ""),
      specs,
    };
  });
  return { products };
}

function groupedLooksValid(grouped: any): boolean {
  if (!grouped || typeof grouped !== "object") return false;
  applyGroupedSpecsList(grouped);
  return Boolean(grouped.groupedSpecs && Object.keys(grouped.groupedSpecs).length > 0);
}

async function twoStep(
  json: CompareJsonCall,
  productDataList: CompareInput[],
  harvestSchema: Record<string, unknown>,
  groupSchema: Record<string, unknown>
): Promise<any> {
  const harvest = await json({
    operation: "harvestSpecs",
    prompt: buildHarvestPrompt(productDataList),
    schemaName: "harvest",
    schema: harvestSchema,
    timeoutMs: 70_000,
  });
  alignHarvestToInputs(harvest, productDataList);
  let grouped: any;
  try {
    try {
      grouped = await json({
        operation: "groupSpecs",
        prompt: buildGroupPrompt(harvest, productDataList),
        schemaName: "comparison",
        schema: groupSchema,
        timeoutMs: 50_000,
      });
    } catch (schemaErr: unknown) {
      const message = schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
      console.warn(`[LLM] groupSpecs schema failed (${message}). Retrying without schema.`);
      grouped = await json({
        operation: "groupSpecs",
        prompt: buildGroupPrompt(harvest, productDataList),
        timeoutMs: 40_000,
      });
    }
    if (!groupedLooksValid(grouped)) throw new Error("Grouping returned no spec groups");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LLM] groupSpecs failed (${message}). Using local grouping fallback.`);
    grouped = fallbackGroupFromHarvest(harvest, productDataList);
  }
  realignGroupedToInputs(grouped, harvest, productDataList);
  mergeOrphanSpecs(grouped, harvest, productDataList.length);
  return normalizeComparisonResult(grouped, productDataList.length, productDataList);
}

/**
 * One structured compare call when it yields groups; otherwise the original harvest + group pipeline.
 */
export async function runStructuredCompare(
  productDataList: CompareInput[],
  json: CompareJsonCall,
  schemas?: { harvest?: Record<string, unknown>; group?: Record<string, unknown> }
): Promise<any> {
  const harvestSchema = schemas?.harvest || openaiHarvestSchema;
  const groupSchema = schemas?.group || openaiGroupSchema;
  const inputs = prepareInputs(productDataList);
  const chars = inputs.reduce((n, item) => n + item.retailerText.length, 0);
  console.log(`[LLM] Merged compare for ${inputs.length} products (${chars} chars after trim)...`);
  try {
    let grouped: any;
    try {
      grouped = await json({
        operation: "compare",
        prompt: buildMergedComparePrompt(inputs),
        schemaName: "comparison",
        schema: groupSchema,
        timeoutMs: 75_000,
      });
    } catch (schemaErr: unknown) {
      const message = schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
      console.warn(`[LLM] merged json_schema failed (${message}). Retrying json_object.`);
      grouped = await json({
        operation: "compare",
        prompt: buildMergedComparePrompt(inputs),
        timeoutMs: 60_000,
      });
    }
    if (!groupedLooksValid(grouped)) throw new Error("Merged compare returned no spec groups");
    const harvest = harvestFromGrouped(grouped, inputs);
    alignHarvestToInputs(harvest, inputs);
    realignGroupedToInputs(grouped, harvest, inputs);
    mergeOrphanSpecs(grouped, harvest, inputs.length);
    console.log(`[LLM] Merged compare ok: ${Object.keys(grouped.groupedSpecs).length} groups`);
    return normalizeComparisonResult(grouped, inputs.length, inputs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[LLM] Merged compare failed (${message}). Falling back to harvest + group.`);
    return twoStep(json, inputs, harvestSchema, groupSchema);
  }
}
