import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { createPaymentsService } from '../src/modules/payments/payments.service.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const paymentsRepo = createPaymentsRepository(db);
  const service = createPaymentsService({ tenantsRepository: tenantsRepo, paymentsRepository: paymentsRepo });

  const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 });
  const tenant = tenantsRepo.insertSeed({
    unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: '000412897', dob: '1990-07-22',
    onboarded_date: '2025-11-05', lease_renewal_date: '2026-11-05', monthly_rent_cents: 40000,
    due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
    notes: '', receipt_count: 0, is_rent_free: 0
  });

  return { db, unitsRepo, tenantsRepo, paymentsRepo, service, tenantId: tenant.id };
}

describe('payments service - recordPayment', () => {
  it('keeps For Payment as rent for unit and floor without a due date', () => {
    const { service, tenantId } = setup();
    const { payment } = service.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-09-05'
    });
    expect(payment.description).toBe('Rent for Unit 2, Floor 1');
    expect(payment.description).not.toMatch(/due /i);
  });

  it('records a full payment as paid with no pending balance', () => {
    const { service, tenantId } = setup();
    const { payment, tenant } = service.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent'
    });
    expect(tenant.status).toBe('paid');
    expect(tenant.pending_balance_cents).toBe(0);
    expect(payment.receipt_number).toBe('WN0920260001');
    expect(payment.pending_after_cents).toBe(0);
  });

  it('records a partial payment and carries the shortfall as a pending balance', () => {
    const { service, tenantId } = setup();
    const { payment, tenant } = service.recordPayment(tenantId, {
      amountCents: 37000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent'
    });
    expect(tenant.status).toBe('partial');
    expect(tenant.pending_balance_cents).toBe(3000);
    expect(payment.pending_after_cents).toBe(3000);
  });

  it('adds the prior pending balance onto what is due on the next payment', () => {
    const { service, tenantId } = setup();
    service.recordPayment(tenantId, { amountCents: 37000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent' });
    const { tenant } = service.recordPayment(tenantId, { amountCents: 43000, method: 'Cash', paidOn: '2026-10-05', description: 'October 2026 Rent' });
    expect(tenant.status).toBe('paid');
    expect(tenant.pending_balance_cents).toBe(0);
  });

  it('increments the per-tenant receipt sequence on every payment', () => {
    const { service, tenantId } = setup();
    const first = service.recordPayment(tenantId, { amountCents: 40000, method: 'Cash', paidOn: '2026-09-05', description: 'Sept' });
    const second = service.recordPayment(tenantId, { amountCents: 40000, method: 'Cash', paidOn: '2026-10-05', description: 'Oct' });
    expect(first.payment.receipt_number).toBe('WN0920260001');
    expect(second.payment.receipt_number).toBe('WN1020260002');
  });

  it('treats an overpayment as paid in full (no negative pending balance)', () => {
    const { service, tenantId } = setup();
    const { tenant } = service.recordPayment(tenantId, { amountCents: 45000, method: 'Cash', paidOn: '2026-09-05', description: 'Sept' });
    expect(tenant.status).toBe('paid');
    expect(tenant.pending_balance_cents).toBe(0);
  });

  it('refuses to record a payment for a rent-free tenant', () => {
    const { service, unitsRepo, tenantsRepo } = setup();
    const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 1', unit_code: 'U1', is_owner_residence: 0, default_rent_cents: 0 });
    const freeTenant = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Flacko', phone: '', ssn: null, dob: null, onboarded_date: null,
      lease_renewal_date: null, monthly_rent_cents: 0, due_day: '—', payment_method: 'N/A',
      status: 'free', pending_balance_cents: 0, notes: '', receipt_count: 0, is_rent_free: 1
    });
    expect(() => service.recordPayment(freeTenant.id, { amountCents: 0, method: 'Cash', paidOn: '2026-09-05', description: 'n/a' }))
      .toThrow(/rent free/);
  });

  it('throws when the tenant does not exist', () => {
    const { service } = setup();
    expect(() => service.recordPayment(9999, { amountCents: 1000, method: 'Cash', paidOn: '2026-09-05', description: 'x' }))
      .toThrow(/not found/);
  });

  it('uses landlord-chosen status and stores a receipt note', () => {
    const { service, tenantId } = setup();
    const { payment, tenant } = service.recordPayment(tenantId, {
      amountCents: 100000,
      method: 'Cash',
      paidOn: '2026-09-05',
      description: 'First and last month rent',
      status: 'paid',
      receiptNote: 'Includes first month, last month, and security deposit'
    });
    expect(tenant.status).toBe('paid');
    expect(payment.receipt_number).toBe('WN0920260001');
    expect(payment.receipt_note).toContain('security deposit');
    expect(payment.amount_cents).toBe(100000);
  });

  it('records Other without changing rent status or pending balance', () => {
    const { service, tenantId, tenantsRepo } = setup();
    tenantsRepo.update(tenantId, { notes: 'keep' });
    // leave status pending with some pending balance
    const before = tenantsRepo.findById(tenantId);
    tenantsRepo.updateAfterPayment(tenantId, {
      status: 'partial',
      pending_balance_cents: 3000,
      payment_method: 'Cash',
      receipt_count: before.receipt_count
    });
    const { payment, tenant } = service.recordPayment(tenantId, {
      amountCents: 5000,
      method: 'Cash',
      paidOn: '2026-09-10',
      description: 'Security deposit',
      status: 'other',
      receiptNote: 'Does not count as September rent'
    });
    expect(tenant.status).toBe('partial');
    expect(tenant.pending_balance_cents).toBe(3000);
    expect(payment.receipt_number).toMatch(/^WN092026/);
    expect(payment.description).toMatch(/Security deposit/);
    expect(payment.rent_status).toBe('other');
  });

  it('corrects a payment date and the month encoded in the receipt number', () => {
    const { service, tenantId } = setup();
    const { payment } = service.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2029-08-23', description: 'Rent'
    });
    const updated = service.updatePaidOn(payment.id, '2026-08-23');
    expect(updated.paid_on).toBe('2026-08-23');
    expect(updated.receipt_number).toBe('WN0820260001');
    expect(updated.amount_cents).toBe(40000);
  });

  it('rejects a payment date that is not a real calendar day', () => {
    const { service, tenantId } = setup();
    const { payment } = service.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-09-05', description: 'Rent'
    });
    expect(() => service.updatePaidOn(payment.id, '2026-02-31')).toThrow(/date/i);
  });
});
