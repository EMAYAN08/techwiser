import {
  applyGroupedSpecsList,
  fallbackGroupFromHarvest,
  mergeOrphanSpecs,
  normalizeAlternativesResult,
  normalizeComparisonResult,
} from "../openai/merge";
import { generateGeminiJson } from "./client";
import { buildAlternativesPrompt, buildExplainSpecPrompt, buildGroupPrompt, buildHarvestPrompt } from "./prompts";
import { alternativesResponseSchema, explainSpecResponseSchema, groupResponseSchema, harvestResponseSchema } from "./schemas";

const MODEL_NAME = "gemini-3.1-flash-lite";

export async function generateComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  console.log(`[Gemini] Harvesting specs for ${productDataList.length} products...`);
  const harvest = await generateGeminiJson({
    operation: "harvestSpecs",
    modelName: MODEL_NAME,
    contents: buildHarvestPrompt(productDataList),
    responseSchema: harvestResponseSchema,
  });

  const harvestedCount = (harvest.products || []).reduce(
    (n: number, p: { specs?: unknown[] }) => n + (p.specs?.length || 0),
    0
  );
  console.log(`[Gemini] Harvest complete: ${harvestedCount} spec row(s). Grouping...`);

  let grouped: any;
  try {
    try {
      grouped = await generateGeminiJson({
        operation: "groupSpecs",
        modelName: MODEL_NAME,
        contents: buildGroupPrompt(harvest, productDataList),
        responseSchema: groupResponseSchema,
      });
    } catch (schemaErr: unknown) {
      const message = schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
      console.warn(`[Gemini] groupSpecs schema failed (${message}). Retrying without schema.`);
      grouped = await generateGeminiJson({
        operation: "groupSpecs",
        modelName: MODEL_NAME,
        contents: buildGroupPrompt(harvest, productDataList),
      });
    }
    applyGroupedSpecsList(grouped);
    if (!grouped.groupedSpecs || Object.keys(grouped.groupedSpecs).length === 0) {
      throw new Error("Grouping returned no spec groups");
    }
    console.log(`[Gemini] Grouping complete: ${Object.keys(grouped.groupedSpecs).length} groups`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Gemini] groupSpecs failed (${message}). Using local grouping fallback.`);
    grouped = fallbackGroupFromHarvest(harvest, productDataList);
  }

  mergeOrphanSpecs(grouped, harvest, productDataList.length);
  return normalizeComparisonResult(grouped, productDataList.length);
}

export async function explainSpec(productNames: string[], specLabel: string, specValues: string[]): Promise<any> {
  console.log(`[Gemini] explainSpec invoked for: "${specLabel}"`);
  const parsed = await generateGeminiJson({
    operation: "explainSpec",
    modelName: MODEL_NAME,
    contents: buildExplainSpecPrompt(productNames, specLabel, specValues),
    responseSchema: explainSpecResponseSchema,
  });
  console.log(`[Gemini] explainSpec completed for: "${specLabel}"`);
  return parsed;
}

export async function findAlternatives(products: any[]): Promise<any> {
  console.log(`[Gemini] findAlternatives invoked for ${products.length} products`);
  const parsed = await generateGeminiJson({
    operation: "findAlternatives",
    modelName: MODEL_NAME,
    contents: buildAlternativesPrompt(products),
    responseSchema: alternativesResponseSchema,
  });
  return normalizeAlternativesResult(parsed);
}
