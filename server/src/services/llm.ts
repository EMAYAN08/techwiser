import { GoogleGenAI } from '@google/genai';
import { TechCategories } from '../schemas/tech_categories';

export async function generateComparison(
  productDataList: { url: string; retailerText: string; title: string }[]
): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const schemaJson = JSON.stringify(TechCategories, null, 2);

  const dataString = productDataList.map((d, i) => `
--- PRODUCT ${i + 1} ---
URL: ${d.url}
Title: ${d.title}
RETAILER SOURCE TEXT:
${d.retailerText.substring(0, 8000)}
------------------------
`).join('\n\n');

  const systemPrompt = `
You are an expert and experienced technical advisor. You are given scraped technical data from 2-3 products.
The data comes from the Retailer website.

YOUR INSTRUCTIONS:
1. Identify the single best-fitting subcategory for these products from the provided JSON Taxonomy (e.g. "Smartphones").
2. Extract EVERY SINGLE technical specification provided. Do not omit any details.
3. Group these extracted specs exactly according to the \`Attribute_Groups\` listed in the JSON Taxonomy for that subcategory. If a spec doesn't fit any group, place it in an "Other Specifications" group.
4. Compare the products to determine the winner for each spec (if applicable).
5. Provide a short AI summary (2-3 sentences) comparing the products overall, factoring in the extracted overviews and product descriptions.
6. Identify 3-5 key differences.

--- JSON TAXONOMY ---
${schemaJson}
---------------------

You must output ONLY valid JSON matching this exact structure:
{
  "category": "string (the main category)",
  "subcategory": "string (the subcategory)",
  "aiSummary": "string",
  "keyDifferences": [
    {
      "label": "string (e.g., 'Battery Endurance')",
      "values": ["product 1 value", "product 2 value"]
    }
  ],
  "products": [
    {
      "name": "string",
      "brand": "string",
      "retailer": "string",
      "url": "string (pass back the URL)",
      "price": "string",
      "badges": ["string", "string"],
      "aiSummary": "string",
      "rawSpecs": [
        { "label": "string (e.g. 'Refresh Rate')", "value": "string (e.g. '120Hz' or '-')" }
      ]
    }
  ],
  "groupedSpecs": {
    "Group Name from Taxonomy": [
      {
        "label": "Spec Name (e.g., Refresh Rate)",
        "values": ["product 1 value", "product 2 value"],
        "winnerIndex": "number (0 or 1, or -1 for draw)"
      }
    ]
  }
}
`;

  const fullPrompt = systemPrompt + "\n\n--- INPUT DATA ---\n" + dataString;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const content = response.text;
    if (!content) throw new Error("No content received from Gemini");
    
    let cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (err: any) {
    console.error("Gemini LLM Error:", err.message || err);
    throw err;
  }
}

