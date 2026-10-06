/**
 * Backfill monthly rent receipts for each paying tenant from lease start
 * through last month (or current month if a payment already exists this month).
 *
 * Idempotent: skips months that already have a payment.
 *
 * Usage: node apps/api/scripts/backfill-receipt-history.mjs
 */
import { getDb } from '../src/db/index.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { buildReceiptNumber, monthKeyFromPaidOn } from '../src/modules/payments/payments.service.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Lease starts + profile updates supplied by the landlord */
const PLANS = [
  {
    match: /jak hussain/i,
    start: '2026-05-04',
    due_day: '4th',
    onboarded_date: '2026-05-04'
  },
  {
    match: /keyon flowers/i,
    start: '2024-08-31',
    due_day: '20th',
    onboarded_date: '2024-08-31',
    // Keep existing Aug 2024 first-month receipt; fill months after that at monthly rent
  },
  {
    match: /kwame bennett/i,
    start: '2026-09-01',
    due_day: '1st',
    onboarded_date: '2026-09-01'
  },
  {
    match: /maya king/i,
    start: '2026-06-17',
    due_day: '17th',
    onboarded_date: '2026-06-17',
    lease_renewal_date: '2027-06-17',
    notes: 'New lease started June 17, 2026.'
  },
  {
    // Was Catalina Banner — landlord refers to her as Ms Kathy
    match: /catalina banner|kathy/i,
    rename: 'Ms Kathy',
    start: '2026-01-01',
    due_day: '30th',
    onboarded_date: '2026-01-01',
    notes: 'Formerly Catalina Banner. Lease from January 2026.'
  },
  {
    match: /samson jacobs/i,
    start: '2020-01-01',
    due_day: 'Last Friday',
    onboarded_date: '2020-01-01'
  },
  {
    match: /timothy mena/i,
    start: '2022-08-01',
    due_day: '10th',
    onboarded_date: '2022-08-01'
  },
  {
    match: /wilbense noel/i,
    start: '2026-07-05',
    due_day: '5th',
    onboarded_date: '2026-07-05'
  }
];

function ym(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function monthsFromTo(startYm, endYm) {
  const out = [];
  let cur = parseYmd(`${startYm}-01`);
  const end = parseYmd(`${endYm}-01`);
  while (cur <= end) {
    out.push(ym(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

function lastFridayOfMonth(year, monthIndex) {
  const d = new Date(year, monthIndex + 1, 0);
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  return d.getDate();
}

function paidOnForMonth(yearMonth, dueDay) {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  let day = 1;
  if (/last\s*friday/i.test(String(dueDay || ''))) {
    day = lastFridayOfMonth(y, m - 1);
  } else {
    const n = parseInt(String(dueDay).replace(/\D/g, ''), 10);
    if (Number.isFinite(n) && n > 0) day = Math.min(n, lastDay);
  }
  return `${yearMonth}-${String(day).padStart(2, '0')}`;
}

function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function endMonthForTenant(payments, now = new Date()) {
  const current = ym(now);
  const hasCurrent = payments.some(p => String(p.paid_on).startsWith(current));
  if (hasCurrent) return current;
  const prev = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -1);
  return ym(prev);
}

function startMonthFromLease(startDateStr) {
  return ym(parseYmd(startDateStr));
}

function nextLifetimeOrdinal(payments) {
  return payments.length + 1;
}

function monthHasPayment(payments, yearMonth) {
  return payments.some(p => String(p.paid_on).startsWith(yearMonth));
}

const db = getDb();
const tenantsRepository = createTenantsRepository(db);
const paymentsRepository = createPaymentsRepository(db);

const tenants = tenantsRepository.all();
const summary = [];

for (const plan of PLANS) {
  let tenant = tenants.find(t => plan.match.test(t.name));
  if (!tenant) {
    console.warn('SKIP: no tenant matching', plan.match);
    continue;
  }

  if (plan.rename && tenant.name !== plan.rename) {
    db.prepare('UPDATE tenants SET name = ? WHERE id = ?').run(plan.rename, tenant.id);
    tenant = tenantsRepository.findById(tenant.id);
    console.log(`Renamed tenant id=${tenant.id} → ${tenant.name}`);
  }

  const updates = {
    onboarded_date: plan.onboarded_date || plan.start,
    due_day: plan.due_day
  };
  if (plan.lease_renewal_date) updates.lease_renewal_date = plan.lease_renewal_date;
  if (plan.notes) updates.notes = plan.notes;
  tenantsRepository.update(tenant.id, updates);
  tenant = tenantsRepository.findById(tenant.id);

  let payments = paymentsRepository.forTenant(tenant.id);
  const startYm = startMonthFromLease(plan.start);
  const endYm = endMonthForTenant(payments);
  const months = monthsFromTo(startYm, endYm);

  let created = 0;

  for (const yearMonth of months) {
    if (monthHasPayment(payments, yearMonth)) continue;

    const paidOn = paidOnForMonth(yearMonth, tenant.due_day);
    const seq = nextLifetimeOrdinal(payments);
    const receiptNumber = buildReceiptNumber(tenant, paidOn, seq);
    const method = tenant.payment_method && tenant.payment_method !== 'N/A'
      ? tenant.payment_method
      : 'Cash';
    const description = `${monthLabel(yearMonth)} Rent, ${tenant.unit_label}, Floor ${tenant.unit_floor}`;

    paymentsRepository.insert({
      tenant_id: tenant.id,
      amount_cents: tenant.monthly_rent_cents,
      method,
      paid_on: paidOn,
      description,
      pending_after_cents: 0,
      receipt_number: receiptNumber
    });

    seq += 1;
    created += 1;
  }

  payments = paymentsRepository.forTenant(tenant.id);
  const maxSeq = payments.length;

  // Refresh status: if any payment in current month → paid/partial from that row; else pending
  const nowYm = ym(new Date());
  const currentPay = payments.find(p => String(p.paid_on).startsWith(nowYm));
  let status = 'pending';
  let pending = 0;
  if (currentPay) {
    pending = currentPay.pending_after_cents || 0;
    status = pending > 0 ? 'partial' : 'paid';
  }

  db.prepare(`
    UPDATE tenants
    SET receipt_count = ?, status = ?, pending_balance_cents = ?
    WHERE id = ?
  `).run(maxSeq, status, pending, tenant.id);

  summary.push({
    name: tenant.name,
    startYm,
    endYm,
    created,
    total: payments.length,
    receipt_count: maxSeq
  });
}

console.log(JSON.stringify(summary, null, 2));
console.log('Backfill complete.');
