import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import HudPanel from '../components/HudPanel.jsx';
import PaymentDateEditor from '../components/PaymentDateEditor.jsx';
import RecordPaymentForm from '../components/RecordPaymentForm.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { IconAlert, IconCard, IconChevronLeft, IconChevronRight } from '../icons.jsx';
import { btnPrimary, btnSecondary, cardClass, focusRing, inputClass } from '../ui.js';

function money(cents) {
  return `$${(Number(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function Payments({ onChanged, onViewReceipt }) {
  const [month, setMonth] = useState(currentMonthValue);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [recordingId, setRecordingId] = useState(null);

  function load(nextMonth = month) {
    return apiGet(`/payments/collection?month=${nextMonth}`)
      .then(payload => {
        setData(payload);
        setError(null);
      })
      .catch(err => setError(err.message));
  }

  useEffect(() => {
    setRecordingId(null);
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function afterChange() {
    load(month);
    onChanged?.();
  }

  if (error) return <div className={`${cardClass} p-6 text-destructive`}>Could not load payments: {error}</div>;
  if (!data) return <div className={`${cardClass} p-6 text-mutedfg`}>Loading payments...</div>;

  const recording = data.tenants.find(tenant => tenant.id === recordingId) || null;
  const summary = data.summary;

  return (
    <div className="space-y-4">
      <HudPanel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-full border border-amber-500/50 text-amber-500 bg-amber-500/10 inline-flex items-center justify-center shadow-hud-amber">
              <IconCard className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-[20px] font-bold m-0 text-foreground">{data.monthLabel} collection</h2>
              <p className="text-[12.5px] text-mutedfg m-0 mt-1 max-w-xl">
                A payment counts for the month on its date. Earlier months stay where they are, and any unpaid balance carries forward.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(current => shiftMonth(current, -1))}
              className={`${btnSecondary} px-2.5`}
              aria-label="Previous month"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={month}
              onChange={e => e.target.value && setMonth(e.target.value)}
              className={`${inputClass} w-[160px]`}
              aria-label="Collection month"
            />
            <button
              type="button"
              onClick={() => setMonth(current => shiftMonth(current, 1))}
              className={`${btnSecondary} px-2.5`}
              aria-label="Next month"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Expected', value: money(summary.expectedCents) },
            { label: 'Collected', value: money(summary.collectedCents) },
            { label: 'Remaining', value: money(summary.outstandingCents) },
            { label: 'Paid', value: `${summary.paidCount} / ${summary.payingCount}` }
          ].map(stat => (
            <div key={stat.label} className="border border-amber-500/20 bg-muted/40 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-mutedfg m-0">{stat.label}</p>
              <p className="font-mono text-[20px] font-bold text-amber-500 m-0 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </HudPanel>

      {data.flaggedPayments.length > 0 && (
        <HudPanel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <IconAlert className="w-4 h-4 text-orange-300" />
            <h3 className="text-[14px] font-bold m-0 tracking-[0.16em] uppercase text-orange-300">Dates to check</h3>
          </div>
          <p className="text-[12.5px] text-mutedfg m-0 mb-3">
            These payments are dated after today. Correct the date if it was entered wrong — the receipt number month updates with it.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-mutedfg border-b border-amber-500/20">
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Tenant</th>
                  <th className="px-2 py-2 text-left">Amount</th>
                  <th className="px-2 py-2 text-left">Receipt</th>
                  <th className="px-2 py-2 text-left">For payment</th>
                </tr>
              </thead>
              <tbody>
                {data.flaggedPayments.map(payment => (
                  <PaymentRow key={payment.id} payment={payment} onSaved={afterChange} onViewReceipt={onViewReceipt} tenants={data.tenants} />
                ))}
              </tbody>
            </table>
          </div>
        </HudPanel>
      )}

      {recording && (
        <HudPanel className="overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20">
            <h3 className="text-[14px] font-bold m-0">Record {data.monthLabel} payment — {recording.name}</h3>
            <p className="text-[12px] text-mutedfg m-0 mt-1">
              Due now {money(recording.amount_due_cents)}
              {recording.pending_balance_cents > 0 ? ` · includes ${money(recording.pending_balance_cents)} carried balance` : ''}
            </p>
          </div>
          <RecordPaymentForm
            tenant={recording}
            periodLabel={data.monthLabel}
            onCancel={() => setRecordingId(null)}
            onRecorded={() => {
              setRecordingId(null);
              afterChange();
            }}
          />
        </HudPanel>
      )}

      <HudPanel className="overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-500/20">
          <h3 className="text-[14px] font-bold m-0 tracking-[0.16em] uppercase text-amber-500">Who owes {data.monthLabel}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-mutedfg border-b border-amber-500/20 bg-muted/40">
                <th className="px-4 py-2.5 text-left">Tenant</th>
                <th className="px-4 py-2.5 text-left">Unit</th>
                <th className="px-4 py-2.5 text-left">Due day</th>
                <th className="px-4 py-2.5 text-left">Rent</th>
                <th className="px-4 py-2.5 text-left">Due now</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.tenants.filter(tenant => !tenant.is_rent_free && tenant.status !== 'free').map(tenant => (
                <tr key={tenant.id} className="border-b border-amber-500/10 last:border-0">
                  <td className="px-4 py-3 font-semibold">{tenant.name}</td>
                  <td className="px-4 py-3 font-mono">{tenant.unit_label || '—'}</td>
                  <td className="px-4 py-3 font-mono">{tenant.due_day || '—'}</td>
                  <td className="px-4 py-3 font-mono">{money(tenant.monthly_rent_cents)}</td>
                  <td className="px-4 py-3 font-mono">
                    {money(tenant.amount_due_cents)}
                    {tenant.status === 'pending' && tenant.pending_balance_cents > 0 && (
                      <span className="text-warning text-xs ml-1">incl. {money(tenant.pending_balance_cents)} carried</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={tenant.status} active={tenant.active} /></td>
                  <td className="px-4 py-3">
                    {tenant.status === 'paid' ? (
                      <span className="text-[12px] text-mutedfg">Collected</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRecordingId(tenant.id)}
                        className={`${btnPrimary} px-3 py-1.5 text-[11.5px]`}
                      >
                        Record payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HudPanel>

      <HudPanel className="overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-500/20">
          <h3 className="text-[14px] font-bold m-0 tracking-[0.16em] uppercase text-amber-500">{data.monthLabel} payments</h3>
          <p className="text-[12px] text-mutedfg m-0 mt-1">Edit a date if it was entered wrong.</p>
        </div>
        {data.payments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mutedfg m-0">No payments dated in {data.monthLabel} yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-mutedfg border-b border-amber-500/20 bg-muted/40">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Tenant</th>
                  <th className="px-4 py-2.5 text-left">Amount</th>
                  <th className="px-4 py-2.5 text-left">Receipt</th>
                  <th className="px-4 py-2.5 text-left">For payment</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map(payment => (
                  <PaymentRow key={payment.id} payment={payment} onSaved={afterChange} onViewReceipt={onViewReceipt} tenants={data.tenants} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HudPanel>
    </div>
  );
}

function PaymentRow({ payment, onSaved, onViewReceipt, tenants }) {
  const tenant = tenants.find(item => item.id === payment.tenant_id);
  return (
    <tr className="border-b border-amber-500/10 last:border-0 align-top">
      <td className="px-4 py-3">
        <PaymentDateEditor payment={payment} onSaved={onSaved} />
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold">{payment.tenant_name}</div>
        <div className="text-[11.5px] text-mutedfg font-mono">{payment.unit_label}</div>
      </td>
      <td className="px-4 py-3 font-mono">{money(payment.amount_cents)}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => tenant && onViewReceipt?.(payment, tenant)}
          className={`font-mono text-[12px] text-cyan-400 ${focusRing} rounded`}
        >
          {payment.receipt_number}
        </button>
      </td>
      <td className="px-4 py-3 text-[12.5px] text-mutedfg">{payment.description}</td>
    </tr>
  );
}
