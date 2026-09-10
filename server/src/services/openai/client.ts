const OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function openaiModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return key;
}

export function parseJsonContent(raw: string): any {
  const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("OpenAI returned non-JSON content");
  }
}

export async function openaiJson(options: {
  operation: string;
  input: string;
  schemaName?: string;
  schema?: Record<string, unknown>;
  timeoutMs?: number;
  model?: string;
}): Promise<any> {
  const model = options.model || openaiModel();
  const useSchema = !!(options.schema && options.schemaName);
  console.log(`[OpenAI] Calling model: ${model} for operation: ${options.operation}${useSchema ? " (json_schema)" : " (json_object)"}`);

  const responseFormat = useSchema
    ? {
        type: "json_schema",
        json_schema: {
          name: options.schemaName,
          schema: options.schema,
          strict: true,
        },
      }
    : { type: "json_object" };

  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: options.input }],
      response_format: responseFormat,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
  });

  const rawText = await response.text();
  if (!response.ok) {
    console.error(`[OpenAI] ${options.operation} HTTP ${response.status}:`, rawText.slice(0, 800));
    throw new Error(`OpenAI API error ${response.status}`);
  }

  const data = JSON.parse(rawText);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content received from OpenAI");
  return parseJsonContent(content);
}
