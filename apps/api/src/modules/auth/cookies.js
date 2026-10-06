// apps/api/src/modules/auth/cookies.js — tiny cookie helpers (no extra deps).

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function serializeCookie(name, value, { maxAgeMs, clear = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.VERCEL) parts.push('Secure');
  if (clear) {
    parts.push('Max-Age=0');
  } else if (maxAgeMs) {
    parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  }
  return parts.join('; ');
}
