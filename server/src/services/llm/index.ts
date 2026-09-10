import { TechCategories } from "../../schemas/tech_categories";
import { generateGeminiJson } from "./client";
import { buildAlternativesPrompt, buildComparisonPrompt, buildExplainSpecPrompt } from "./prompts";
import { alternativesResponseSchema, comparisonResponseSchema, explainSpecResponseSchema } from "./schemas";

const MODEL_NAME = "gemini-3.1-flash-lite";

export async function generateComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  const schemaJson = JSON.stringify(TechCategories, null, 2);
  const fullPrompt = buildComparisonPrompt(schemaJson, productDataList);

  try {
    const parsed = await generateGeminiJson({
      operation: "generateComparison",
      modelName: MODEL_NAME,
      contents: fullPrompt,
      responseSchema: comparisonResponseSchema,
    });

    if (parsed.groupedSpecsList) {
      parsed.groupedSpecs = {};
      for (const group of parsed.groupedSpecsList) {
        parsed.groupedSpecs[group.groupName] = group.specs;
      }
      delete parsed.groupedSpecsList;
    }

    return parsed;
  } catch (err: any) {
    console.error("Gemini LLM Error:", err.message || err);
    throw err;
  }
}

export async function explainSpec(productNames: string[], specLabel: string, specValues: string[]): Promise<any> {
  console.log(`[LLM Service] explainSpec invoked for: "${specLabel}"`);
  console.log(`[LLM Service] Products: ${productNames.join(", ")}`);

  const prompt = buildExplainSpecPrompt(productNames, specLabel, specValues);

  try {
    const parsed = await generateGeminiJson({
      operation: "explainSpec",
      modelName: MODEL_NAME,
      contents: prompt,
      responseSchema: explainSpecResponseSchema,
    });
    console.log(`[LLM Service] explainSpec completed successfully for: "${specLabel}"`);
    return parsed;
  } catch (err: any) {
    console.error(`[LLM Service] explainSpec Error for "${specLabel}":`, err.message || err);
    throw err;
  }
}

export async function findAlternatives(products: any[]): Promise<any> {
  console.log(`[LLM Service] findAlternatives invoked for ${products.length} products`);

  const prompt = buildAlternativesPrompt(products);

  try {
    return await generateGeminiJson({
      operation: "findAlternatives",
      modelName: MODEL_NAME,
      contents: prompt,
      responseSchema: alternativesResponseSchema,
    });
  } catch (err: any) {
    console.error(`[LLM Service] findAlternatives Error:`, err.message || err);
    throw err;
  }
}
