// apps/api/src/modules/expenses/expenses.service.js
import { CATEGORIES, CATEGORY_ORDER, isValidCategory, isValidCoverage, isInstallmentCategory } from './expenses.config.js';
import { PROPERTY_TAX_DEFAULTS, accrueBehind, applyPaymentTowards, monthKeyFromIso } from './property-tax.js';

const DUE_SOON_DAYS = 3;

function balanceCents(expense) {
  if (isInstallmentCategory(expense.category)) return Math.max(0, expense.amount_cents);
  return Math.max(0, expense.amount_cents - expense.paid_amount_cents);
}

function daysDiff(dueDateIso, today) {
  const due = new Date(`${dueDateIso}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

/** overdue | today | soon | null — null once paid, with no due date, or due more than DUE_SOON_DAYS out. */
function tierFor(expense, today) {
  if (isInstallmentCategory(expense.category)) {
    return expense.behind_cents > 0 && expense.amount_cents > 0 ? 'overdue' : null;
  }
  if (balanceCents(expense) <= 0 || !expense.due_date) return null;
  const diff = daysDiff(expense.due_date, today);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= DUE_SOON_DAYS) return 'soon';
  return null;
}

function statusFor(expense, today) {
  if (isInstallmentCategory(expense.category)) {
    if (expense.amount_cents <= 0) return 'paid';
    if (expense.behind_cents > 0) return 'overdue';
    return 'due';
  }
  if (balanceCents(expense) <= 0) return 'paid';
  if (tierFor(expense, today) === 'overdue') return 'overdue';
  if (expense.paid_amount_cents > 0) return 'partial';
  return 'due';
}

function decorate(expense, today) {
  return {
    ...expense,
    balance_cents: balanceCents(expense),
    status: statusFor(expense, today),
    due_tier: tierFor(expense, today),
    is_installment: isInstallmentCategory(expense.category)
  };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function asNonNegativeCents(value, fallback) {
  if (value == null || value === '') return fallback;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function createExpensesService({ expensesRepository, today = todayIso }) {
  function currentMonth() {
    return monthKeyFromIso(today());
  }

  function persistAccrual(expense) {
    if (!expense || !isInstallmentCategory(expense.category)) return expense;
    const next = accrueBehind(expense, currentMonth());
    if (!next.changed) return expense;
    return expensesRepository.update(expense.id, {
      behind_cents: next.behind_cents,
      last_accrual_month: next.last_accrual_month
    }) || expense;
  }

  function ensurePropertyTax() {
    const existing = expensesRepository.lastForCategory('Property Tax');
    if (!existing) {
      return expensesRepository.insert({
        category: 'Property Tax',
        coverage: null,
        amount_cents: PROPERTY_TAX_DEFAULTS.remainingCents,
        paid_amount_cents: PROPERTY_TAX_DEFAULTS.paidCents,
        bill_date: today(),
        due_date: null,
        installment_cents: PROPERTY_TAX_DEFAULTS.installmentCents,
        behind_cents: PROPERTY_TAX_DEFAULTS.behindCents,
        last_accrual_month: currentMonth()
      });
    }
    if ((existing.installment_cents || 0) > 0) return persistAccrual(existing);
    return persistAccrual(expensesRepository.update(existing.id, {
      amount_cents: existing.amount_cents >= PROPERTY_TAX_DEFAULTS.remainingCents
        ? existing.amount_cents
        : PROPERTY_TAX_DEFAULTS.remainingCents,
      paid_amount_cents: existing.paid_amount_cents > 0
        ? existing.paid_amount_cents
        : PROPERTY_TAX_DEFAULTS.paidCents,
      installment_cents: PROPERTY_TAX_DEFAULTS.installmentCents,
      behind_cents: PROPERTY_TAX_DEFAULTS.behindCents,
      last_accrual_month: currentMonth()
    }) || existing);
  }

  function list({ month, category } = {}) {
    const todayStr = today();
    ensurePropertyTax();
    let rows = expensesRepository.all().map(e => persistAccrual(e));
    if (month && month !== 'all') {
      rows = rows.filter(e => {
        if (isInstallmentCategory(e.category)) return false;
        return (e.due_date || e.bill_date).slice(0, 7) === month;
      });
    }
    if (category && category !== 'all') {
      rows = rows.filter(e => e.category === category);
    }
    return rows.map(e => decorate(e, todayStr));
  }

  function get(id) {
    const expense = persistAccrual(expensesRepository.findById(id));
    return expense ? decorate(expense, today()) : null;
  }

  function categories() {
    return { categories: CATEGORIES, order: CATEGORY_ORDER };
  }

  function validate({ category, coverage, amountCents, allowZero = false }) {
    if (!isValidCategory(category)) {
      throw new Error(`Unknown expense category: ${category}`);
    }
    if (!isValidCoverage(category, coverage)) {
      throw new Error(`"${coverage}" is not a coverage group for ${category}`);
    }
    const amount = Math.round(Number(amountCents));
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Bill amount must be greater than zero');
    }
    if (amount === 0 && !allowZero && !isInstallmentCategory(category)) {
      throw new Error('Bill amount must be greater than zero');
    }
    if (amount <= 0 && !allowZero && !isInstallmentCategory(category)) {
      throw new Error('Bill amount must be greater than zero');
    }
    return amount;
  }

  function clampPaid(amountCents, paidAmountCents) {
    const paid = Math.round(Number(paidAmountCents) || 0);
    if (!Number.isFinite(paid) || paid < 0) return 0;
    return Math.min(paid, amountCents);
  }

  function create({ category, coverage, amountCents, billDate, dueDate, paidAmountCents, installmentCents, behindCents }) {
    if (isInstallmentCategory(category)) {
      const standing = ensurePropertyTax();
      return edit(standing.id, { category, amountCents, paidAmountCents, installmentCents, behindCents, billDate });
    }
    const amount = validate({ category, coverage, amountCents });
    if (!billDate) throw new Error('billDate is required (YYYY-MM-DD)');
    const paid = clampPaid(amount, paidAmountCents);

    const expense = expensesRepository.insert({
      category,
      coverage: coverage || null,
      amount_cents: amount,
      paid_amount_cents: paid,
      bill_date: billDate,
      due_date: dueDate || null
    });
    return decorate(expense, today());
  }

  function edit(id, { category, coverage, amountCents, billDate, dueDate, paidAmountCents, installmentCents, behindCents }) {
    const existing = persistAccrual(expensesRepository.findById(id));
    if (!existing) return null;

    const nextCategory = category ?? existing.category;
    const nextCoverage = coverage !== undefined ? coverage : existing.coverage;

    if (isInstallmentCategory(nextCategory)) {
      const nextAmount = amountCents != null
        ? validate({ category: nextCategory, coverage: nextCoverage, amountCents, allowZero: true })
        : existing.amount_cents;
      const updated = expensesRepository.update(id, {
        category: nextCategory,
        coverage: null,
        amount_cents: nextAmount,
        paid_amount_cents: asNonNegativeCents(paidAmountCents, existing.paid_amount_cents),
        bill_date: billDate || existing.bill_date || today(),
        due_date: null,
        installment_cents: asNonNegativeCents(installmentCents, existing.installment_cents),
        behind_cents: asNonNegativeCents(behindCents, existing.behind_cents),
        last_accrual_month: currentMonth()
      });
      return updated ? decorate(updated, today()) : null;
    }

    const nextAmount = amountCents != null ? validate({ category: nextCategory, coverage: nextCoverage, amountCents }) : validate({
      category: nextCategory,
      coverage: nextCoverage,
      amountCents: existing.amount_cents
    });
    const nextPaid = paidAmountCents != null ? clampPaid(nextAmount, paidAmountCents) : clampPaid(nextAmount, existing.paid_amount_cents);

    const updated = expensesRepository.update(id, {
      category: nextCategory,
      coverage: nextCoverage || null,
      amount_cents: nextAmount,
      paid_amount_cents: nextPaid,
      bill_date: billDate || existing.bill_date,
      due_date: dueDate !== undefined ? (dueDate || null) : existing.due_date
    });
    return updated ? decorate(updated, today()) : null;
  }

  /** Adds a partial payment toward a bill's balance, capped at the bill's amount. */
  function addPayment(id, amountCents) {
    const existing = persistAccrual(expensesRepository.findById(id));
    if (!existing) return null;
    const add = Math.round(Number(amountCents));
    if (!Number.isFinite(add) || add <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (isInstallmentCategory(existing.category)) {
      const next = applyPaymentTowards(existing, add);
      const updated = expensesRepository.update(id, next);
      return decorate(updated, today());
    }

    const paid = clampPaid(existing.amount_cents, existing.paid_amount_cents + add);
    const updated = expensesRepository.update(id, { paid_amount_cents: paid });
    return decorate(updated, today());
  }

  function markPaid(id) {
    const existing = persistAccrual(expensesRepository.findById(id));
    if (!existing) return null;
    if (isInstallmentCategory(existing.category)) {
      const installment = existing.installment_cents || 0;
      if (installment <= 0) return decorate(existing, today());
      return addPayment(id, installment);
    }
    const updated = expensesRepository.update(id, { paid_amount_cents: existing.amount_cents });
    return decorate(updated, today());
  }

  function remove(id) {
    const existing = expensesRepository.findById(id);
    if (existing && isInstallmentCategory(existing.category)) {
      throw new Error('Property Tax is a standing balance and cannot be deleted');
    }
    expensesRepository.remove(id);
  }

  return { list, get, categories, create, edit, addPayment, markPaid, remove };
}
