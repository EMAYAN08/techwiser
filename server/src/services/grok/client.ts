const XAI_BASE = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.5";

function grokModel(): string {
  return process.env.GROK_MODEL || DEFAULT_MODEL;
}

export function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const parts: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== "message") continue;
    for (const block of item.content || []) {
      if ((block?.type === "output_text" || block?.type === "text") && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  return parts.join("\n").trim();
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
    throw new Error("Grok returned non-JSON content");
  }
}

export async function grokJson(options: {
  operation: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  webSearch?: boolean;
  timeoutMs?: number;
}): Promise<any> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI is not available in this environment");
  }

  const model = grokModel();
  console.log(`[Grok] Calling model: ${model} for operation: ${options.operation}${options.webSearch ? " (web_search)" : ""}`);

  const body: Record<string, unknown> = {
    model,
    input: options.input,
    text: {
      format: {
        type: "json_schema",
        name: options.schemaName,
        schema: options.schema,
        strict: true,
      },
    },
  };

  if (options.webSearch) {
    body.tools = [{ type: "web_search" }];
  }

  const response = await fetch(`${XAI_BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 180_000),
  });

  const rawText = await response.text();
  if (!response.ok) {
    console.error(`[Grok] ${options.operation} HTTP ${response.status}:`, rawText.slice(0, 800));
    throw new Error(`xAI API error ${response.status}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("Grok returned an unreadable response");
  }

  if (data.status && data.status !== "completed") {
    console.error(`[Grok] ${options.operation} incomplete:`, data.status, data.error);
    throw new Error(`Grok response ${data.status}`);
  }

  const content = extractOutputText(data);
  if (!content) {
    throw new Error("No content received from Grok");
  }

  return parseJsonContent(content);
}
