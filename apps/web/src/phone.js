// apps/web/src/phone.js
export const BELIZE_PREFIX = '+501';

/** Digits only from a stored or raw phone, without country code when present. */
export function extractLocalDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('501') && digits.length > 3) digits = digits.slice(3);
  return digits.slice(0, 7);
}

/** Format up to 7 digits as XXX-XXXX. */
export function formatLocalPhone(raw) {
  const digits = extractLocalDigits(raw);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/** Full stored value: "+501 XXX-XXXX" or "". */
export function composeBelizePhone(localRaw) {
  const digits = extractLocalDigits(localRaw);
  if (!digits) return '';
  if (digits.length !== 7) return null; // incomplete / invalid
  return `${BELIZE_PREFIX} ${digits.slice(0, 3)}-${digits.slice(3)}`;
}

export function isCompleteOrEmptyLocal(localRaw) {
  const digits = extractLocalDigits(localRaw);
  return digits.length === 0 || digits.length === 7;
}
