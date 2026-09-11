import { getApiBase } from "../utils/apiBase";

export interface SpecExplanationResponse {
  concept: string;
  breakdowns: {
    productName: string;
    value: string;
    insight: string;
  }[];
}

export async function explainSpec(
  productNames: string[],
  specLabel: string,
  specValues: string[]
): Promise<SpecExplanationResponse> {
  const apiUrl = getApiBase();
  const response = await fetch(`${apiUrl}/api/explain-spec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productNames,
      specLabel,
      specValues,
    }),
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (e) {}
    throw new Error(errMsg || 'Unknown error occurred');
  }

  return response.json();
}

export interface AlternativeProduct {
  name: string;
  estimatedPrice: string;
  reasonWhyBetter: string;
  url: string;
  imageUrl: string;
  highlights?: string[];
}

export interface AlternativesResponse {
  alternatives: AlternativeProduct[];
}

export async function fetchAlternatives(
  products: { name: string; price?: string; retailer?: string }[]
): Promise<AlternativesResponse> {
  const apiUrl = getApiBase();
  const response = await fetch(`${apiUrl}/api/alternatives`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ products }),
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (e) {}
    throw new Error(errMsg || 'Unknown error occurred');
  }

  return response.json();
}


export async function resolveProductNames(names: string[]): Promise<string[]> {
  const apiUrl = getApiBase();
  const response = await fetch(`${apiUrl}/api/resolve-names`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ names }),
  });

  if (!response.ok) {
    throw new Error("Failed to resolve product names");
  }

  const json = await response.json();
  return json.urls || [];
}

