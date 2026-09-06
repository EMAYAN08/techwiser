export const MAX_QR_PRODUCTS = 3;

export const SUPPORTED_DOMAINS = [
  "bestbuy.ca",
  "amazon.ca",
  "canadacomputers.com",
  "memoryexpress.com",
  "newegg.ca",
  "staples.ca",
  "thesource.ca",
  "costco.ca",
  "walmart.ca",
] as const;

export const SHORTENER_DOMAINS = [
  "amzn.to",
  "amzn.ca",
  "a.co",
  "amzn.com",
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "bestbuy.app.link",
  "newegg.io",
] as const;

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "refID",
  "refid",
  "mcid",
  "tag",
  "ascsubtag",
];

const SKIP_SLUGS = new Set(["en-ca", "en", "fr", "fr-ca", "product", "dp", "gp", "p", "ip", "d"]);

export function ensureHttpUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function getHostname(url: string): string {
  try {
    return new URL(ensureHttpUrl(url)).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isSupportedHost(host: string): boolean {
  return SUPPORTED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

export function isShortenerHost(host: string): boolean {
  return SHORTENER_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(ensureHttpUrl(url));
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
    if (u.protocol === "http:") u.protocol = "https:";
    TRACKING_PARAMS.forEach((k) => u.searchParams.delete(k));
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url.trim();
  }
}

function titleFromSlug(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  let slug = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    let p = parts[i];
    try {
      p = decodeURIComponent(p);
    } catch {
      /* keep raw */
    }
    if (SKIP_SLUGS.has(p.toLowerCase())) continue;
    if (/^\d+$/.test(p)) continue;
    if (/^[A-Z0-9]{10}$/i.test(p)) continue;
    if (p.length >= slug.length) slug = p;
  }
  if (!slug) return "";
  return slug
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bIphone\b/g, "iPhone")
    .replace(/\bIpad\b/g, "iPad")
    .replace(/\bIpod\b/g, "iPod")
    .replace(/\bMacbook\b/g, "MacBook")
    .replace(/\b(\d+)(gb|tb|mhz|ghz|mah)\b/gi, (_, n, u) => n + u.toUpperCase());
}

export function retailerFromHost(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("bestbuy")) return "Best Buy";
  if (h.includes("amazon") || h === "a.co" || h.startsWith("amzn.")) return "Amazon";
  if (h.includes("canadacomputers")) return "Canada Computers";
  if (h.includes("memoryexpress")) return "Memory Express";
  if (h.includes("newegg")) return "Newegg";
  if (h.includes("staples")) return "Staples";
  if (h.includes("thesource")) return "The Source";
  if (h.includes("costco")) return "Costco";
  if (h.includes("walmart")) return "Walmart";
  return host || "Unknown";
}

