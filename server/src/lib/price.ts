export function isMissingPrice(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  return !s || /^(n\/a|na|unknown|none|null|undefined|—|-)$/i.test(s);
}

export function formatDisplayPrice(raw: unknown): string | null {
  if (isMissingPrice(raw)) return null;
  const s = String(raw).trim();
  const match = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return s;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return s.startsWith("$") ? s : `$${s}`;
  const body = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `$${body}`;
}

export function extractPriceFromText(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /META PRICE FOUND:\s*(\$?[\d,.]+)/i,
    /"price"\s*:\s*"?\$?([\d,.]+)"?/i,
    /\bPrice:\s*\$?\s*([\d,.]+)/i,
    /salePrice["\s:]*\$?\s*([\d,.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const formatted = formatDisplayPrice(match[1]);
      if (formatted) return formatted;
    }
  }
  return null;
}
