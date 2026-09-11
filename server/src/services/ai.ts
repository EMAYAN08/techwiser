import { explainSpec, findAlternatives, generateComparison } from "./llm";
import { explainSpecOpenAI, findAlternativesOpenAI, generateOpenAIComparison } from "./openai";

type ProductPayload = { url: string; retailerText: string; title: string };

function preferGemini(): boolean {
  return (process.env.LLM_PROVIDER || "openai").toLowerCase() === "gemini";
}

async function withGeminiFallback<T>(label: string, openaiCall: () => Promise<T>, geminiCall: () => Promise<T>): Promise<T> {
  if (preferGemini()) {
    console.log(`[LLM] ${label} via Gemini (LLM_PROVIDER=gemini)`);
    return geminiCall();
  }
  try {
    console.log(`[LLM] ${label} via OpenAI`);
    return await openaiCall();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[LLM] OpenAI ${label} failed (${message}). Falling back to Gemini.`);
    return geminiCall();
  }
}

export function generateAiComparison(productDataList: ProductPayload[]): Promise<any> {
  return withGeminiFallback(
    "compare",
    () => generateOpenAIComparison(productDataList),
    () => generateComparison(productDataList)
  );
}

export function explainSpecAi(productNames: string[], specLabel: string, specValues: string[]): Promise<any> {
  return withGeminiFallback(
    "explain-spec",
    () => explainSpecOpenAI(productNames, specLabel, specValues),
    () => explainSpec(productNames, specLabel, specValues)
  );
}

export function findAlternativesAi(products: any[]): Promise<any> {
  return withGeminiFallback(
    "alternatives",
    () => findAlternativesOpenAI(products),
    () => findAlternatives(products)
  );
}
