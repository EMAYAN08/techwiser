import { ICON_KEYS } from "../../schemas/spec_groups";

const specPair = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    value: { type: "string" },
  },
  required: ["label", "value"],
};

const harvestedSpec = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    value: { type: "string" },
    source: { type: "string", enum: ["scraped", "web", "knowledge"] },
  },
  required: ["label", "value", "source"],
};

export const harvestResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          specs: { type: "array", items: harvestedSpec },
        },
        required: ["name", "brand", "specs"],
      },
    },
  },
  required: ["products"],
};

export const groupResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string" },
    subcategory: { type: "string" },
    deviceType: { type: "string" },
    aiSummary: { type: "string" },
    keyDifferences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          values: { type: "array", items: { type: "string" } },
        },
        required: ["label", "values"],
      },
    },
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          retailer: { type: "string" },
          url: { type: "string" },
          price: { type: "string" },
          description: { type: "string" },
          whatsInTheBox: { type: "array", items: { type: "string" } },
          userInsights: { type: "string" },
          badges: { type: "array", items: { type: "string" } },
          aiSummary: { type: "string" },
          rawSpecs: { type: "array", items: specPair },
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
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          groupName: { type: "string" },
          iconKey: { type: "string", enum: [...ICON_KEYS] },
          specs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                values: { type: "array", items: { type: "string" } },
                winnerIndex: { type: "number" },
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

export const explainSpecResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    concept: { type: "string" },
    breakdowns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          productName: { type: "string" },
          value: { type: "string" },
          insight: { type: "string" },
        },
        required: ["productName", "value", "insight"],
      },
    },
  },
  required: ["concept", "breakdowns"],
};

export const alternativesResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    alternatives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          estimatedPrice: { type: "string" },
          reasonWhyBetter: { type: "string" },
          imageUrl: { type: "string" },
        },
        required: ["name", "estimatedPrice", "reasonWhyBetter", "imageUrl"],
      },
    },
  },
  required: ["alternatives"],
};
