// apps/web/src/dueAlerts.js — "is rent due soon / today / overdue" tracking.
import { dueDateForMonth } from './nextDue.js';

/** Default lead time for a "coming up" alert, in days. */
export const DUE_SOON_DAYS = 3;

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * For one tenant, returns how their due date relates to today:
 *   { tier: 'overdue' | 'today' | 'soon', daysDiff, dueDate }
 * or null when they're not flaggable — rent-free, already marked paid this
 * cycle, disabled, or with no parseable due day.
 *
 * `daysDiff` is negative once overdue (days past due), 0 for due today, and
 * positive (up to `dueSoonDays`) for "coming up".
 */
export function getDueAlert(tenant, { today = new Date(), dueSoonDays = DUE_SOON_DAYS } = {}) {
  if (!tenant || tenant.active === 0) return null;
  if (tenant.is_rent_free || tenant.status === 'free') return null;
  if (tenant.status === 'paid') return null;

  const now = startOfDay(today);
  const dueThisMonth = dueDateForMonth(tenant.due_day, now.getFullYear(), now.getMonth());
  if (!dueThisMonth) return null;

  const due = startOfDay(dueThisMonth);
  const daysDiff = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (daysDiff < 0) return { tier: 'overdue', daysDiff, dueDate: due };
  if (daysDiff === 0) return { tier: 'today', daysDiff, dueDate: due };
  if (daysDiff <= dueSoonDays) return { tier: 'soon', daysDiff, dueDate: due };
  return null;
}

/**
 * Runs getDueAlert over a tenant list and returns only the flagged ones as
 * { tenant, tier, daysDiff, dueDate }, most urgent first (most overdue,
 * then due today, then soonest-upcoming).
 */
export function collectDueAlerts(tenants, opts) {
  const flagged = [];
  for (const tenant of tenants || []) {
    const alert = getDueAlert(tenant, opts);
    if (alert) flagged.push({ tenant, ...alert });
  }
  flagged.sort((a, b) => a.daysDiff - b.daysDiff);
  return flagged;
}

/** Short label for a flagged tenant's due state, e.g. "Overdue 3d", "Due today", "Due in 2d". */
export function dueAlertLabel({ tier, daysDiff }) {
  if (tier === 'overdue') return `Overdue ${Math.abs(daysDiff)}d`;
  if (tier === 'today') return 'Due today';
  return `Due in ${daysDiff}d`;
}
