import { GoogleGenAI, Schema } from "@google/genai";

export async function generateGeminiJson(options: {
  operation: string;
  modelName: string;
  contents: string;
  responseSchema?: Schema;
}): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log(`[Gemini] Calling model: ${options.modelName} for operation: ${options.operation}`);
  const response = await ai.models.generateContent({
    model: options.modelName,
    contents: options.contents,
    config: {
      responseMimeType: "application/json",
      ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
    },
  });

  const content = response.text;
  if (!content) throw new Error("No content received from Gemini");

  const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanContent);
}
