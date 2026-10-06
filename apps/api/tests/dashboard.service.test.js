import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js';

function seedRealTenants(db) {
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const u = (code, floor, label, rent) => unitsRepo.insertSeed({ floor, label, unit_code: code, is_owner_residence: 0, default_rent_cents: rent });
  const t = (unit, name, rent, status, pending) => tenantsRepo.insertSeed({
    unit_id: unit.id, name, phone: '', ssn: null, dob: null, onboarded_date: null, lease_renewal_date: null,
    monthly_rent_cents: rent, due_day: '', payment_method: 'Cash', status, pending_balance_cents: pending,
    notes: '', receipt_count: status === 'pending' ? 0 : 1, is_rent_free: 0
  });

  t(u('U1', 1, 'Unit 1', 0), 'Flacko', 0, 'free', 0);
  t(u('U2', 1, 'Unit 2', 40000), 'Wilbense Noel', 40000, 'partial', 3000);
  t(u('U3', 1, 'Unit 3', 50000), 'Maya King', 50000, 'pending', 0);
  t(u('U5', 2, 'Unit 5', 50000), 'Jak Hussain', 50000, 'paid', 0);
  t(u('U6', 2, 'Unit 6', 45000), 'Timothy Mena', 45000, 'paid', 0);
  t(u('U7', 3, 'Unit 7', 50000), 'Kwame Bennett', 50000, 'paid', 0);
  t(u('U8', 3, 'Unit 8', 60000), 'Catalina Banner', 60000, 'pending', 0);
  t(u('U9', 3, 'Unit 9', 60000), 'Keyon Flowers', 60000, 'pending', 0);
  t(u('U10', 3, 'Unit 10', 50000), 'Samson Jacobs', 50000, 'pending', 0);
  // mark Flacko's tenants entry as rent-free explicitly via update since insertSeed above sets it via is_rent_free arg
  db.prepare("UPDATE tenants SET is_rent_free = 1 WHERE name = 'Flacko'").run();
}

describe('dashboard service', () => {
  it('computes expected, collected, outstanding, and paid count against the real September figures', () => {
    const db = new Database(':memory:');
    initSchema(db);
    seedRealTenants(db);
    const tenantsRepo = createTenantsRepository(db);
    const service = createDashboardService({ tenantsRepository: tenantsRepo });

    const summary = service.getMonthlySummary();
    expect(summary.expectedCents).toBe(405000); // $4,050 across the 8 paying tenants
    expect(summary.collectedCents).toBe(182000); // $1,820 collected so far
    expect(summary.outstandingCents).toBe(223000); // $2,230 outstanding
    expect(summary.payingCount).toBe(8);
    expect(summary.paidCount).toBe(3); // Jak, Timothy, Kwame (Wilbense is partial, not paid)
    expect(summary.occupiedUnits).toBe(9); // 8 paying + Flacko, out of 10 non-owner units
  });
});
