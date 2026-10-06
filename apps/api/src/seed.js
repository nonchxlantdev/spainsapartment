// apps/api/src/seed.js
import { getDb } from './db/index.js';
import { createUnitsRepository } from './modules/units/units.repository.js';
import { createTenantsRepository } from './modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from './modules/payments/payments.repository.js';

export function seedIfEmpty(db = getDb()) {
  const unitsRepository = createUnitsRepository(db);
  if (unitsRepository.all().length > 0) return;

  const tenantsRepository = createTenantsRepository(db);
  const paymentsRepository = createPaymentsRepository(db);

  const units = [
    { floor: 1, label: 'Unit 1', unit_code: 'U1', is_owner_residence: 0, default_rent_cents: 0 },
    { floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 },
    { floor: 1, label: 'Unit 3', unit_code: 'U3', is_owner_residence: 0, default_rent_cents: 50000 },
    { floor: 1, label: 'Unit 4', unit_code: 'U4', is_owner_residence: 0, default_rent_cents: 0 },
    { floor: 2, label: "Owner's Residence", unit_code: 'OWNER', is_owner_residence: 1, default_rent_cents: 0 },
    { floor: 2, label: 'Unit 5', unit_code: 'U5', is_owner_residence: 0, default_rent_cents: 50000 },
    { floor: 2, label: 'Unit 6', unit_code: 'U6', is_owner_residence: 0, default_rent_cents: 45000 },
    { floor: 3, label: 'Unit 7', unit_code: 'U7', is_owner_residence: 0, default_rent_cents: 50000 },
    { floor: 3, label: 'Unit 8', unit_code: 'U8', is_owner_residence: 0, default_rent_cents: 60000 },
    { floor: 3, label: 'Unit 9', unit_code: 'U9', is_owner_residence: 0, default_rent_cents: 60000 },
    { floor: 3, label: 'Unit 10', unit_code: 'U10', is_owner_residence: 0, default_rent_cents: 50000 }
  ];
  const inserted = {};
  for (const u of units) inserted[u.unit_code] = unitsRepository.insertSeed(u);

  const tenant = (code, fields) => tenantsRepository.insertSeed({
    unit_id: inserted[code].id, phone: '', email: '', ssn: null, dob: null, onboarded_date: null,
    lease_renewal_date: null, due_day: '', payment_method: 'Cash', notes: '', receipt_count: 0,
    is_rent_free: 0, pending_balance_cents: 0, status: 'pending', ...fields
  });

  tenant('U1', { name: 'Flacko', monthly_rent_cents: 0, due_day: '—', payment_method: 'N/A', status: 'free', is_rent_free: 1, notes: "Landlord's uncle — occupies rent-free. Excluded from collection totals." });
  const wilbense = tenant('U2', { name: 'Wilbense Noel', monthly_rent_cents: 40000, due_day: '5th', dob: '1990-07-22', ssn: '000412897', onboarded_date: '2026-07-05', lease_renewal_date: '2026-11-05', status: 'partial', pending_balance_cents: 3000, receipt_count: 1, notes: 'Paid $370 of $400 for September. Remaining $30 carried to October. Lease from July 5, 2026.' });
  tenant('U3', { name: 'Maya King', monthly_rent_cents: 50000, due_day: '17th', dob: '1997-01-27', onboarded_date: '2026-06-17', lease_renewal_date: '2027-06-17', notes: 'New lease started June 17, 2026.' });
  const jak = tenant('U5', { name: 'Jak Hussain', monthly_rent_cents: 50000, due_day: '4th', dob: '1988-12-02', onboarded_date: '2026-05-04', lease_renewal_date: '2026-12-04', status: 'paid', receipt_count: 1, notes: 'Lease from May 4, 2026. Reliable, always pays a day early.' });
  const timothy = tenant('U6', { name: 'Timothy Mena', monthly_rent_cents: 45000, due_day: '10th', dob: '1999-10-30', onboarded_date: '2022-08-01', lease_renewal_date: '2026-10-10', payment_method: 'Online Transfer', status: 'paid', receipt_count: 1 });
  const kwame = tenant('U7', { name: 'Kwame Bennett', monthly_rent_cents: 50000, due_day: '1st', dob: '1994-03-11', ssn: '000379235', phone: '+501 614-4997', onboarded_date: '2026-09-01', lease_renewal_date: '2027-01-01', payment_method: 'Online Transfer', status: 'paid', receipt_count: 1, notes: 'Lease from September 1, 2026. First and last month paid upfront per lease.' });
  tenant('U8', { name: 'Ms Kathy', monthly_rent_cents: 60000, due_day: '30th', dob: '1996-05-18', onboarded_date: '2026-01-01', lease_renewal_date: '2026-08-28', notes: 'Formerly Catalina Banner. Lease from January 2026.' });
  const keyon = tenant('U9', { name: 'Keyon Flowers', monthly_rent_cents: 60000, due_day: '20th', dob: '1993-09-09', onboarded_date: '2024-08-31', lease_renewal_date: '2027-08-01', payment_method: 'Online Transfer', receipt_count: 1, notes: 'Started August 31, 2024. Due day 20th since 2026.' });
  tenant('U10', { name: 'Samson Jacobs', monthly_rent_cents: 50000, due_day: 'Last Friday', dob: '1985-04-14', onboarded_date: '2020-01-01', lease_renewal_date: '2026-10-25', payment_method: 'Online Transfer' });

  paymentsRepository.insert({ tenant_id: wilbense.id, amount_cents: 37000, method: 'Cash', paid_on: '2026-09-05', description: 'September 2026 Rent, Unit 2, Floor 1', pending_after_cents: 3000, receipt_number: 'WN0920260001' });
  paymentsRepository.insert({ tenant_id: jak.id, amount_cents: 50000, method: 'Cash', paid_on: '2026-09-03', description: 'September 2026 Rent, Unit 5, Floor 2', pending_after_cents: 0, receipt_number: 'JH0920260001' });
  paymentsRepository.insert({ tenant_id: timothy.id, amount_cents: 45000, method: 'Online Transfer', paid_on: '2026-09-09', description: 'September 2026 Rent, Unit 6, Floor 2', pending_after_cents: 0, receipt_number: 'TM0920260001' });
  paymentsRepository.insert({ tenant_id: kwame.id, amount_cents: 50000, method: 'Online Transfer', paid_on: '2026-09-01', description: 'September 2026 Rent, Unit 7, Floor 3', pending_after_cents: 0, receipt_number: 'KB0920260001' });
  // Keyon's first receipt matches Initials + MMYYYY + seq
  paymentsRepository.insert({ tenant_id: keyon.id, amount_cents: 70000, method: 'Online Transfer', paid_on: '2024-08-01', description: 'First Month Rent, 3rd Floor Apt', pending_after_cents: 0, receipt_number: 'KF0820240001' });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedIfEmpty();
  console.log('Seed complete.');
}
