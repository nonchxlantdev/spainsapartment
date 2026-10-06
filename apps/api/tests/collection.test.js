import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js';
import {
  amountDueCents,
  effectiveStatus,
  monthLabel,
  receiptNumberForDate,
  withCollectionStatus
} from '../src/modules/payments/collection.js';

function tenant(overrides = {}) {
  return {
    id: 2,
    name: 'Wilbense Noel',
    status: 'partial',
    pending_balance_cents: 3000,
    monthly_rent_cents: 40000,
    is_rent_free: 0,
    active: 1,
    ...overrides
  };
}

describe('collection month', () => {
  it('keeps a September payment in September and opens October as unpaid', () => {
    const wilbense = tenant();
    const september = [{
      id: 1,
      tenant_id: 2,
      paid_on: '2026-09-05',
      pending_after_cents: 3000,
      rent_status: 'partial',
      amount_cents: 37000
    }];

    expect(effectiveStatus(wilbense, september, '2026-09')).toBe('partial');
    expect(effectiveStatus(wilbense, september, '2026-10')).toBe('pending');

    const octoberView = withCollectionStatus(wilbense, september, '2026-10');
    expect(octoberView.status).toBe('pending');
    expect(octoberView.pending_balance_cents).toBe(3000);
    expect(amountDueCents(octoberView)).toBe(43000);
  });

  it('counts an October rent payment toward October only', () => {
    const paid = tenant({ status: 'paid', pending_balance_cents: 0 });
    const payments = [
      { id: 1, tenant_id: 2, paid_on: '2026-09-05', pending_after_cents: 0, rent_status: 'paid', amount_cents: 40000 },
      { id: 2, tenant_id: 2, paid_on: '2026-10-06', pending_after_cents: 0, rent_status: 'paid', amount_cents: 40000 }
    ];
    expect(effectiveStatus(paid, payments, '2026-09')).toBe('paid');
    expect(effectiveStatus(paid, payments, '2026-10')).toBe('paid');
    expect(amountDueCents(withCollectionStatus(paid, payments, '2026-10'))).toBe(0);
  });

  it('ignores receipt-only payments when deciding if the month is collected', () => {
    const pending = tenant({ status: 'pending', pending_balance_cents: 0 });
    const payments = [{
      id: 1,
      tenant_id: 2,
      paid_on: '2026-10-06',
      pending_after_cents: 0,
      rent_status: 'other',
      amount_cents: 5000
    }];
    expect(effectiveStatus(pending, payments, '2026-10')).toBe('pending');
  });

  it('leaves rent-free tenants unchanged', () => {
    const free = tenant({ status: 'free', is_rent_free: 1, monthly_rent_cents: 0, pending_balance_cents: 0 });
    expect(effectiveStatus(free, [], '2026-10')).toBe('free');
    expect(amountDueCents(withCollectionStatus(free, [], '2026-10'))).toBe(0);
  });

  it('labels the collection month', () => {
    expect(monthLabel('2026-10')).toBe('October 2026');
  });

  it('rewrites only the month and year inside a receipt number', () => {
    expect(receiptNumberForDate('KB0820290002', '2026-08-23')).toBe('KB0820260002');
    expect(receiptNumberForDate('WN0920260003', '2026-09-06')).toBe('WN0920260003');
  });
});

describe('dashboard collection month', () => {
  it('does not count September payments as October collection', () => {
    const db = new Database(':memory:');
    initSchema(db);
    const unitsRepo = createUnitsRepository(db);
    const tenantsRepo = createTenantsRepository(db);
    const paymentsRepo = createPaymentsRepository(db);
    const unit = unitsRepo.insertSeed({
      floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000
    });
    const row = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: null, dob: null,
      onboarded_date: null, lease_renewal_date: null, monthly_rent_cents: 40000,
      due_day: '5th', payment_method: 'Cash', status: 'partial', pending_balance_cents: 3000,
      notes: '', receipt_count: 1, is_rent_free: 0
    });
    paymentsRepo.insert({
      tenant_id: row.id,
      amount_cents: 37000,
      method: 'Cash',
      paid_on: '2026-09-05',
      description: 'September 2026 Rent',
      pending_after_cents: 3000,
      receipt_number: 'WN0920260001',
      rent_status: 'partial'
    });

    const service = createDashboardService({
      tenantsRepository: tenantsRepo,
      paymentsRepository: paymentsRepo,
      now: () => new Date(2026, 9, 6)
    });
    const summary = service.getMonthlySummary();
    expect(summary.month).toBe('2026-10');
    expect(summary.collectedCents).toBe(0);
    expect(summary.outstandingCents).toBe(40000);
    expect(summary.paidCount).toBe(0);
    expect(summary.tenants.find(t => t.name === 'Wilbense Noel').status).toBe('pending');
  });
});
