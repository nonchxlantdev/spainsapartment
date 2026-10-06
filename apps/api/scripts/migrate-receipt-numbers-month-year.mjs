/**
 * Rename receipts to Initials + MM + YYYY + ordinal from lease/onboard start.
 * Ordinal 0001 = earliest payment on/after onboarded_date (or first payment if unset).
 * Usage: node apps/api/scripts/migrate-receipt-numbers-month-year.mjs
 */
import { getDb } from '../src/db/index.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { buildReceiptNumber } from '../src/modules/payments/payments.service.js';

const db = getDb();
const tenantsRepository = createTenantsRepository(db);
const paymentsRepository = createPaymentsRepository(db);

const payments = paymentsRepository.allOrdered();
const byTenant = new Map();

for (const p of payments) {
  if (!byTenant.has(p.tenant_id)) byTenant.set(p.tenant_id, []);
  byTenant.get(p.tenant_id).push(p);
}

const plan = [];
for (const [tenantId, rows] of byTenant) {
  const tenant = tenantsRepository.findById(tenantId);
  const start = tenant?.onboarded_date || rows[0]?.paid_on || '0000-01-01';
  // Chronological from lease/onboard start forward
  const fromStart = rows
    .filter(p => String(p.paid_on) >= String(start).slice(0, 10))
    .sort((a, b) => String(a.paid_on).localeCompare(String(b.paid_on)) || a.id - b.id);

  // Any earlier payments (before start) get ordinals after? Prefer include all chrono from first payment:
  const ordered = fromStart.length ? fromStart : rows;

  ordered.forEach((p, idx) => {
    const next = buildReceiptNumber(tenant || { name: 'X X' }, p.paid_on, idx + 1);
    if (p.receipt_number !== next) {
      plan.push({ id: p.id, from: p.receipt_number, to: next });
    }
  });
  db.prepare('UPDATE tenants SET receipt_count = ? WHERE id = ?').run(ordered.length, tenantId);
}

const tx = db.transaction(() => {
  for (const row of plan) {
    db.prepare('UPDATE payments SET receipt_number = ? WHERE id = ?').run(`__tmp_${row.id}`, row.id);
  }
  for (const row of plan) {
    db.prepare('UPDATE payments SET receipt_number = ? WHERE id = ?').run(row.to, row.id);
  }
});
tx();

console.log(`Renamed ${plan.length} receipts (ordinal from onboard/lease start)`);
for (const row of plan.slice(0, 25)) {
  console.log(`  ${row.from} → ${row.to}`);
}
if (plan.length > 25) console.log(`  … and ${plan.length - 25} more`);
