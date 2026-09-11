import { Type, Schema } from "@google/genai";

export const comparisonResponseSchema: Schema = {
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
          values: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["label", "values"],
      },
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
            description: "Included accessories in the box",
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
                value: { type: Type.STRING },
              },
              required: ["label", "value"],
            },
          },
        },
        required: [
          "name",
          "brand",
          "retailer",
          "url",
          "price",
          "description",
          "whatsInTheBox",
          "userInsights",
          "badges",
          "aiSummary",
          "rawSpecs",
        ],
      },
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
                winnerIndex: { type: Type.NUMBER, description: "0 for first product, 1 for second, -1 for draw" },
              },
              required: ["label", "values", "winnerIndex"],
            },
          },
        },
        required: ["groupName", "specs"],
      },
    },
  },
  required: ["category", "subcategory", "aiSummary", "keyDifferences", "products", "groupedSpecsList"],
};

export const explainSpecResponseSchema: Schema = {
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
          insight: {
            type: Type.STRING,
            description: "1-2 sentence explanation of what this specific value means and what kind of user it is best for.",
          },
        },
        required: ["productName", "value", "insight"],
      },
    },
  },
  required: ["concept", "breakdowns"],
};

export const alternativesResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    alternatives: {
      type: Type.ARRAY,
      description: "An array of 0 to 3 alternatives. Empty array if the compared products are already the best.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Highly specific name of the alternative product, MUST include exact model number/generation.",
          },
          estimatedPrice: { type: Type.STRING, description: "Estimated price, e.g. '$999'" },
          reasonWhyBetter: { type: Type.STRING, description: "2-4 sentences explaining why this is a better choice." },
          imageUrl: { type: Type.STRING, description: "Actual valid image URL for the product (.jpg/.png)" },
          highlights: {
            type: Type.ARRAY,
            description: "2-4 short tags like Best Camera, Better Value, Longer Battery.",
            items: { type: Type.STRING },
          },
        },
        required: ["name", "estimatedPrice", "reasonWhyBetter", "highlights"],
      },
    },
  },
  required: ["alternatives"],
};
