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
${d.retailerText.substring(0, 10000)}
------------------------
`).join('\n\n');

  const systemPrompt = `
You are an elite, highly experienced consumer electronics reviewer and technical analyst. 
Your objective is to provide the ultimate product comparison to help users make a confident purchasing decision.
You are given scraped text data from retailer websites for 2-3 products.

--- YOUR INSTRUCTIONS ---
1. RAW DATA EXTRACTION: Deeply parse the retailer text. Extract EVERY SINGLE technical specification, the exact current price, the general product description/overview, and the "what's in the box" (included accessories) list. Do not drop any data.
2. ENRICH & SYNTHESIZE (THINKING PHASE): 
   - Identify the products being compared.
   - Using your vast internal knowledge base and reasoning, fill in any critical missing specifications that the retailer omitted (e.g., if the retailer doesn't mention RAM but you know it).
   - Analyze real-world user feedback from reliable sources, common complaints, durability issues, and praises for these specific products. 
   - Synthesize a comprehensive "userInsights" summary for each product (e.g., "Users love the battery life but note the camera struggles in low light. Pro tip: buy a case because the back scratches easily.").
3. ADVANCED DEEP DIVE SPECS: For the "groupedSpecs" output, provide an EXHAUSTIVE, MASSIVE list of advanced technical specifications targeting power users. Dig deep into your knowledge base for things like aperture, sensor size, memory bandwidth, dimming zones, specific Wi-Fi bands, cooling systems, build materials, etc. Group them exactly according to the \`Attribute_Groups\` listed in the Taxonomy.
4. ESSENTIAL SPECS SUMMARY: For the "essentialSpecs" output, provide ONLY the top 5-7 most important, high-level consumer specifications (e.g., Screen Size, Processor, RAM, Battery Life, Storage) that a casual buyer needs to see at a glance.
5. FINAL VERDICT: Provide a short, punchy AI summary (2-3 sentences) comparing the products overall. Identify 3-5 key differences.

--- JSON TAXONOMY ---
${schemaJson}

--- RESPONSE FORMAT ---
You must output ONLY valid JSON matching this exact structure:
{
  "category": "string (the main category)",
  "subcategory": "string (the subcategory)",
  "aiSummary": "string (overall comparison summary)",
  "keyDifferences": [
    {
      "label": "string (e.g., 'Battery Endurance')",
      "values": ["product 1 value", "product 2 value"]
    }
  ],
  "products": [
    {
      "name": "string (clean product name)",
      "brand": "string",
      "retailer": "string (store name)",
      "url": "string (pass back the URL)",
      "price": "string (the exact price scraped, e.g. '$999.99' or 'N/A')",
      "description": "string (a rich 2-3 sentence overview of the product)",
      "whatsInTheBox": ["item 1", "item 2", "item 3"],
      "userInsights": "string (a highly helpful summary of real user reviews, common issues, and bonus tips)",
      "badges": ["string", "string"],
      "aiSummary": "string (product-specific summary)"
    }
  ],
  "essentialSpecs": {
    "Key Specifications": [
      {
        "label": "Spec Name (e.g., Screen Size)",
        "values": ["product 1 value", "product 2 value"],
        "winnerIndex": "number (0 or 1, or -1 for draw)"
      }
    ]
  },
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
      model: 'gemini-3.1-flash',
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
