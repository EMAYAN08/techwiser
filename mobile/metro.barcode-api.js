const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SUPPORTED = [
  "bestbuy.ca",
  "amazon.ca",
  "walmart.ca",
  "costco.ca",
  "canadacomputers.com",
  "memoryexpress.com",
  "newegg.ca",
  "staples.ca",
  "thesource.ca",
];

const NESTED_PARAMS = [
  "murl",
  "url",
  "u",
  "dest",
  "destination",
  "redirect",
  "redir",
  "to",
  "target",
  "link",
  "newurl",
];

const cache = new Map();
const TTL = 1000 * 60 * 60 * 12;

function digits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function gtinVariants(code) {
  const d = digits(code);
  const out = new Set();
  if (!d) return [];
  out.add(d);
  if (d.length === 13 && d.startsWith("0")) out.add(d.slice(1));
  if (d.length === 12) out.add("0" + d);
  if (d.length === 14 && d.startsWith("0")) out.add(d.slice(1));
  if (d.length === 14) out.add(d.slice(-13));
  return [...out];
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function retailerFromHost(host) {
  if (host.includes("bestbuy")) return "Best Buy";
  if (host.includes("amazon")) return "Amazon";
  if (host.includes("walmart")) return "Walmart";
  if (host.includes("costco")) return "Costco";
  if (host.includes("canadacomputers")) return "Canada Computers";
  if (host.includes("memoryexpress")) return "Memory Express";
  if (host.includes("newegg")) return "Newegg";
  if (host.includes("staples")) return "Staples";
  if (host.includes("thesource")) return "The Source";
  return host;
}

function isSupported(host) {
  return SUPPORTED.some((d) => host === d || host.endsWith("." + d));
}

function toAmazonCa(url) {
  try {
    const u = new URL(url);
    if (/(^|\.)amazon\.(com|co\.uk|de|fr|it|es|ca)$/i.test(u.hostname)) {
      const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (m) return `https://www.amazon.ca/dp/${m[1].toUpperCase()}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function offerFromUrl(url) {
  try {
    const cleaned = toAmazonCa(String(url || "").trim());
    if (!/^https?:\/\//i.test(cleaned)) return null;
    const host = hostOf(cleaned);
    if (!isSupported(host)) return null;
    if (/\/s\?/.test(cleaned) || /\/search/i.test(cleaned)) return null;
    if (/norob|\/alink\//i.test(cleaned)) return null;
    return { url: cleaned, retailer: retailerFromHost(host), domain: host };
  } catch {
    return null;
  }
}

function decodeMaybe(raw) {
  let s = raw;
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s;
}

function candidateUrls(raw) {
  if (!raw) return [];
  const out = [];
  const push = (value) => {
    if (!value) return;
    const s = decodeMaybe(String(value).trim());
    if (/^https?:\/\//i.test(s)) out.push(s);
  };
  push(raw);
  try {
    const u = new URL(raw);
    for (const key of NESTED_PARAMS) push(u.searchParams.get(key));
  } catch {
    /* ignore */
  }
  const re = /https?:\/\/[^\s"'<>\\]+/gi;
  let m;
  while ((m = re.exec(raw))) push(m[0]);
  return [...new Set(out)];
}

function pickOffer(raw) {
  for (const url of candidateUrls(raw)) {
    const offer = offerFromUrl(url);
    if (offer) return offer;
  }
  return null;
}

async function hopLocation(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(4500),
    });
    const found = [];
    const loc = res.headers.get("location");
    if (loc) found.push(loc);
    if (res.url) found.push(res.url);
    return found;
  } catch {
    return [];
  }
}

async function resolveOfferUrl(url) {
  if (!url) return null;
  const direct = pickOffer(url);
  if (direct) return direct;
  const hops = await hopLocation(url);
  for (const hop of hops) {
    const offer = pickOffer(hop);
    if (offer) return offer;
  }
  return null;
}

function amazonOffer(asin) {
  if (!asin || !/^[A-Z0-9]{10}$/i.test(String(asin))) return null;
  return offerFromUrl(`https://www.amazon.ca/dp/${String(asin).toUpperCase()}`);
}

function offerRank(o) {
  if (o.domain.includes("amazon.ca") && /\/dp\//i.test(o.url)) return 0;
  if (o.domain.includes("bestbuy.ca") && /\/product\//i.test(o.url)) return 1;
  if (o.domain.includes("walmart.ca") && /\/ip\//i.test(o.url)) return 2;
  return 3;
}

function mergeOffers(list) {
  const seen = new Set();
  const out = [];
  for (const o of list.filter(Boolean)) {
    if (seen.has(o.url)) continue;
    seen.add(o.url);
    out.push(o);
  }
  return out.sort((a, b) => offerRank(a) - offerRank(b));
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

async function lookupUpcItemDb(code) {
  for (const id of gtinVariants(code)) {
    const json = await fetchJson(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(id)}`
    );
    if (!json || json.code === "TOO_FAST") continue;
    const item = json.items && json.items[0];
    if (!item) continue;
    const images = Array.isArray(item.images)
      ? item.images.filter((x) => typeof x === "string")
      : [];
    const resolved = await Promise.all(
      (item.offers || []).map((o) => resolveOfferUrl(o && (o.link || o.url) || ""))
    );
    return {
      title: item.title || "",
      brand: item.brand || null,
      imageUrl: images[0] || null,
      images,
      asin: item.asin || null,
      urls: mergeOffers([amazonOffer(item.asin), ...resolved]),
    };
  }
  return null;
}

const STOP = new Set([
  "the", "and", "for", "with", "pack", "pk", "can", "cans", "oz", "fl", "ml",
  "soda", "drink", "soft", "bottle", "bottles", "count", "ct", "size", "new", "from",
  "each", "item", "free", "live",
]);

function tokens(s) {
  return String(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function isModelToken(t) {
  return /[a-z]/.test(t) && /\d/.test(t) && t.length >= 4;
}

function similarName(query, candidate) {
  const q = tokens(query);
  const cList = tokens(candidate);
  const c = new Set(cList);
  if (q.length === 0 || cList.length === 0) return false;
  const qYears = q.filter((t) => /^20\d{2}$/.test(t));
  const cYears = new Set(cList.filter((t) => /^20\d{2}$/.test(t)));
  if (qYears.length > 0 && !qYears.some((y) => cYears.has(y))) return false;
  const qModels = q.filter(isModelToken);
  const cModels = new Set(cList.filter(isModelToken));
  if (qModels.length > 0) return qModels.some((t) => cModels.has(t));
  const hits = q.filter((t) => c.has(t));
  const need = Math.min(2, q.length);
  if (hits.length < need) return false;
  return hits.length / q.length >= 0.45;
}

function searchQueryFromTitle(title) {
  const t = String(title || "").replace(/[®™]/g, " ").replace(/\s+/g, " ").trim();
  const head = t.split(/\s*[-|–—,:]\s*/)[0].trim();
  return (head.split(/\s+/).length >= 3 ? head : t).slice(0, 80);
}

async function searchBestBuy(query, expectedTitle) {
  if (!query || !String(query).trim()) return [];
  const json = await fetchJson(
    `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(query)}&lang=en-CA&page=1&pageSize=5`
  );
  const products = json && json.products;
  if (!Array.isArray(products) || products.length === 0) return [];
  const out = [];
  for (const p of products.slice(0, 5)) {
    const path = p.productUrl || p.url;
    const name = String(p.name || "");
    if (!path || typeof path !== "string") continue;
    if (expectedTitle && (!name || !similarName(expectedTitle, name))) continue;
    const url = path.startsWith("http") ? path : `https://www.bestbuy.ca${path}`;
    const o = offerFromUrl(url);
    if (o) out.push(o);
  }
  return out;
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
  const asin = upc && upc.asin ? upc.asin : null;
  const title = (upc && upc.title) || (facts && facts.title) || `UPC ${code}`;
  const imageUrl = (upc && upc.imageUrl) || (facts && facts.imageUrl) || null;

  let bb = [];
  if (!asin && (!upc || !upc.urls || upc.urls.length === 0) && title && !/^UPC\s/i.test(title)) {
    bb = await searchBestBuy(searchQueryFromTitle(title), title);
    if (bb.length === 0) bb = await searchBestBuy(title.slice(0, 80), title);
  }

  const urls = mergeOffers([amazonOffer(asin), ...((upc && upc.urls) || []), ...bb]);
  const value = {
    code,
    title,
    brand: (upc && upc.brand) || (facts && facts.brand) || null,
    imageUrl,
    imageCandidates: (upc && upc.images) || (imageUrl ? [imageUrl] : []),
    asin,
    urls,
  };
  if (urls.length > 0) cache.set(code, { at: Date.now(), value });
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

module.exports = { handleBarcodeApi, lookupBarcode };
