import OpenAI from 'openai';
import { TechCategories } from '../schemas/tech_categories';

export async function generateComparison(
  productDataList: { url: string; retailerText: string; officialText: string; title: string }[]
): Promise<any> {
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY, // Fallback just in case
  });

  const schemaJson = JSON.stringify(TechCategories, null, 2);

  // Build a string for each product data
  const dataString = productDataList.map((d, i) => `
--- PRODUCT ${i + 1} ---
URL: ${d.url}
Title: ${d.title}
RETAILER SOURCE TEXT:
${d.retailerText.substring(0, 8000)}

OFFICIAL SOURCE TEXT (IF ANY):
${d.officialText.substring(0, 10000)}
------------------------
`).join('\n\n');

  const systemPrompt = `
You are an expert and experienced technical advisor. You are given scraped technical data from 2-3 products.
The data comes from two sources: the Retailer website and the Official Brand website.

YOUR INSTRUCTIONS:
1. Identify the single best-fitting subcategory for these products from the provided JSON Taxonomy (e.g. "Smartphones").
2. Merge the Retailer and Official specs. Extract EVERY SINGLE technical specification provided. Do not omit any details. If sources conflict, trust the Official specs.
3. Group these extracted specs exactly according to the \`Attribute_Groups\` listed in the JSON Taxonomy for that subcategory. If a spec doesn't fit any group, place it in an "Other Specifications" group.
4. Compare the products to determine the winner for each spec (if applicable).
5. Provide a short AI summary (2-3 sentences) comparing the products overall.
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
      "aiSummary": "string"
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

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-pro-exp-02-05:free',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: dataString }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from OpenRouter");
    
    return JSON.parse(content);
  } catch (err: any) {
    console.error("OpenRouter LLM Error:", err.message || err);
    throw err;
  }
}
