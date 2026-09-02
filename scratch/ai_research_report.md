# OpenRouter Integration & Model Research Report

## 1. Free Models for JSON Extraction on OpenRouter
When testing with free models on OpenRouter, the available options rotate based on upstream provider limits. However, the following are consistently some of the best free options for structured JSON output:

- **`google/gemini-2.0-flash-lite-preview-02-05:free`**: Excellent for quick and structured tasks.
- **`meta-llama/llama-3-8b-instruct:free`** (and newer 3.1/3.3 Llama variants): Reliable if prompted well.
- **`qwen/qwen-2.5-72b-instruct:free`**: Qwen models typically follow structure instructions very closely.
- **`openrouter/free` (Auto-router)**: Automatically routes to a free model that supports your requirements (like structured outputs).

**Recommendations for free JSON Extraction:**
- Always use `response_format: { type: "json_object" }` in your API request.
- Specify in your system prompt: "You must output valid JSON only."
- Enable OpenRouter's **Response Healing** plugin in the account settings, which automatically fixes common syntax errors (e.g., trailing commas) from free models.
- Implement robust `try-catch` JSON parsing with fallbacks, as free models can sometimes fail or hit rate limits (429 errors).

## 2. Node.js Express Backend Configuration
You can easily swap in OpenRouter by using the official OpenAI SDK and overriding the `baseURL`.

**Dependencies:**
`npm install openai dotenv`

**Environment Variables (`.env`):**
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
YOUR_SITE_URL=http://localhost:3000
YOUR_SITE_NAME=MyTestApp

**Code Integration (Express Route Example):**
```javascript
import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.YOUR_SITE_URL, // Optional: for OpenRouter rankings
    "X-Title": process.env.YOUR_SITE_NAME,     // Optional: for OpenRouter rankings
  }
});

router.post('/extract', async (req, res) => {
  try {
    const { textToAnalyze } = req.body;

    const completion = await openai.chat.completions.create({
      // Use a specific free model or the auto-router
      model: "google/gemini-2.0-flash-lite-preview-02-05:free", 
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Extract the core details from the provided text. Return ONLY a valid JSON object matching this schema: { \"title\": \"string\", \"score\": \"number\" }."
        },
        {
          role: "user",
          content: textToAnalyze
        }
      ]
    });

    // Parse the JSON string returned by the model
    const jsonOutput = JSON.parse(completion.choices[0].message.content);
    
    res.json({ success: true, data: jsonOutput });
  } catch (error) {
    console.error("Error extracting JSON:", error);
    res.status(500).json({ success: false, error: "Failed to process text" });
  }
});

export default router;
```

## 3. Long-Term Production Recommendations
For a production application where fast, cheap, and highly reliable JSON parsing is core logic, free models are too heavily rate-limited (typically ~20 requests/minute or ~50/day without credits) and lack consistency.

**Top Production Choices:**
1. **Google Gemini 2.0 Flash (`google/gemini-2.0-flash`)**: 
   - **Why:** Exceptionally fast, incredibly cheap per million tokens, and native support for strict JSON schemas. Excellent for large-scale extraction pipelines.
2. **OpenAI GPT-4o-mini (`openai/gpt-4o-mini`)**:
   - **Why:** Very low latency and cost. It has highly robust structured output enforcement (Strict JSON Mode) that guarantees 100% schema compliance.
3. **Anthropic Claude 3.5 Haiku (`anthropic/claude-3.5-haiku`)**:
   - **Why:** Renowned for speed and intelligence at a low price point. Great at following complex instructions, though it requires slightly more prompt engineering for strict JSON compared to OpenAI's native schema enforcement.
