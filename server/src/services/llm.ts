import { GoogleGenAI, Type, Schema } from '@google/genai';
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
1. RAW DATA EXTRACTION: Deeply parse the retailer text. Extract EVERY SINGLE technical specification, the exact current price, the general product description/overview, and the "what's in the box" (included accessories) list.
2. ENRICH & SYNTHESIZE (AGENTIC THINKING PHASE):
   - Using your internal knowledge base and reasoning, infer any critical missing specifications that the scraper missed or the retailer omitted (e.g., if the retailer doesn't mention RAM or refresh rate but you know it).
   - Analyze real-world user feedback, durability, and praises for these specific products. 
   - Synthesize a comprehensive "userInsights" summary for each product.
3. CATEGORIZE & STRUCTURE:
   - Identify the best-fitting subcategory for these products from the provided JSON Taxonomy.
   - Group the extracted specs according to the \`Attribute_Groups\` listed in the Taxonomy. 
   - *CRITICAL*: If a scraped or inferred spec does not fit into the predefined Attribute Groups, dynamically create new sensible spec groups to hold them. DO NOT discard specs.
   - Determine the winner for each spec (winnerIndex: 0, 1, or -1 for draw).
4. FINAL VERDICT: Provide a punchy AI summary (2-3 sentences) comparing the products overall and list 3-5 key differences.

--- JSON TAXONOMY ---
${schemaJson}
`;

  const fullPrompt = systemPrompt + "\n\n--- INPUT DATA ---\n" + dataString;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: "The main category" },
      subcategory: { type: Type.STRING, description: "The subcategory" },
      aiSummary: { type: Type.STRING, description: "Overall comparison summary" },
      keyDifferences: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING, description: "e.g., 'Battery Endurance'" },
            values: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["label", "values"]
        }
      },
      products: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Clean product name" },
            brand: { type: Type.STRING },
            retailer: { type: Type.STRING, description: "Store name" },
            url: { type: Type.STRING, description: "Pass back the URL" },
            price: { type: Type.STRING, description: "The exact price scraped, e.g. '$999.99' or 'N/A'" },
            description: { type: Type.STRING, description: "A rich 2-3 sentence overview of the product" },
            whatsInTheBox: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Included accessories in the box"
            },
            userInsights: { type: Type.STRING, description: "Summary of real user reviews, common issues, and bonus tips" },
            badges: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiSummary: { type: Type.STRING, description: "Product-specific summary" },
            rawSpecs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["label", "value"]
              }
            }
          },
          required: ["name", "brand", "retailer", "url", "price", "description", "whatsInTheBox", "userInsights", "badges", "aiSummary", "rawSpecs"]
        }
      },
      groupedSpecsList: {
        type: Type.ARRAY,
        description: "An array of spec groups. Map specs to the taxonomy categories or create new ones.",
        items: {
          type: Type.OBJECT,
          properties: {
            groupName: { type: Type.STRING, description: "Name of the spec group" },
            specs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  values: { type: Type.ARRAY, items: { type: Type.STRING } },
                  winnerIndex: { type: Type.NUMBER, description: "0 for first product, 1 for second, -1 for draw" }
                },
                required: ["label", "values", "winnerIndex"]
              }
            }
          },
          required: ["groupName", "specs"]
        }
      }
    },
    required: ["category", "subcategory", "aiSummary", "keyDifferences", "products", "groupedSpecsList"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const content = response.text;
    if (!content) throw new Error("No content received from Gemini");
    
    let cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    
    if (parsed.groupedSpecsList) {
      parsed.groupedSpecs = {};
      for (const group of parsed.groupedSpecsList) {
        parsed.groupedSpecs[group.groupName] = group.specs;
      }
      delete parsed.groupedSpecsList;
    }
    
    return parsed;
  } catch (err: any) {
    console.error("Gemini LLM Error:", err.message || err);
    throw err;
  }
}

export async function explainSpec(
  productNames: string[],
  specLabel: string,
  specValues: string[]
): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You are a technical analyst. Explain the technical specification "${specLabel}" in simple terms.
Here are the products and their values:
${productNames.map((name, i) => `- ${name}: ${specValues[i] || 'N/A'}`).join('\n')}

Provide a brief, 1-2 sentence concept explanation of what this spec means for a typical user.
Then, provide a brief insight for each product's specific value (1-2 sentences), explaining what this specific value means and what kind of user it is best for.
`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      concept: { type: Type.STRING, description: "A brief, 1-2 sentence explanation of what this spec means for a typical user." },
      breakdowns: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            value: { type: Type.STRING },
            insight: { type: Type.STRING, description: "1-2 sentence explanation of what this specific value means and what kind of user it is best for." }
          },
          required: ["productName", "value", "insight"]
        }
      }
    },
    required: ["concept", "breakdowns"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const content = response.text;
    if (!content) throw new Error("No content received from Gemini");
    
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (err: any) {
    console.error("Gemini explainSpec Error:", err.message || err);
    throw err;
  }
}
