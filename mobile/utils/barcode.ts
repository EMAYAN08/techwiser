export const MAX_BARCODE_PRODUCTS = 3;

export type GtinKind = "upca" | "upce" | "ean8" | "ean13" | "gtin14" | "isbn13";

function onlyDigits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function gtinCheckDigit(body: string): string {
  const digits = onlyDigits(body);
  let sum = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    sum += Number(reversed[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidGtin(code: string): boolean {
  const d = onlyDigits(code);
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(d)) return false;
  const body = d.slice(0, -1);
  return gtinCheckDigit(body) === d.slice(-1);
}

export function expandUpce(upce: string): string | null {
  const d = onlyDigits(upce);
  let ns = "0";
  let core = "";
  let check = "";
  if (d.length === 8) {
    ns = d[0];
    core = d.slice(1, 7);
    check = d[7];
  } else if (d.length === 7) {
    ns = d[0];
    core = d.slice(1);
  } else if (d.length === 6) {
    core = d;
  } else {
    return null;
  }
  if (ns !== "0" && ns !== "1") return null;
  if (!/^\d{6}$/.test(core)) return null;
  const last = core[5];
  let mfr = "";
  let prod = "";
  if (last === "0" || last === "1" || last === "2") {
    mfr = core.slice(0, 2) + last + "00";
    prod = "00" + core.slice(2, 5);
  } else if (last === "3") {
    mfr = core.slice(0, 3) + "00";
    prod = "000" + core.slice(3, 5);
  } else if (last === "4") {
    mfr = core.slice(0, 4) + "0";
    prod = "0000" + core[4];
  } else {
    mfr = core.slice(0, 5);
    prod = "0000" + last;
  }
  const body = ns + mfr + prod;
  const computed = gtinCheckDigit(body);
  if (check && check !== computed) return null;
  return body + computed;
}

function isbn10CheckOk(raw: string): boolean {
  const body9 = raw.slice(0, 9);
  if (!/^\d{9}$/.test(body9)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(body9[i]);
  const d = (11 - (sum % 11)) % 11;
  const expected = d === 10 ? "X" : String(d);
  return raw[9].toUpperCase() === expected;
}

export function isbn10ToEan13(isbn10: string): string | null {
  const raw = isbn10.replace(/[^0-9Xx]/g, "");
  if (raw.length !== 10) return null;
  if (!isbn10CheckOk(raw)) return null;
  const ean12 = "978" + raw.slice(0, 9);
  return ean12 + gtinCheckDigit(ean12);
}

export function classifyGtin(digits: string): GtinKind | null {
  const d = onlyDigits(digits);
  if (d.length === 8) return "ean8";
  if (d.length === 12) return "upca";
  if (d.length === 14) return "gtin14";
  if (d.length === 13) {
    if (d.startsWith("978") || d.startsWith("979")) return "isbn13";
    return "ean13";
  }
  return null;
}

export function normalizeGtin(raw: string): string | null {
  const d = onlyDigits(raw);
  if (d.length === 6 || d.length === 7 || (d.length === 8 && (d[0] === "0" || d[0] === "1") && !isValidGtin(d))) {
    const expanded = expandUpce(d);
    if (expanded && isValidGtin(expanded)) return expanded;
  }
  if (d.length === 8 || d.length === 12 || d.length === 13 || d.length === 14) {
    if (isValidGtin(d)) {
      if (d.length === 12) return "0" + d;
      if (d.length === 14 && d.startsWith("0")) return d.slice(1);
      return d;
    }
  }
  if (d.length === 10) {
    const ean = isbn10ToEan13(raw);
    if (ean && isValidGtin(ean)) return ean;
  }
  return null;
}

export function compactGtin(ean13: string): string {
  const d = onlyDigits(ean13);
  if (d.length === 13 && d.startsWith("0")) return d.slice(1);
  return d;
}

function tryNormalize(candidate: string): string | null {
  return normalizeGtin(candidate);
}

function extractGtinFromGs1(raw: string): string | null {
  const stripped = raw.replace(/^\][A-Za-z0-9]{1,3}/, "").replace(/\u001d/g, "");
  const paren = stripped.match(/\(01\)\s*(\d{8,14})/);
  if (paren) {
    const n = tryNormalize(paren[1]);
    if (n) return n;
  }
  const compact = stripped.replace(/\s+/g, "");
  const m14 = compact.match(/(?:^|[^\d])01(\d{14})(?!\d)/);
  if (m14) {
    const n = tryNormalize(m14[1]);
    if (n) return n;
  }
  const m13 = compact.match(/(?:^|[^\d])01(\d{13})(?!\d)/);
  if (m13) {
    const n = tryNormalize(m13[1]);
    if (n) return n;
  }
  return null;
}

export type BarcodePayload =
  | { kind: "gtin"; code: string; raw: string }
  | { kind: "url"; url: string; raw: string }
  | { kind: "invalid"; raw: string; message: string }
  | { kind: "qr"; raw: string; message: string };

const URL_RE = /https?:\/\/[^\s<>"'`\\]+/i;
const QR_PAYLOAD = /^WIFI:|^BEGIN:VCARD|^MECARD:|^SMSTO:|^TEL:|^MATMSG:|^GEO:|^MAILTO:|^BEGIN:VEVENT/i;

export function extractBarcodePayload(raw: string): BarcodePayload {
  const t = (raw ?? "").trim();
  if (!t) return { kind: "invalid", raw: t, message: "Empty barcode" };

  if (QR_PAYLOAD.test(t)) {
    return {
      kind: "qr",
      raw: t,
      message: "That's a QR code, not a UPC. Switch to the QR Code tab.",
    };
  }

  const urlMatch = t.match(URL_RE);
  if (urlMatch) {
    return { kind: "url", url: urlMatch[0].replace(/[),.;!?]+$/g, ""), raw: t };
  }

  const gs1 = extractGtinFromGs1(t);
  if (gs1) return { kind: "gtin", code: gs1, raw: t };

  const digits = onlyDigits(t);
  if (digits.length >= 6 && digits.length <= 14) {
    const gtin = normalizeGtin(digits);
    if (gtin) return { kind: "gtin", code: gtin, raw: t };
    if (digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14) {
      return { kind: "invalid", raw: t, message: "That barcode looks damaged. Try again." };
    }
  }

  if (/^[A-Z0-9.$/+%-]{6,}$/i.test(t) && onlyDigits(t).length < 6) {
    return { kind: "invalid", raw: t, message: "Need a UPC or EAN, not this barcode type." };
  }

  return { kind: "invalid", raw: t, message: "No UPC or EAN in this barcode" };
}

export function formatGtin(code: string): string {
  const d = onlyDigits(code);
  if (d.length === 13 && d.startsWith("0")) {
    const u = d.slice(1);
    return `${u.slice(0, 1)} ${u.slice(1, 6)} ${u.slice(6, 11)} ${u.slice(11)}`;
  }
  if (d.length === 13) return `${d.slice(0, 1)} ${d.slice(1, 7)} ${d.slice(7, 12)} ${d.slice(12)}`;
  if (d.length === 8) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return d;
}
