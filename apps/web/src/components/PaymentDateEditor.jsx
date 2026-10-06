import { useEffect, useState } from 'react';
import { apiPatch } from '../api.js';
import { displayToIso, formatDateInput, isoToDisplay, isCompleteOrEmptyDate } from '../dates.js';
import { btnPrimary, btnSecondary, focusRing, inputClass } from '../ui.js';

export default function PaymentDateEditor({ payment, onSaved }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => isoToDisplay(payment.paid_on));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDate(isoToDisplay(payment.paid_on));
    setOpen(false);
    setError(null);
  }, [payment.id, payment.paid_on]);

  async function save() {
    if (!isCompleteOrEmptyDate(date) || !date.trim()) {
      setError('Enter the date as MM/DD/YYYY.');
      return;
    }
    const paidOn = displayToIso(date);
    if (!paidOn) {
      setError('Enter the date as MM/DD/YYYY.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await apiPatch(`/payments/${payment.id}`, { paidOn });
      setOpen(false);
      onSaved?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono">{isoToDisplay(payment.paid_on)}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`text-[11.5px] font-semibold text-amber-500 hover:text-amber-400 ${focusRing} rounded`}
        >
          Edit
        </button>
      </span>
    );
  }

  return (
    <div className="min-w-[180px]">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          placeholder="MM/DD/YYYY"
          value={date}
          onChange={e => {
            setError(null);
            setDate(formatDateInput(e.target.value));
          }}
          className={`${inputClass} font-mono w-[124px] py-1.5`}
          aria-label="Payment date"
        />
        <button type="button" onClick={save} disabled={busy} className={`${btnPrimary} px-2.5 py-1.5 text-[11.5px]`}>
          {busy ? 'Saving' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setDate(isoToDisplay(payment.paid_on));
          }}
          className={`${btnSecondary} px-2.5 py-1.5 text-[11.5px]`}
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive mt-1 mb-0">{error}</p>}
    </div>
  );
}
