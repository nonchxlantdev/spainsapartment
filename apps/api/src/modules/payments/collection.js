const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthKeyFromPaidOn(paidOn) {
  const match = /^(\d{4})-(\d{2})/.exec(String(paidOn || ''));
  return match ? `${match[1]}-${match[2]}` : null;
}

export function monthLabel(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
  if (!match) return '';
  const name = MONTHS[Number(match[2]) - 1];
  return name ? `${name} ${match[1]}` : '';
}

export function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Keep the initials and sequence; replace the month and year taken from paid_on. */
export function receiptNumberForDate(receiptNumber, paidOn) {
  const receipt = /^([A-Za-z]+)(\d{2})(\d{4})(\d{4})$/.exec(String(receiptNumber || ''));
  const date = /^(\d{4})-(\d{2})/.exec(String(paidOn || ''));
  if (!receipt || !date) return receiptNumber;
  return `${receipt[1]}${date[2]}${date[1]}${receipt[4]}`;
}

function owns(payment, tenant) {
  return payment.tenant_id == null || payment.tenant_id === tenant.id;
}

function isRentPayment(payment) {
  return payment?.rent_status !== 'other';
}

function statusFromPayment(payment) {
  if (payment.rent_status === 'paid' || payment.rent_status === 'partial' || payment.rent_status === 'pending') {
    return payment.rent_status;
  }
  return (payment.pending_after_cents || 0) > 0 ? 'partial' : 'paid';
}

export function effectiveStatus(tenant, payments, monthKey) {
  if (!tenant) return 'pending';
  if (tenant.is_rent_free || tenant.status === 'free') return 'free';

  const own = (payments || []).filter(payment => owns(payment, tenant));
  const rentPayments = own.filter(isRentPayment);
  const inMonth = rentPayments.filter(payment => monthKeyFromPaidOn(payment.paid_on) === monthKey);
  if (inMonth.length > 0) {
    inMonth.sort((a, b) => {
      if (a.paid_on === b.paid_on) return (a.id || 0) - (b.id || 0);
      return a.paid_on < b.paid_on ? -1 : 1;
    });
    return statusFromPayment(inMonth[inMonth.length - 1]);
  }
  if (rentPayments.length === 0) return tenant.status || 'pending';
  return 'pending';
}

export function amountDueCents(tenant) {
  if (!tenant || tenant.is_rent_free || tenant.status === 'free') return 0;
  if (tenant.status === 'paid') return 0;
  if (tenant.status === 'partial') return Math.max(0, tenant.pending_balance_cents || 0);
  return (tenant.monthly_rent_cents || 0) + (tenant.pending_balance_cents || 0);
}

export function withCollectionStatus(tenant, payments, monthKey) {
  const status = effectiveStatus(tenant, payments, monthKey);
  const viewed = { ...tenant, status, collection_month: monthKey };
  return { ...viewed, amount_due_cents: amountDueCents(viewed) };
}

export function groupPaymentsByTenant(payments) {
  const grouped = new Map();
  for (const payment of payments || []) {
    const list = grouped.get(payment.tenant_id) || [];
    list.push(payment);
    grouped.set(payment.tenant_id, list);
  }
  return grouped;
}

export function summarizeTenants(tenants) {
  const active = (tenants || []).filter(tenant => tenant.active !== 0);
  const paying = active.filter(tenant => !tenant.is_rent_free && tenant.status !== 'free');
  const expectedCents = paying.reduce((sum, tenant) => sum + tenant.monthly_rent_cents, 0);
  const collectedCents = paying.reduce((sum, tenant) => {
    if (tenant.status === 'paid') return sum + tenant.monthly_rent_cents;
    if (tenant.status === 'partial') return sum + (tenant.monthly_rent_cents - tenant.pending_balance_cents);
    return sum;
  }, 0);

  return {
    expectedCents,
    collectedCents,
    outstandingCents: expectedCents - collectedCents,
    payingCount: paying.length,
    paidCount: paying.filter(tenant => tenant.status === 'paid').length,
    occupiedUnits: active.length
  };
}
