import {
  currentMonthKey,
  groupPaymentsByTenant,
  isoDate,
  isValidIsoDate,
  monthKeyFromPaidOn as collectionMonthKey,
  monthLabel,
  receiptNumberForDate,
  summarizeTenants,
  withCollectionStatus
} from './collection.js';

export function tenantInitials(name) {
  const honorifics = new Set(['MS', 'MR', 'MRS', 'MISS']);
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(p => !honorifics.has(p.replace(/[^A-Za-z]/g, '').toUpperCase()))
    .map(p => p.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean);
  if (parts.length === 0) return 'XX';
  if (parts.length === 1) {
    const word = parts[0].toUpperCase();
    const a = word[0] || 'X';
    const b = word[word.length - 1] || 'X';
    return `${a}${b}`;
  }
  const first = (parts[0][0] || 'X').toUpperCase();
  const last = (parts[parts.length - 1][0] || 'X').toUpperCase();
  return `${first}${last}`;
}

/** WN0920260002 — initials + MM + YYYY + overall receipt ordinal for that tenant */
export function buildReceiptNumber(tenant, paidOn, sequence) {
  const initials = tenantInitials(tenant?.name);
  const m = /^(\d{4})-(\d{2})/.exec(String(paidOn || ''));
  const yyyy = m?.[1] || '0000';
  const mm = m?.[2] || '00';
  return `${initials}${mm}${yyyy}${String(sequence).padStart(4, '0')}`;
}

export function monthKeyFromPaidOn(paidOn) {
  return collectionMonthKey(paidOn);
}

const ALLOWED_STATUSES = new Set(['paid', 'partial', 'pending', 'other']);

export function createPaymentsService({ tenantsRepository, paymentsRepository, now = () => new Date() }) {
  function money(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function buildDescription(tenant, priorPendingCents, clientDescription, status) {
    const base = clientDescription || `Rent for ${tenant.unit_label || 'unit'}, Floor ${tenant.unit_floor ?? '—'}`;
    if (status === 'other') return base;
    if (priorPendingCents > 0) {
      return `${base}. includes ${money(priorPendingCents)} prior balance`;
    }
    return base;
  }

  function resolveStatusAndPending(tenant, amountCents, statusInput, pendingAfterInput) {
    const priorPendingCents = tenant.pending_balance_cents || 0;
    const dueTotalCents = tenant.monthly_rent_cents + priorPendingCents;
    const shortfallCents = dueTotalCents - amountCents;

    let status = statusInput ? String(statusInput).toLowerCase() : null;
    if (!status || !ALLOWED_STATUSES.has(status)) {
      status = shortfallCents > 0 ? 'partial' : 'paid';
    }

    if (status === 'other') {
      return { status, pendingAfterCents: priorPendingCents, priorPendingCents, skipRentUpdate: true };
    }

    let pendingAfterCents;
    if (pendingAfterInput != null && pendingAfterInput !== '') {
      pendingAfterCents = Math.max(0, Math.round(Number(pendingAfterInput)));
    } else if (status === 'paid') {
      pendingAfterCents = 0;
    } else if (status === 'partial') {
      pendingAfterCents = shortfallCents > 0 ? shortfallCents : priorPendingCents;
    } else {
      pendingAfterCents = priorPendingCents;
    }

    return { status, pendingAfterCents, priorPendingCents, skipRentUpdate: false };
  }

  function recordPayment(tenantId, {
    amountCents,
    method,
    paidOn,
    description,
    status: statusInput,
    pendingAfterCents: pendingAfterInput,
    receiptNote
  }) {
    const tenant = tenantsRepository.findById(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    if (tenant.is_rent_free) throw new Error(`${tenant.name} is rent free; no payment to record`);
    if (!tenant.active) throw new Error(`${tenant.name} is disabled; no payment to record`);

    const amount = Math.round(Number(amountCents));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const { status, pendingAfterCents, priorPendingCents, skipRentUpdate } = resolveStatusAndPending(
      tenant,
      amount,
      statusInput,
      pendingAfterInput
    );

    const monthKey = monthKeyFromPaidOn(paidOn);
    if (!monthKey) throw new Error('paidOn must be YYYY-MM-DD');

    const existing = paymentsRepository.forTenant(tenantId);
    const nextOrdinal = existing.length + 1;
    const receiptNumber = buildReceiptNumber(tenant, paidOn, nextOrdinal);
    const note = String(receiptNote || '').trim();

    const payment = paymentsRepository.insert({
      tenant_id: tenantId,
      amount_cents: amount,
      method,
      paid_on: paidOn,
      description: buildDescription(tenant, priorPendingCents, description, status),
      receipt_note: note,
      pending_after_cents: skipRentUpdate ? priorPendingCents : pendingAfterCents,
      receipt_number: receiptNumber,
      rent_status: status
    });

    const updatedTenant = tenantsRepository.updateAfterPayment(tenantId, {
      status: skipRentUpdate ? tenant.status : status,
      pending_balance_cents: skipRentUpdate ? priorPendingCents : pendingAfterCents,
      payment_method: method,
      receipt_count: nextOrdinal
    });

    return { payment, tenant: updatedTenant };
  }

  function updatePaidOn(id, paidOn) {
    const payment = paymentsRepository.findById(id);
    if (!payment) throw new Error('Payment not found');
    if (!isValidIsoDate(paidOn)) {
      throw new Error('Payment date must be a real calendar day (YYYY-MM-DD)');
    }
    const nextNumber = receiptNumberForDate(payment.receipt_number, paidOn);
    if (nextNumber !== payment.receipt_number) {
      const clash = paymentsRepository.findByReceiptNumber(nextNumber);
      if (clash && clash.id !== payment.id) {
        throw new Error(`Receipt number ${nextNumber} is already in use`);
      }
    }
    return paymentsRepository.updatePaidOn(payment.id, {
      paid_on: paidOn,
      receipt_number: nextNumber
    });
  }

  function attachTenant(payment) {
    const tenant = tenantsRepository.findById(payment.tenant_id);
    return {
      ...payment,
      tenant_name: tenant?.name || 'Unknown',
      unit_label: tenant?.unit_label || '—'
    };
  }

  function getCollection(monthInput) {
    const month = monthInput || currentMonthKey(now());
    if (!/^\d{4}-\d{2}$/.test(month) || !monthLabel(month)) {
      throw new Error('month must be YYYY-MM');
    }
    const today = isoDate(now());
    const allTenants = tenantsRepository.all();
    const payments = paymentsRepository.allOrdered();
    const grouped = groupPaymentsByTenant(payments);
    const tenants = allTenants
      .filter(tenant => tenant.active !== 0)
      .map(tenant => withCollectionStatus(tenant, grouped.get(tenant.id) || [], month));
    const summary = summarizeTenants(tenants);
    const inMonth = payments
      .filter(payment => monthKeyFromPaidOn(payment.paid_on) === month)
      .sort((a, b) => (a.paid_on === b.paid_on ? b.id - a.id : a.paid_on < b.paid_on ? 1 : -1))
      .map(attachTenant);
    const flaggedPayments = payments
      .filter(payment => payment.paid_on > today)
      .sort((a, b) => (a.paid_on < b.paid_on ? -1 : 1))
      .map(attachTenant);

    return {
      month,
      monthLabel: monthLabel(month),
      summary,
      tenants,
      payments: inMonth,
      flaggedPayments
    };
  }

  return { recordPayment, updatePaidOn, getCollection };
}
