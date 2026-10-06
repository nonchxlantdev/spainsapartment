// apps/web/src/components/RecordPaymentForm.jsx
import { useState } from 'react';
import { apiPost } from '../api.js';
import { IconCheck } from '../icons.jsx';
import { btnPrimary, btnSecondary, inputClass } from '../ui.js';
import { displayToIso, formatDateInput, isCompleteOrEmptyDate, todayDisplay } from '../dates.js';

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function periodLabelFromToday() {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function RecordPaymentForm({ tenant, onRecorded, onCancel, periodLabel }) {
  const dueTotalCents = tenant.monthly_rent_cents + tenant.pending_balance_cents;
  const period = periodLabel || periodLabelFromToday();
  const [amount, setAmount] = useState((dueTotalCents / 100).toString());
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(todayDisplay);
  const [status, setStatus] = useState('paid');
  const [pendingDollars, setPendingDollars] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [description, setDescription] = useState(
    `${period} rent for ${tenant.unit_label || 'unit'}, Floor ${tenant.unit_floor ?? '—'}`
  );
  const [error, setError] = useState(null);

  const amountCents = Math.round(parseFloat(amount || '0') * 100);
  const shortfall = dueTotalCents - amountCents;
  const priorPending = tenant.pending_balance_cents || 0;
  const dueDay = tenant.due_day && tenant.due_day !== '—' && tenant.due_day !== '-' ? tenant.due_day : null;

  async function submit() {
    if (!isCompleteOrEmptyDate(date) || !date.trim()) {
      setError('Enter the payment date as MM/DD/YYYY.');
      return;
    }
    const paidOn = displayToIso(date);
    if (!paidOn) {
      setError('Enter the payment date as MM/DD/YYYY.');
      return;
    }
    if (amountCents <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }

    let pendingAfterCents;
    if (status === 'partial') {
      if (pendingDollars.trim() !== '') {
        pendingAfterCents = Math.round(parseFloat(pendingDollars || '0') * 100);
      } else {
        pendingAfterCents = shortfall > 0 ? shortfall : priorPending;
      }
    } else if (status === 'paid') {
      pendingAfterCents = 0;
    } else {
      pendingAfterCents = priorPending;
    }

    try {
      const result = await apiPost('/payments', {
        tenantId: tenant.id,
        amountCents,
        method,
        paidOn,
        description: description.trim() || undefined,
        status,
        pendingAfterCents,
        receiptNote: receiptNote.trim()
      });
      onRecorded(result);
    } catch (err) {
      setError(err.message);
    }
  }

  let hint = null;
  if (amountCents > 0) {
    if (shortfall > 0) {
      hint = `Amount is ${money(shortfall)} under current due (${money(dueTotalCents)}). Choose status yourself — receipt will still generate.`;
    } else if (shortfall < 0) {
      hint = `Amount is ${money(-shortfall)} over current due. Choose status yourself — receipt will still generate.`;
    } else {
      hint = 'Amount matches current due. Choose status yourself — receipt will still generate.';
    }
  }

  return (
    <div className="mx-4 mt-4 p-4 rounded-[10px] border border-border bg-muted">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Amount received</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className={inputClass}>
            <option>Cash</option>
            <option>Online Transfer</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Date</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/DD/YYYY"
            value={date}
            onChange={e => {
              setError(null);
              setDate(formatDateInput(e.target.value));
            }}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Mark status as</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="other">Other (no rent status change)</option>
          </select>
        </div>
      </div>

      {status === 'other' && (
        <p className="text-xs text-mutedfg mb-3">
          Creates a receipt only. This month’s rent status and pending balance stay as they are.
        </p>
      )}

      {status === 'partial' && (
        <div className="mb-3 max-w-xs">
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">
            Pending balance after ($)
          </label>
          <input
            type="number"
            placeholder={shortfall > 0 ? (shortfall / 100).toString() : '0'}
            value={pendingDollars}
            onChange={e => setPendingDollars(e.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-mutedfg mt-1 mb-0">Leave blank to use suggested shortfall when under due.</p>
        </div>
      )}

      <div className="mb-3">
        <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">For payment (receipt line)</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. First & last month rent, Unit 7"
          className={inputClass}
        />
      </div>

      <div className="mb-3">
        <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Receipt note (optional)</label>
        <textarea
          rows={2}
          value={receiptNote}
          onChange={e => setReceiptNote(e.target.value)}
          placeholder="Shown on the PDF — e.g. Includes security deposit; paid $50 over rent"
          className={inputClass}
        />
      </div>

      {hint && <p className="text-xs text-mutedfg mb-2">{hint}</p>}
      {priorPending > 0 && (
        <p className="text-xs text-warning mb-2">
          Current due includes {money(priorPending)} prior balance + {money(tenant.monthly_rent_cents)} rent
          {dueDay ? ` (due ${dueDay})` : ''} = {money(dueTotalCents)}.
        </p>
      )}
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button onClick={submit} className={btnPrimary}>
          <IconCheck className="w-3.5 h-3.5" />
          Record payment
        </button>
      </div>
    </div>
  );
}
