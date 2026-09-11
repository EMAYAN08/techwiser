import { explainSpec, findAlternatives, generateComparison } from "./llm";
import { explainSpecOpenAI, findAlternativesOpenAI, generateOpenAIComparison } from "./openai";

type ProductPayload = { url: string; retailerText: string; title: string };

function preferGemini(): boolean {
  return (process.env.LLM_PROVIDER || "openai").toLowerCase() === "gemini";
}

async function withProvider<T>(label: string, openaiCall: () => Promise<T>, geminiCall: () => Promise<T>): Promise<T> {
  if (preferGemini()) {
    console.log(`[LLM] ${label} via Gemini (LLM_PROVIDER=gemini)`);
    return geminiCall();
  }
  console.log(`[LLM] ${label} via OpenAI`);
  return openaiCall();
}

export function generateAiComparison(productDataList: ProductPayload[]): Promise<any> {
  return withProvider(
    "compare",
    () => generateOpenAIComparison(productDataList),
    () => generateComparison(productDataList)
  );
}

export function explainSpecAi(productNames: string[], specLabel: string, specValues: string[]): Promise<any> {
  return withProvider(
    "explain-spec",
    () => explainSpecOpenAI(productNames, specLabel, specValues),
    () => explainSpec(productNames, specLabel, specValues)
  );
}

export function findAlternativesAi(products: any[]): Promise<any> {
  return withProvider(
    "alternatives",
    () => findAlternativesOpenAI(products),
    () => findAlternatives(products)
  );
}
