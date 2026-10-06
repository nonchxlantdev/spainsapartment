import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createExpensesRepository } from '../src/modules/expenses/expenses.repository.js';
import { createExpensesService } from '../src/modules/expenses/expenses.service.js';
import { accrueBehind, applyPaymentTowards, monthsAfter, PROPERTY_TAX_DEFAULTS } from '../src/modules/expenses/property-tax.js';

function setup(today) {
  const db = new Database(':memory:');
  initSchema(db);
  const expensesRepository = createExpensesRepository(db);
  const service = createExpensesService({ expensesRepository, today: () => today });
  return { db, expensesRepository, service };
}

describe('property tax helpers', () => {
  it('counts whole months after the last accrual month', () => {
    expect(monthsAfter('2026-09', '2026-09')).toBe(0);
    expect(monthsAfter('2026-09', '2026-10')).toBe(1);
    expect(monthsAfter('2026-09', '2026-12')).toBe(3);
  });

  it('accrues one installment per missed month', () => {
    const next = accrueBehind({
      amount_cents: 1631888,
      installment_cents: 150000,
      behind_cents: 300000,
      last_accrual_month: '2026-09'
    }, '2026-11');
    expect(next.behind_cents).toBe(600000);
    expect(next.last_accrual_month).toBe('2026-11');
    expect(next.changed).toBe(true);
  });

  it('does not accrue twice in the same month', () => {
    const next = accrueBehind({
      amount_cents: 1631888,
      installment_cents: 150000,
      behind_cents: 300000,
      last_accrual_month: '2026-09'
    }, '2026-09');
    expect(next.behind_cents).toBe(300000);
    expect(next.changed).toBe(false);
  });

  it('applies a payment toward remaining, paid, and behind', () => {
    const next = applyPaymentTowards({
      amount_cents: 1631888,
      paid_amount_cents: 450000,
      behind_cents: 300000
    }, 150000);
    expect(next.amount_cents).toBe(1481888);
    expect(next.paid_amount_cents).toBe(600000);
    expect(next.behind_cents).toBe(150000);
  });
});

describe('property tax standing account', () => {
  it('creates the overall Property Tax account with the current remaining, paid, behind, and installment', () => {
    const { service } = setup('2026-09-25');
    const [tax] = service.list({ category: 'Property Tax' });
    expect(tax.amount_cents).toBe(PROPERTY_TAX_DEFAULTS.remainingCents);
    expect(tax.paid_amount_cents).toBe(PROPERTY_TAX_DEFAULTS.paidCents);
    expect(tax.installment_cents).toBe(PROPERTY_TAX_DEFAULTS.installmentCents);
    expect(tax.behind_cents).toBe(PROPERTY_TAX_DEFAULTS.behindCents);
    expect(tax.balance_cents).toBe(PROPERTY_TAX_DEFAULTS.remainingCents);
    expect(tax.is_installment).toBe(true);
    expect(tax.status).toBe('overdue');
  });

  it('keeps Property Tax out of a monthly bill list', () => {
    const { service } = setup('2026-09-25');
    service.create({ category: 'Garbage', amountCents: 6000, billDate: '2026-09-01' });
    const sept = service.list({ month: '2026-09' });
    expect(sept.every(e => e.category !== 'Property Tax')).toBe(true);
    expect(sept).toHaveLength(1);
  });

  it('pays toward remaining and reduces behind', () => {
    const { service } = setup('2026-09-25');
    const [tax] = service.list({ category: 'Property Tax' });
    const updated = service.addPayment(tax.id, 150000);
    expect(updated.amount_cents).toBe(1481888);
    expect(updated.paid_amount_cents).toBe(600000);
    expect(updated.behind_cents).toBe(150000);
  });

  it('adds the monthly installment to behind when a new month starts without a payment', () => {
    const { expensesRepository } = setup('2026-09-25');
    createExpensesService({ expensesRepository, today: () => '2026-09-25' }).list();
    const oct = createExpensesService({ expensesRepository, today: () => '2026-10-25' });
    const [tax] = oct.list({ category: 'Property Tax' });
    expect(tax.behind_cents).toBe(450000);
    expect(tax.amount_cents).toBe(PROPERTY_TAX_DEFAULTS.remainingCents);
  });

  it('lets remaining, installment, paid, and behind be edited independently', () => {
    const { service } = setup('2026-09-25');
    const [tax] = service.list({ category: 'Property Tax' });
    const updated = service.edit(tax.id, {
      amountCents: 1500000,
      installmentCents: 200000,
      paidAmountCents: 500000,
      behindCents: 100000
    });
    expect(updated.amount_cents).toBe(1500000);
    expect(updated.installment_cents).toBe(200000);
    expect(updated.paid_amount_cents).toBe(500000);
    expect(updated.behind_cents).toBe(100000);
  });

  it('refuses to delete the standing Property Tax account', () => {
    const { service } = setup('2026-09-25');
    const [tax] = service.list({ category: 'Property Tax' });
    expect(() => service.remove(tax.id)).toThrow(/cannot be deleted/);
  });
});
