import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createTenantsService } from '../src/modules/tenants/tenants.service.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const service = createTenantsService({ tenantsRepository: tenantsRepo, unitsRepository: unitsRepo });
  const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 });
  return { db, unitsRepo, tenantsRepo, service, unit };
}

const baseTenant = (unitId) => ({
  unit_id: unitId, name: 'Wilbense Noel', phone: '', ssn: null, dob: null,
  onboarded_date: null, lease_renewal_date: null, monthly_rent_cents: 40000,
  due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
  notes: '', receipt_count: 0, is_rent_free: 0
});

describe('tenants repository', () => {
  it('inserts a tenant joined with its unit info', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed({
      ...baseTenant(unit.id),
      ssn: '000412897',
      dob: '1990-07-22',
      onboarded_date: '2025-11-05',
      lease_renewal_date: '2026-11-05'
    });
    const found = tenantsRepo.findById(tenant.id);
    expect(found.unit_code).toBe('U2');
    expect(found.unit_floor).toBe(1);
    expect(found.active).toBe(1);
  });

  it('updates whitelisted fields via update()', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed(baseTenant(unit.id));
    const updated = tenantsRepo.update(tenant.id, { phone: '+501 600-1234', notes: 'Pays a day early' });
    expect(updated.phone).toBe('+501 600-1234');
    expect(updated.notes).toBe('Pays a day early');
  });

  it('applies status, pending balance, method, and receipt_count via updateAfterPayment()', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed(baseTenant(unit.id));
    const updated = tenantsRepo.updateAfterPayment(tenant.id, {
      status: 'partial', pending_balance_cents: 3000, payment_method: 'Cash', receipt_count: 1
    });
    expect(updated.status).toBe('partial');
    expect(updated.pending_balance_cents).toBe(3000);
    expect(updated.receipt_count).toBe(1);
  });

  it('disables a tenant and clears unit_id', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed(baseTenant(unit.id));
    const disabled = tenantsRepo.disable(tenant.id);
    expect(disabled.active).toBe(0);
    expect(disabled.unit_id).toBeNull();
    expect(disabled.unit_label).toBeNull();
  });
});

describe('tenants service', () => {
  it('rejects edits to fields outside the whitelist (e.g. status, receipt_count)', () => {
    const { service, tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed(baseTenant(unit.id));
    const updated = service.edit(tenant.id, { status: 'paid', receipt_count: 99, phone: '+501 600-9999' });
    expect(updated.status).toBe('pending');
    expect(updated.receipt_count).toBe(0);
    expect(updated.phone).toBe('+501 600-9999');
  });

  it('creates a tenant on a vacant unit from name parts', () => {
    const { service, unit } = setup();
    const created = service.create({
      first: 'Maya',
      middle: '',
      last: 'King',
      unit_id: unit.id,
      monthly_rent_cents: 50000,
      due_day: '17th'
    });
    expect(created.name).toBe('Maya King');
    expect(created.unit_id).toBe(unit.id);
    expect(created.active).toBe(1);
  });

  it('lists vacant units after disable', () => {
    const { service, tenantsRepo, unit, unitsRepo } = setup();
    unitsRepo.insertSeed({ floor: 1, label: 'Unit 3', unit_code: 'U3', is_owner_residence: 0, default_rent_cents: 50000 });
    const tenant = tenantsRepo.insertSeed(baseTenant(unit.id));
    expect(service.vacantUnits().map(u => u.unit_code)).toEqual(['U3']);
    service.disable(tenant.id);
    expect(service.vacantUnits().map(u => u.unit_code).sort()).toEqual(['U2', 'U3']);
  });
});