function amazonAsin(pathname: string): string | null {
  const m = pathname.match(/\/(?:dp|gp\/product|d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

export type ProductUrlParse = {
  valid: boolean;
  reason?: "empty" | "malformed" | "protocol" | "unsupported";
  message?: string;
  url: string;
  host: string;
  domain: string;
  retailer: string;
  title: string;
  guessImage?: string | null;
};

export function parseProductUrl(raw: string): ProductUrlParse {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      reason: "empty",
      message: "Empty QR",
      url: "",
      host: "",
      domain: "",
      retailer: "",
      title: "",
    };
  }

  let url: URL;
  try {
    url = new URL(ensureHttpUrl(trimmed));
  } catch {
    return {
      valid: false,
      reason: "malformed",
      message: "That QR isn't a valid link",
      url: trimmed,
      host: "",
      domain: "",
      retailer: "",
      title: trimmed.slice(0, 48),
    };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      reason: "protocol",
      message: "Only web product links work",
      url: trimmed,
      host: "",
      domain: "",
      retailer: "",
      title: url.protocol.replace(":", ""),
    };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const retailer = retailerFromHost(host);
  const asin = amazonAsin(url.pathname);
  const title = titleFromSlug(url.pathname) || (asin ? `Amazon ${asin}` : `${retailer} product`);
  const guessImage = asin ? `https://images.amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg` : null;
  const supported = isSupportedHost(host);

  return {
    valid: supported,
    reason: supported ? undefined : "unsupported",
    message: supported
      ? undefined
      : isShortenerHost(host)
        ? "Couldn't expand this short link"
        : `We don't support ${host} yet — Canadian retailers only`,
    url: url.toString(),
    host,
    domain: host,
    retailer,
    title,
    guessImage,
  };
}

export type QrKind = "url" | "wifi" | "vcard" | "contact" | "text" | "empty";

export type QrExtract = {
  kind: QrKind;
  urls: string[];
  raw: string;
  message: string;
};

const DANGEROUS = /^(javascript|data|file|blob|vbscript):/i;
const URL_RE = /https?:\/\/[^\s<>"'`\\]+/gi;
const BARE_HOST_RE =
  /(?:www\.)?(?:bestbuy\.ca|amazon\.ca|amzn\.to|a\.co|canadacomputers\.com|memoryexpress\.com|newegg\.ca|staples\.ca|thesource\.ca|costco\.ca|walmart\.ca)[^\s<>"'`]*/gi;

function stripTrailingPunct(s: string): string {
  return s.replace(/[),.;!?]+$/g, "");
}

export function extractQrPayload(raw: string): QrExtract {
  const t = (raw ?? "").trim();
  if (!t) return { kind: "empty", urls: [], raw: t, message: "Empty QR code" };
  if (DANGEROUS.test(t)) {
    return { kind: "text", urls: [], raw: t, message: "That QR is not a product link" };
  }
  if (/^WIFI:/i.test(t)) {
    return { kind: "wifi", urls: [], raw: t, message: "That's a Wi-Fi QR, not a product" };
  }
  if (/^BEGIN:VCARD/i.test(t) || /^MECARD:/i.test(t)) {
    return { kind: "vcard", urls: [], raw: t, message: "That's a contact card, not a product" };
  }
  if (/^(SMSTO:|SMS:|TEL:|MATMSG:|GEO:|MAILTO:|BEGIN:VEVENT)/i.test(t)) {
    return { kind: "contact", urls: [], raw: t, message: "That QR isn't a product URL" };
  }

  let decoded = t;
  try {
    if (/%[0-9A-Fa-f]{2}/.test(t)) decoded = decodeURIComponent(t);
  } catch {
    decoded = t;
  }

  const found = new Set<string>();
  for (const m of decoded.match(URL_RE) ?? []) {
    const cleaned = stripTrailingPunct(m);
    if (!DANGEROUS.test(cleaned)) found.add(cleaned);
  }
  if (found.size === 0) {
    for (const m of decoded.match(BARE_HOST_RE) ?? []) {
      const cleaned = stripTrailingPunct(m);
      found.add(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);
    }
  }
  if (found.size === 0) {
    try {
      const u = new URL(ensureHttpUrl(decoded.split(/\s+/)[0]));
      if (["http:", "https:"].includes(u.protocol) && u.hostname.includes(".")) {
        found.add(u.toString());
      }
    } catch {
      /* not a url */
    }
  }

  if (found.size === 0) {
    return { kind: "text", urls: [], raw: t, message: "No product URL in this QR" };
  }
  return { kind: "url", urls: [...found], raw: t, message: "" };
}

export async function expandShortUrl(url: string, timeoutMs = 4000): Promise<string> {
  const host = getHostname(url);
  if (!isShortenerHost(host)) return url;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    clearTimeout(timer);
    if (res.url && res.url.startsWith("http")) return res.url;
  } catch {
    /* CORS / timeout — keep original */
  }
  return url;
}

export type UrlPreview = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageCandidates: string[];
};

const previewCache = new Map<string, UrlPreview>();

function uniqueUrls(list: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of list) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function corsSafeImage(url: string): string | null {
  try {
    const stripped = url.replace(/^https?:\/\//i, "");
    if (!stripped) return null;
    return `https://wsrv.nl/?url=${encodeURIComponent(stripped)}&w=320&h=320&fit=cover&output=jpg`;
  } catch {
    return null;
  }
}

export function buildImageCandidates(...urls: Array<string | null | undefined>): string[] {
  const direct = uniqueUrls(urls);
  const proxied = uniqueUrls(direct.map((u) => corsSafeImage(u)));
  return uniqueUrls([...direct, ...proxied]);
}

export async function fetchUrlPreview(url: string): Promise<UrlPreview> {
  const parsed = parseProductUrl(url);
  const fallback: UrlPreview = {
    title: parsed.title,
    description: null,
    imageUrl: parsed.guessImage ?? null,
    imageCandidates: buildImageCandidates(parsed.guessImage),
  };
  const cached = previewCache.get(url);
  if (cached) return cached;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (json?.status === "success" && json.data) {
        const image =
          (json.data.image?.url as string | undefined) ||
          (json.data.logo?.url as string | undefined) ||
          fallback.imageUrl;
        const preview: UrlPreview = {
          title: (json.data.title as string) || fallback.title,
          description: (json.data.description as string) || null,
          imageUrl: image || null,
          imageCandidates: buildImageCandidates(
            json.data.image?.url,
            json.data.logo?.url,
            fallback.imageUrl
          ),
        };
        previewCache.set(url, preview);
        return preview;
      }
    }
  } catch {
    /* ignore network / CORS */
  }

  previewCache.set(url, fallback);
  return fallback;
}
