// apps/web/src/nextDue.js
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
 * The due date that falls within a given calendar month, as a Date — e.g.
 * dueDayToDate('5th', 2026, 8) -> Sep 5 2026. Handles "Last Friday" too.
 * Returns null when dueDay is blank/unset or unparseable.
 */
export function dueDateForMonth(dueDay, year, monthIndex0) {
  const raw = String(dueDay || '').trim();
  if (!raw || raw === '—' || raw === '-') return null;

  if (/last\s*friday/i.test(raw)) {
    return lastFridayOfMonth(year, monthIndex0);
  }

  const dayNum = parseDueDayNumber(raw);
  if (!dayNum || dayNum < 1 || dayNum > 31) return null;
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  return new Date(year, monthIndex0, Math.min(dayNum, lastDay));
}

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
