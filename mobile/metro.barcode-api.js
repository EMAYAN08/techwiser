const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cache = new Map();
const TTL = 1000 * 60 * 60 * 12;

function digits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

async function fetchJson(url, timeoutMs = 7000) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function amazonOffer(asin) {
  if (!asin || !/^[A-Z0-9]{10}$/i.test(String(asin))) return null;
  const code = String(asin).toUpperCase();
  return {
    url: `https://www.amazon.ca/dp/${code}`,
    retailer: "Amazon",
    domain: "amazon.ca",
  };
}

async function lookupUpcItemDb(code) {
  const json = await fetchJson(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`
  );
  if (!json || json.code === "TOO_FAST") return null;
  const item = json.items && json.items[0];
  if (!item) return null;
  const images = Array.isArray(item.images)
    ? item.images.filter((x) => typeof x === "string")
    : [];
  return {
    title: item.title || "",
    brand: item.brand || null,
    imageUrl: images[0] || null,
    images,
    asin: item.asin || null,
  };
}

async function lookupOpenFacts(code) {
  const ids = Array.from(
    new Set([code, code.length === 13 && code.startsWith("0") ? code.slice(1) : ""])
  ).filter(Boolean);
  const hosts = [
    "https://world.openfoodfacts.org",
    "https://world.openproductsfacts.org",
    "https://world.openbeautyfacts.org",
  ];
  for (const host of hosts) {
    for (const id of ids) {
      const json = await fetchJson(`${host}/api/v0/product/${id}.json`, 4500);
      if (!json || json.status !== 1 || !json.product) continue;
      const p = json.product;
      const title = p.product_name || p.generic_name;
      if (!title) continue;
      return {
        title,
        brand: p.brands || null,
        imageUrl: p.image_front_url || p.image_url || null,
      };
    }
  }
  return null;
}

async function lookupBarcode(raw) {
  const code = digits(raw);
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const [upc, facts] = await Promise.all([lookupUpcItemDb(code), lookupOpenFacts(code)]);
  const asin = upc?.asin || null;
  const amazon = amazonOffer(asin);
  const imageUrl = upc?.imageUrl || facts?.imageUrl || null;
  const value = {
    code,
    title: upc?.title || facts?.title || `UPC ${code}`,
    brand: upc?.brand || facts?.brand || null,
    imageUrl,
    imageCandidates: upc?.images || (imageUrl ? [imageUrl] : []),
    asin,
    urls: amazon ? [amazon] : [],
  };
  cache.set(code, { at: Date.now(), value });
  return value;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(payload));
}

async function handleBarcodeApi(req, res) {
  console.log("[barcode-api]", req.method, req.url);
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "POST a UPC or EAN code." });
    return;
  }
  try {
    const body = await readBody(req);
    console.log("[barcode-api] body", body);
    const code = String(body.code || body.upc || body.ean || "").trim();
    if (!code) {
      send(res, 400, { error: "A UPC or EAN code is required." });
      return;
    }
    const data = await lookupBarcode(code);
    console.log("[barcode-api] result", data.title, data.asin, (data.urls || []).map((u) => u.url));
    send(res, 200, { data });
  } catch (error) {
    console.error("metro /api/barcode", error);
    send(res, 500, { error: "Failed to look up that barcode." });
  }
}

module.exports = { handleBarcodeApi };
