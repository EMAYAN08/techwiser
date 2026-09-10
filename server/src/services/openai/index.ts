import { openaiJson } from "./client";
import {
  applyGroupedSpecsList,
  fallbackGroupFromHarvest,
  mergeOrphanSpecs,
  normalizeComparisonResult,
} from "./merge";
import { buildAlternativesPrompt, buildExplainSpecPrompt, buildGroupPrompt, buildHarvestPrompt } from "./prompts";
import { alternativesResponseSchema, explainSpecResponseSchema, groupResponseSchema, harvestResponseSchema } from "./schemas";

export async function generateOpenAIComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  console.log(`[OpenAI] Harvesting specs for ${productDataList.length} products...`);
  const harvest = await openaiJson({
    operation: "harvestSpecs",
    input: buildHarvestPrompt(productDataList),
    schemaName: "harvest",
    schema: harvestResponseSchema,
    timeoutMs: 90_000,
  });

  const harvestedCount = (harvest.products || []).reduce(
    (n: number, p: { specs?: unknown[] }) => n + (p.specs?.length || 0),
    0
  );
  console.log(`[OpenAI] Harvest complete: ${harvestedCount} spec row(s). Grouping...`);

  let grouped: any;
  try {
    try {
      grouped = await openaiJson({
        operation: "groupSpecs",
        input: buildGroupPrompt(harvest, productDataList),
        schemaName: "comparison",
        schema: groupResponseSchema,
        timeoutMs: 60_000,
      });
    } catch (schemaErr: unknown) {
      const message = schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
      console.warn(`[OpenAI] groupSpecs json_schema failed (${message}). Retrying json_object.`);
      grouped = await openaiJson({
        operation: "groupSpecs",
        input: buildGroupPrompt(harvest, productDataList),
        timeoutMs: 45_000,
      });
    }
    applyGroupedSpecsList(grouped);
    if (!grouped.groupedSpecs || Object.keys(grouped.groupedSpecs).length === 0) {
      throw new Error("Grouping returned no spec groups");
    }
    console.log(`[OpenAI] Grouping complete: ${Object.keys(grouped.groupedSpecs).length} groups`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[OpenAI] groupSpecs failed (${message}). Using local grouping fallback.`);
    grouped = fallbackGroupFromHarvest(harvest, productDataList);
  }

  mergeOrphanSpecs(grouped, harvest, productDataList.length);
  return normalizeComparisonResult(grouped, productDataList.length);
}

export async function explainSpecOpenAI(
  productNames: string[],
  specLabel: string,
  specValues: string[]
): Promise<any> {
  console.log(`[OpenAI] explainSpec invoked for: "${specLabel}"`);
  const parsed = await openaiJson({
    operation: "explainSpec",
    input: buildExplainSpecPrompt(productNames, specLabel, specValues),
    schemaName: "explainSpec",
    schema: explainSpecResponseSchema,
    timeoutMs: 30_000,
  });
  console.log(`[OpenAI] explainSpec completed for: "${specLabel}"`);
  return parsed;
}

export async function findAlternativesOpenAI(products: any[]): Promise<any> {
  console.log(`[OpenAI] findAlternatives invoked for ${products.length} products`);
  return openaiJson({
    operation: "findAlternatives",
    input: buildAlternativesPrompt(products),
    schemaName: "alternatives",
    schema: alternativesResponseSchema,
    timeoutMs: 45_000,
  });
}
