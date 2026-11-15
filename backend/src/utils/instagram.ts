/** "@Levix.Wear", "instagram.com/levix.wear/", "https://www.instagram.com/levix.wear?igsh=…" → "levix.wear". Empty → null. */
export function normalizeInstagram(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let v = raw.trim();
  if (!v) return null;
  const m = v.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) v = m[1];
  v = v.replace(/^@+/, '').replace(/\/+$/, '').trim().toLowerCase();
  return v || null;
}

/** Instagram usernames: 1–30 letters, numbers, dots, underscores; no leading/trailing or double dots. */
export const INSTAGRAM_RE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{1,30}$/;
