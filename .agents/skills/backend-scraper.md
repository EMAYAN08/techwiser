---
name: backend-scraper
description: Guidelines for building the Node.js web scraper and Gemini integration for SpecMatch.
---

# Backend Scraper & AI Integration Skill

When building the Node.js backend (`/server`), follow these rules:

## 1. Web Fetching
- Use `puppeteer` (or `puppeteer-core`) to fetch pages, as Canadian retailers (Best Buy, Memory Express, etc.) often block simple `fetch` or `axios` requests.
- Rotate User-Agents and configure Puppeteer to run headlessly and bypass basic bot detection.
- Extract the raw text from the DOM (strip out scripts, styles, and SVGs) to save token space before sending to Gemini.

## 2. Gemini Integration
- Use the `@google/genai` SDK.
- The prompt to Gemini MUST enforce structured JSON output. Use the `responseSchema` or `responseMimeType: "application/json"` parameters to ensure strict parsing.
- Categorize specs dynamically based on the product type (e.g., Audio vs Computing) as per the PRD.

## 3. Architecture
- Create standard Express routes (e.g., `POST /api/extract`).
- Catch all errors (network, Puppeteer timeouts, Gemini parsing failures) and return standardized JSON error codes to the mobile app.
- Keep the server stateless.
