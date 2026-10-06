// apps/web/src/billAlerts.js — due-date alert helpers for logged bills.
// Mirrors the tier naming/labels in dueAlerts.js (tenant rent) so the two
// alert styles read as one system, but keyed off a bill's own `due_date` /
// `due_tier` (computed server-side) rather than a tenant's monthly due day.

export function daysDiffFromToday(dueDateIso) {
  const due = new Date(`${dueDateIso}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Short label for a flagged bill's due state, e.g. "Overdue 3d", "Due today", "Due in 2d". */
export function billAlertLabel(tier, daysDiff, expense) {
  if (expense?.is_installment && expense.behind_cents > 0) {
    return `Behind ${money(expense.behind_cents)}`;
  }
  if (tier === 'overdue') return `Overdue ${Math.abs(daysDiff)}d`;
  if (tier === 'today') return 'Due today';
  return `Due in ${daysDiff}d`;
}

/** Bills flagged overdue/today/soon (server-computed `due_tier`), soonest first. */
export function collectBillAlerts(expenses) {
  const flagged = (expenses || [])
    .filter(e => e.due_tier)
    .map(e => ({
      expense: e,
      tier: e.due_tier,
      daysDiff: e.due_date ? daysDiffFromToday(e.due_date) : 0
    }));
  flagged.sort((a, b) => {
    if (Boolean(a.expense.is_installment) !== Boolean(b.expense.is_installment)) {
      return a.expense.is_installment ? -1 : 1;
    }
    return a.daysDiff - b.daysDiff;
  });
  return flagged;
}
