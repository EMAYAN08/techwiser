import { runStructuredCompare } from "../comparePipeline";
import { generateGeminiJson } from "./client";
import { buildAlternativesPrompt, buildExplainSpecPrompt } from "./prompts";
import { alternativesResponseSchema, explainSpecResponseSchema, groupResponseSchema, harvestResponseSchema } from "./schemas";
import { normalizeAlternativesResult } from "../openai/merge";

const MODEL_NAME = "gemini-3.1-flash-lite";

export async function generateComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  return runStructuredCompare(
    productDataList,
    (options) =>
      generateGeminiJson({
        operation: options.operation,
        modelName: MODEL_NAME,
        contents: options.prompt,
        responseSchema: options.schema as never,
      }),
    { harvest: harvestResponseSchema as never, group: groupResponseSchema as never }
  );
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
