import { describe, expect, it } from "vitest";
import { buildMergedComparePrompt, trimRetailerText } from "../services/openai/prompts";
import { getCompareProgress, sanitizeCompareId, setCompareProgress } from "../services/compareProgress";
import { mapWithConcurrency, pythonScraperConfigured } from "../services/scraper";
import {
  countSpecRows,
  extractAmazonAsin,
  isRichScrape,
  parseAmazonHtml,
  parseCanadaComputersHtml,
  parseCostcoHtml,
  parseLabeledSpecHtml,
  parseShopifyProductJson,
  pickShopifyShelfPrice,
  promoteMislabeledDisplaySpecs,
  shopifyProductJsonUrl,
} from "../services/scraper/retailers";

describe("trimRetailerText", () => {
  it("drops nav noise and keeps spec lines", () => {
    const blob = [
      "Sign in to your account",
      "Cookie preferences",
      "Name: Hisense 65 U88",
      "Price: $1416.25",
      "Refresh Rate: 165 Hz",
      "Resolution: 3840 x 2160",
      "Add to cart",
    ].join("\n");
    const trimmed = trimRetailerText(blob);
    expect(trimmed).toContain("165 Hz");
    expect(trimmed).toContain("3840 x 2160");
    expect(trimmed.toLowerCase()).not.toContain("cookie");
    expect(trimmed.toLowerCase()).not.toContain("add to cart");
  });

  it("shrinks a long single-line page to spec pairs", () => {
    const noise = "lorem ipsum ".repeat(2000);
    const specs = "Refresh Rate: 120 Hz. Screen Resolution: 3840 x 2160. HDMI: 4. Model: OLED65C4PUA.";
    const trimmed = trimRetailerText(noise + specs);
    expect(trimmed.length).toBeLessThan(12_500);
    expect(trimmed).toMatch(/120 Hz|3840/);
  });
});

describe("merged compare prompt", () => {
  it("asks for one pass and keeps product order", () => {
    const prompt = buildMergedComparePrompt([
      { url: "https://www.bestbuy.ca/a", title: "Phone A", retailerText: "Refresh Rate: 120 Hz\nPrice: $999" },
      { url: "https://www.leons.ca/products/b", title: "TV B", retailerText: "Resolution: 3840 x 2160" },
    ]);
    expect(prompt).toMatch(/ONE pass/i);
    expect(prompt).toContain("https://www.bestbuy.ca/a");
    expect(prompt).toContain("https://www.leons.ca/products/b");
    expect(prompt.indexOf("Phone A")).toBeLessThan(prompt.indexOf("TV B"));
    expect(prompt).toMatch(/Never invent/i);
  });
});

