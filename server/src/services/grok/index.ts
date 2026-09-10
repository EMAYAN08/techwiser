import { grokJson } from "./client";
import { applyGroupedSpecsList, mergeOrphanSpecs } from "./merge";
import { buildAlternativesPrompt, buildExplainSpecPrompt, buildGroupPrompt, buildHarvestPrompt } from "./prompts";
import {
  alternativesResponseSchema,
  explainSpecResponseSchema,
  groupResponseSchema,
  harvestResponseSchema,
} from "./schemas";

export async function generateGrokComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  console.log(`[Grok] Harvesting specs for ${productDataList.length} products...`);
  const harvest = await grokJson({
    operation: "harvestSpecs",
    input: buildHarvestPrompt(productDataList),
    schemaName: "harvest",
    schema: harvestResponseSchema,
    webSearch: true,
    timeoutMs: 180_000,
  });

  const harvestedCount = (harvest.products || []).reduce(
    (n: number, p: { specs?: unknown[] }) => n + (p.specs?.length || 0),
    0
  );
  console.log(`[Grok] Harvest complete: ${harvestedCount} spec row(s). Grouping...`);

  const grouped = await grokJson({
    operation: "groupSpecs",
    input: buildGroupPrompt(harvest, productDataList),
    schemaName: "comparison",
    schema: groupResponseSchema,
    timeoutMs: 180_000,
  });

  applyGroupedSpecsList(grouped);
  mergeOrphanSpecs(grouped, harvest, productDataList.length);

  return grouped;
}

export async function explainSpecGrok(
  productNames: string[],
  specLabel: string,
  specValues: string[]
): Promise<any> {
  console.log(`[Grok] explainSpec invoked for: "${specLabel}"`);
  const parsed = await grokJson({
    operation: "explainSpec",
    input: buildExplainSpecPrompt(productNames, specLabel, specValues),
    schemaName: "explainSpec",
    schema: explainSpecResponseSchema,
    timeoutMs: 45_000,
  });
  console.log(`[Grok] explainSpec completed for: "${specLabel}"`);
  return parsed;
}

export async function findAlternativesGrok(products: any[]): Promise<any> {
  console.log(`[Grok] findAlternatives invoked for ${products.length} products`);
  return grokJson({
    operation: "findAlternatives",
    input: buildAlternativesPrompt(products),
    schemaName: "alternatives",
    schema: alternativesResponseSchema,
    webSearch: true,
    timeoutMs: 120_000,
  });
}
