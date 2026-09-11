export function buildComparisonPrompt(
  schemaJson: string,
  productDataList: { url: string; retailerText: string; title: string }[]
): string {
  const dataString = productDataList
    .map(
      (d, i) => `
--- PRODUCT ${i + 1} ---
URL: ${d.url}
Title: ${d.title}
RETAILER SOURCE TEXT:
${d.retailerText.substring(0, 10000)}
------------------------
`
    )
    .join("\n\n");

  const systemPrompt = `
You are an elite, highly experienced consumer electronics reviewer and technical analyst. 
Your objective is to provide the ultimate product comparison to help users make a confident purchasing decision.
You are given scraped text data from retailer websites for 2-3 products.

--- YOUR INSTRUCTIONS ---
1. RAW DATA EXTRACTION (ZERO DATA LOSS POLICY): Deeply parse the retailer text. You MUST extract EVERY SINGLE technical specification found in the scraped data. Absolutely NO specification should be omitted, simplified away, or ignored. If a spec is mentioned, it MUST be in your output.
2. ENRICH & SYNTHESIZE (AGENTIC THINKING PHASE):
   - Using your internal knowledge base and reasoning, infer any critical missing specifications that the scraper missed or the retailer omitted (e.g., if the retailer doesn't mention RAM or refresh rate but you know it). Combine these with the scraped specs.
   - Analyze real-world user feedback, durability, and praises for these specific products to synthesize a comprehensive "userInsights" summary for each product.
3. CATEGORIZE & STRUCTURE (FLEXIBLE SCHEMA):
   - The provided JSON Taxonomy is purely a GUIDELINE. It is NOT a strict whitelist.
   - Group the extracted specs into logical groups. Try to use the \`Attribute_Groups\` listed in the Taxonomy if they fit.
   - *ABSOLUTE CRITICAL RULE*: If you cannot find a perfectly matching group in the taxonomy for a specification, you MUST either dynamically create a new logical group name (e.g., "Camera Features", "Connectivity") OR simply place them under a group named "Other Features". DO NOT OMIT THEM simply because they don't fit the schema.
   - Ensure EVERY single spec extracted in Step 1 makes its way into the final \`groupedSpecsList\`.
   - Determine the winner for each spec (winnerIndex: 0, 1, or -1 for draw).
4. FINAL VERDICT: Provide a punchy AI summary (2-3 sentences) comparing the products overall and list 3-5 key differences.

--- JSON TAXONOMY ---
${schemaJson}
`;

  return systemPrompt + "\n\n--- INPUT DATA ---\n" + dataString;
}

export function buildExplainSpecPrompt(productNames: string[], specLabel: string, specValues: string[]): string {
  return `
You are a technical analyst. Explain the technical specification "${specLabel}" in simple terms.
Here are the products and their values:
${productNames.map((name, i) => `- ${name}: ${specValues[i] || "N/A"}`).join("\n")}

Provide a brief, 1-2 sentence concept explanation of what this spec means for a typical user.
Then, provide a brief insight for each product's specific value (1-2 sentences), explaining what this specific value means and what kind of user it is best for.
`;
}

export function buildAlternativesPrompt(products: any[]): string {
  return `
You are a highly knowledgeable tech advisor.
The user is comparing the following products:
${JSON.stringify(products, null, 2)}

If the provided products are already the absolute best in their class, return an empty array for alternatives.
If there are strictly better alternatives (in value, performance, or recency) in the same price range, suggest up to 3 alternative products.
IMPORTANT: You MUST provide the exact, specific product name including the common model number/generation (e.g., "Sony WH-1000XM5" instead of "Sony Headphones", or "ASUS ROG Zephyrus G14 (2024)" instead of "ASUS Laptop"). This exact string will be used to search Google Shopping, so it must be highly specific.
reasonWhyBetter should be 2-4 complete sentences, not truncated.
highlights: 2-4 short tags (1-3 words) like "Best Camera", "Better Value", "Longer Battery", "Best Display".
Try to provide an official product image URL if you know one. If you don't know an image URL, omit it.
`;
}
