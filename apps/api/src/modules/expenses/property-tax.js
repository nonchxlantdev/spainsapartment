// apps/api/src/modules/expenses/property-tax.js
// Property Tax is a standing overall balance, not a monthly bill.
// Monthly installment payments pay it down; missed months add to "behind".

export const PROPERTY_TAX_DEFAULTS = {
  remainingCents: 1631888,
  paidCents: 450000,
  installmentCents: 150000,
  behindCents: 300000
};

export function monthKeyFromIso(iso) {
  return String(iso || '').slice(0, 7);
}

export function monthsAfter(fromYm, toYm) {
  const parse = (ym) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return null;
    return Number(m[1]) * 12 + Number(m[2]) - 1;
  };
  const a = parse(fromYm);
  const b = parse(toYm);
  if (a == null || b == null) return 0;
  return Math.max(0, b - a);
}

/** Add one installment to behind for each month after last_accrual_month. */
export function accrueBehind(expense, currentMonth) {
  const behind = expense?.behind_cents || 0;
  const last = expense?.last_accrual_month || currentMonth;
  if (!expense || expense.amount_cents <= 0 || (expense.installment_cents || 0) <= 0) {
    if (expense && !expense.last_accrual_month) {
      return { behind_cents: behind, last_accrual_month: currentMonth, changed: true };
    }
    return { behind_cents: behind, last_accrual_month: last, changed: false };
  }
  const missed = monthsAfter(last, currentMonth);
  if (missed <= 0) {
    if (!expense.last_accrual_month) {
      return { behind_cents: behind, last_accrual_month: currentMonth, changed: true };
    }
    return { behind_cents: behind, last_accrual_month: last, changed: false };
  }
  return {
    behind_cents: behind + missed * expense.installment_cents,
    last_accrual_month: currentMonth,
    changed: true
  };
}

export function applyPaymentTowards(expense, amountCents) {
  const add = Math.round(Number(amountCents));
  return {
    amount_cents: Math.max(0, (expense.amount_cents || 0) - add),
    paid_amount_cents: (expense.paid_amount_cents || 0) + add,
    behind_cents: Math.max(0, (expense.behind_cents || 0) - add)
  };
}
