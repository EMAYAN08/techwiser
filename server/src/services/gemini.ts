import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function generateComparison(scrapedData: {url: string, rawText: string}[]): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You are an expert tech advisor. I have provided the raw text scraped from ${scrapedData.length} product pages.
Your job is to extract their specifications, normalize them so they can be compared side-by-side, and evaluate which product wins in each spec.
You must also provide a short AI summary of who each product is best for, and identify 3-5 key differences.

Raw Data:
${scrapedData.map((d, i) => `--- PRODUCT ${i + 1} (URL: ${d.url}) ---\n${d.rawText.substring(0, 30000)}`).join('\n\n')}

INSTRUCTIONS:
1. Extract the product name, brand, and clean up the specs.
2. Ensure specs are categorized dynamically (e.g., "Performance", "Display", "Battery").
3. For each spec row across the products, determine if one is the clear winner (isWinner: true) or if it's a draw (isDraw: true).
4. Extract numeric values (e.g., 18 for "18 GB") for comparison if possible.
5. Provide a 2-3 sentence AI summary comparing them.
6. Provide exactly 1-2 badges per product (e.g., "Best Overall", "Best Value", "Best Battery").
7. Extract the retailer name (e.g., "bestbuy", "amazon", "canadacomputers") based on the URL domain.
8. Output strictly conforming to the requested JSON schema.
`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      products: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            retailer: { type: Type.STRING },
            url: { type: Type.STRING },
            price: { type: Type.STRING },
            aiSummary: { type: Type.STRING },
            badges: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            specs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  category: { type: Type.STRING },
                  numericValue: { type: Type.NUMBER },
                  isWinner: { type: Type.BOOLEAN },
                  isDraw: { type: Type.BOOLEAN },
                },
                required: ["label", "value", "category"]
              }
            }
          },
          required: ["name", "brand", "retailer", "url", "specs", "aiSummary", "badges"]
        }
      },
      keyDifferences: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            values: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["label", "values"]
        }
      },
      aiSummary: { type: Type.STRING }
    },
    required: ["products", "keyDifferences", "aiSummary"]
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('No text returned from Gemini API.');
      }
      
      return JSON.parse(resultText);
    } catch (error: any) {
      lastError = error;
      
      // If it's a 503 Service Unavailable (High Demand), wait and retry
      if (error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')) {
        console.warn(`Gemini 503 High Demand. Attempt ${attempt} of 3. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      
      // If it's any other error (like a bad schema), throw immediately
      console.error('Gemini extraction error:', error);
      throw error;
    }
  }
  
  console.error('Gemini extraction failed after 3 retries:', lastError);
  throw lastError;
}