describe("retailer fast paths", () => {
  it("builds a Leon's Shopify JSON url and parses specs without inventing refresh", () => {
    const page = "https://www.leons.ca/products/hisense-65-4k-tv-65u88qg?variant=1";
    expect(shopifyProductJsonUrl(page)).toBe("https://www.leons.ca/products/hisense-65-4k-tv-65u88qg.json");
    const parsed = parseShopifyProductJson({
      product: {
        title: "Hisense 65 TV",
        vendor: "Hisense",
        tags: "display type:qled, depth (inches):2, banner:leons, clearance",
        body_html: "<p>Mini-LED television.</p>",
        variants: [{ price: "1416.25", sku: "65U88QG" }],
        images: [{ src: "https://cdn.shopify.com/s/files/tv.jpg" }],
      },
    });
    expect(parsed?.priceText).toBe("$1416.25");
    expect(parsed?.priceSource).toBe("shopify-json");
    expect(parsed?.rawText).toContain("SKU: 65U88QG");
    expect(parsed?.rawText.toLowerCase()).toContain("qled");
    expect(parsed?.rawText).not.toMatch(/\b165 Hz\b/);
    expect(countSpecRows(parsed!.rawText)).toBeGreaterThanOrEqual(2);
  });

  it("uses the common Leon's sale price instead of the first store variant", () => {
    const price = pickShopifyShelfPrice([
      { id: 1, title: "164", price: "1416.25", compare_at_price: "2117.24" },
      { id: 2, title: "165", price: "1399.00", compare_at_price: "2099.99" },
      { id: 3, title: "166", price: "1399.00", compare_at_price: "2099.99" },
      { id: 4, title: "ARVR", price: "777777.00", compare_at_price: "0.00" },
      { id: 5, title: "ZZD", price: "2099.99", compare_at_price: "0.00" },
    ]);
    expect(price).toBe("$1399");
    const parsed = parseShopifyProductJson({
      product: {
        title: "Hisense 65 TV",
        vendor: "Hisense",
        tags: "resolution:4k",
        body_html: "<p>165Hz refresh and 5,000-nit peak brightness with Dolby Vision.</p>",
        variants: [
          { price: "1416.25", compare_at_price: "2117.24", sku: "65U88QG" },
          { price: "1399.00", compare_at_price: "2099.99", sku: "65U88QG" },
          { price: "1399.00", compare_at_price: "2099.99", sku: "65U88QG" },
        ],
      },
    });
    expect(parsed?.priceText).toBe("$1399");
    expect(parsed?.rawText).toMatch(/165 Hz/);
    expect(parsed?.rawText).toMatch(/5000 nits/);
  });

  it("reads Leon's spec sheet rows that are not a table", () => {
    const html = `<div class="product-specs-pdp"><div>Video:</div><div>Native Resolution (Pixels): 3820 x 2160</div><div>High Dynamic Range (HDR): Yes - Dolby Vision, HDR10, HLG</div><div>Brightness: Up to 5,000 nits</div><div>Refresh Rate: 165 Hz</div></div><div>Reviews</div>`;
    const lines = parseLabeledSpecHtml(html, /product-specs-pdp/i, />\s*Reviews\b/i);
    const blob = lines.join("\n");
    expect(blob).toContain("3820 x 2160");
    expect(blob).toContain("Dolby Vision");
    expect(blob).toContain("5,000 nits");
    expect(blob).toContain("165 Hz");
  });

  it("promotes Canada Computers picture values that landed on the wrong row", () => {
    const pairs = promoteMislabeledDisplaySpecs([
      { label: "PICTURE (DISPLAY) Backlight Type", value: "120Hz Native" },
      { label: "PICTURE (DISPLAY) Refresh Rate", value: "OLED Color" },
      { label: "PICTURE (PROCESSING) AI Brightness Control", value: "4K Ultra HD (3,840 x 2,160)" },
      { label: "PICTURE (PROCESSING) HDR (High Dynamic Range)", value: "Dolby Vision / HDR10 / HLG" },
    ]);
    const blob = pairs.map((p) => `${p.label}: ${p.value}`).join("\n");
    expect(blob).toContain("Refresh Rate: 120 Hz");
    expect(blob).toContain("Resolution: 3840 x 2160");
    expect(blob).toContain("Dolby Vision / HDR10 / HLG");
  });

  it("parses Canada Computers spec rows and meta price", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="LG 86 QNED TV">
        <meta property="product:price:amount" content="1599.99">
        <meta property="og:image" content="https://ccimg.example/tv.jpeg">
      </head><body>
        <h1>LG 86” QNED70</h1>
        <table class="pi-specs-table"><tr><td>Model</td><td>86QNED70AUA</td></tr>
        <tr><td>Resolution</td><td>3840 x 2160</td></tr>
        <tr><td>Refresh Rate</td><td>60 Hz</td></tr>
        <tr><td>HDMI</td><td>4</td></tr></table>
      </body></html>`;
    const parsed = parseCanadaComputersHtml(html);
    expect(parsed?.priceText).toBe("$1599.99");
    expect(parsed?.rawText).toContain("3840 x 2160");
    expect(parsed?.rawText).toContain("60 Hz");
    expect(isRichScrape(parsed!)).toBe(true);
  });

  it("parses Costco JSON-LD price and specification rows", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Product","name":"LG 65 OLED C4","sku":"9302165","brand":{"@type":"Brand","name":"LG"},
         "offers":{"@type":"Offer","price":2397.99,"priceCurrency":"CAD"}}
      </script>
      <table data-testid="VerticalTableContainer_ProductSpecifications">
        <tr><th>Screen Resolution</th><td>3840 x 2160</td></tr>
        <tr><th>Native Refresh Rate</th><td>120Hz</td></tr>
        <tr><th>Model</th><td>OLED65C4PUA.ACC</td></tr>
        <tr><th>HDMI</th><td>4</td></tr>
      </table>`;
    const parsed = parseCostcoHtml(html);
    expect(parsed?.priceText).toMatch(/2397\.99/);
    expect(parsed?.rawText).toContain("3840 x 2160");
    expect(parsed?.rawText).toContain("120Hz");
    expect(parsed?.rawText).toContain("OLED65C4PUA.ACC");
    expect(isRichScrape(parsed!)).toBe(true);
  });

  it("parses Amazon title, ASIN, and bullets without a random related price", () => {
    expect(extractAmazonAsin("https://www.amazon.ca/dp/B0D1XD1ZV3")).toBe("B0D1XD1ZV3");
    const html = `
      <title>Amazon.ca</title>
      <span id="productTitle">Apple AirPods Pro</span>
      <div id="feature-bullets"><span>Active Noise Cancelling</span><span>USB-C Charging Case</span></div>
      <div id="detailBullets_feature_div">
        <span class="a-text-bold">Item model number</span><span>MTJV3LL/A</span>
        <span class="a-text-bold">ASIN</span><span>B0D1XD1ZV3</span>
      </div>
      <span class="a-price-whole">10</span><span class="a-price-fraction">29</span>`;
    const parsed = parseAmazonHtml(html, "https://www.amazon.ca/dp/B0D1XD1ZV3");
    expect(parsed?.title).toContain("AirPods");
    expect(parsed?.rawText).toContain("ASIN: B0D1XD1ZV3");
    expect(parsed?.rawText).toContain("MTJV3LL/A");
    expect(parsed?.priceText || "").not.toContain("10.29");
    expect(isRichScrape({ rawText: "Name: x\nPrice: $1", title: "Just a moment", priceText: "$1" })).toBe(false);
  });
});

describe("parallel scrape helper", () => {
  it("preserves order and overlaps work", async () => {
    const start = Date.now();
    const values = await mapWithConcurrency([1, 2, 3], 3, async (n) => {
      await new Promise((r) => setTimeout(r, 80));
      return n * 10;
    });
    expect(values).toEqual([10, 20, 30]);
    expect(Date.now() - start).toBeLessThan(200);
  });
});

describe("compare progress", () => {
  it("stores a sanitized id and ignores junk", () => {
    expect(sanitizeCompareId("short")).toBeNull();
    expect(sanitizeCompareId("cmp_progress_1")).toBe("cmp_progress_1");
    setCompareProgress("cmp_progress_1", "scraping", "Fetching 2 product pages...");
    expect(getCompareProgress("cmp_progress_1").message).toMatch(/Fetching 2/);
    expect(getCompareProgress("nope-id").stage).toBe("idle");
    expect(pythonScraperConfigured()).toBe(false);
  });
});
