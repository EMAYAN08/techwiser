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
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
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
