import { runStructuredCompare } from "../comparePipeline";
import { openaiJson } from "./client";
import { normalizeAlternativesResult } from "./merge";
import { buildAlternativesPrompt, buildExplainSpecPrompt } from "./prompts";
import { alternativesResponseSchema, explainSpecResponseSchema } from "./schemas";

export async function generateOpenAIComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  return runStructuredCompare(productDataList, (options) =>
    openaiJson({
      operation: options.operation,
      input: options.prompt,
      schemaName: options.schemaName,
      schema: options.schema,
      timeoutMs: options.timeoutMs,
    })
  );
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
  const parsed = await openaiJson({
    operation: "findAlternatives",
    input: buildAlternativesPrompt(products),
    schemaName: "alternatives",
    schema: alternativesResponseSchema,
    timeoutMs: 45_000,
  });
  return normalizeAlternativesResult(parsed);
}
