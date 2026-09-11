import { Type, Schema } from "@google/genai";
import { ICON_KEYS } from "../../schemas/spec_groups";

const specPair: Schema = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    value: { type: Type.STRING },
  },
  required: ["label", "value"],
};

const harvestedSpec: Schema = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    value: { type: Type.STRING },
    source: { type: Type.STRING, enum: ["scraped", "web", "knowledge"] },
  },
  required: ["label", "value", "source"],
};

export const harvestResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    products: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          brand: { type: Type.STRING },
          specs: { type: Type.ARRAY, items: harvestedSpec },
        },
        required: ["name", "brand", "specs"],
      },
    },
  },
  required: ["products"],
};

export const groupResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING },
    subcategory: { type: Type.STRING },
    deviceType: { type: Type.STRING },
    aiSummary: { type: Type.STRING },
    keyDifferences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
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
          name: { type: Type.STRING },
          brand: { type: Type.STRING },
          retailer: { type: Type.STRING },
          url: { type: Type.STRING },
          price: { type: Type.STRING },
          description: { type: Type.STRING },
          whatsInTheBox: { type: Type.ARRAY, items: { type: Type.STRING } },
          userInsights: { type: Type.STRING },
          userPros: { type: Type.ARRAY, items: { type: Type.STRING } },
          userCons: { type: Type.ARRAY, items: { type: Type.STRING } },
          badges: { type: Type.ARRAY, items: { type: Type.STRING } },
          aiSummary: { type: Type.STRING },
          rawSpecs: { type: Type.ARRAY, items: specPair },
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
          "userPros",
          "userCons",
          "badges",
          "aiSummary",
          "rawSpecs",
        ],
      },
    },
    groupedSpecsList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          groupName: { type: Type.STRING },
          iconKey: { type: Type.STRING, enum: [...ICON_KEYS] },
          specs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                values: { type: Type.ARRAY, items: { type: Type.STRING } },
                winnerIndex: { type: Type.NUMBER },
              },
              required: ["label", "values", "winnerIndex"],
            },
          },
        },
        required: ["groupName", "iconKey", "specs"],
      },
    },
  },
  required: [
    "category",
    "subcategory",
    "deviceType",
    "aiSummary",
    "keyDifferences",
    "products",
    "groupedSpecsList",
  ],
};

export const explainSpecResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    concept: { type: Type.STRING },
    breakdowns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          value: { type: Type.STRING },
          insight: { type: Type.STRING },
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
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          estimatedPrice: { type: Type.STRING },
          reasonWhyBetter: { type: Type.STRING },
          imageUrl: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "estimatedPrice", "reasonWhyBetter", "imageUrl", "highlights"],
      },
    },
  },
  required: ["alternatives"],
};
