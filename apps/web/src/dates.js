// apps/web/src/dates.js
/** Display / edit format: MM/DD/YYYY. Storage: YYYY-MM-DD. */

export function isoToDisplay(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
  if (!m) return String(iso);
  return `${m[2]}/${m[3]}/${m[1]}`;
}

/** Digits only, max 8 (MMDDYYYY). */
function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 8);
}

/** Format typed input as MM/DD/YYYY while typing. */
export function formatDateInput(raw) {
  const d = digitsOnly(raw);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Parse display MM/DD/YYYY (or ISO) → YYYY-MM-DD.
 * Returns '' for empty, null for invalid/incomplete.
 */
export function displayToIso(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const mo = Number(iso[2]);
    const da = Number(iso[3]);
    if (!isValidYmd(y, mo, da)) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!slash) return null;
  const mo = Number(slash[1]);
  const da = Number(slash[2]);
  const y = Number(slash[3]);
  if (!isValidYmd(y, mo, da)) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
}

function isValidYmd(y, mo, da) {
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || y < 1900 || y > 2100) return false;
  const dt = new Date(y, mo - 1, da);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === da;
}

export function isCompleteOrEmptyDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return true;
  return displayToIso(s) != null;
}

/** Parse ISO or display date to local Date for age calc. */
export function parseDateLocal(raw) {
  const iso = displayToIso(raw) || (/^\d{4}-\d{2}-\d{2}/.test(String(raw || '')) ? String(raw).slice(0, 10) : null);
  if (!iso || iso === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayDisplay() {
  return isoToDisplay(todayIso());
}
