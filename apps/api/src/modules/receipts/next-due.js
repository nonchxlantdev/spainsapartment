// apps/api/src/modules/receipts/next-due.js
/** Exact next-due dates (MM/DD/YYYY) apply to receipts from this paid_on forward. */
export const EXACT_NEXT_DUE_FROM = '2026-09-01';

export function usesExactNextDue(paidOn) {
  return String(paidOn || '').slice(0, 10) >= EXACT_NEXT_DUE_FROM;
}

function parseDueDayNumber(dueDay) {
  const m = /^(\d{1,2})(?:st|nd|rd|th)?$/i.exec(String(dueDay || '').trim());
  return m ? Number(m[1]) : null;
}

function lastFridayOfMonth(year, monthIndex0) {
  const last = new Date(year, monthIndex0 + 1, 0);
  const back = (last.getDay() - 5 + 7) % 7;
  return new Date(year, monthIndex0 + 1, 0 - back);
}

function formatDisplay(year, month1to12, day) {
  return `${String(month1to12).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

/**
 * Next rent due after a payment: due day in the month after paid_on's month.
 * Returns MM/DD/YYYY or null if due_day can't be resolved.
 */
export function nextDueDateDisplay(paidOn, dueDay) {
  const m = /^(\d{4})-(\d{2})/.exec(String(paidOn || ''));
  if (!m) return null;
  let y = Number(m[1]);
  let mo = Number(m[2]) + 1;
  if (mo > 12) {
    mo = 1;
    y += 1;
  }

  const raw = String(dueDay || '').trim();
  if (!raw || raw === '—' || raw === '-') return null;

  if (/last\s*friday/i.test(raw)) {
    const d = lastFridayOfMonth(y, mo - 1);
    return formatDisplay(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  const dayNum = parseDueDayNumber(raw);
  if (!dayNum || dayNum < 1 || dayNum > 31) return null;
  const lastDay = new Date(y, mo, 0).getDate();
  return formatDisplay(y, mo, Math.min(dayNum, lastDay));
}

export function nextDuePhrase(paidOn, dueDay) {
  if (usesExactNextDue(paidOn)) {
    const exact = nextDueDateDisplay(paidOn, dueDay);
    if (exact) return exact;
  }
  const due = String(dueDay || '').trim();
  if (!due || due === '—' || due === '-') return 'your next due date';
  return due;
}
