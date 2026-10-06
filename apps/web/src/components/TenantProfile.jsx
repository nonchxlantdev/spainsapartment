// apps/web/src/components/TenantProfile.jsx
import { useEffect, useState } from 'react';
import { apiPatch, apiPost } from '../api.js';
import StatusPill from './StatusPill.jsx';
import RecordPaymentForm from './RecordPaymentForm.jsx';
import PaymentDateEditor from './PaymentDateEditor.jsx';
import Avatar from './Avatar.jsx';
import {
  IconCheck, IconEye, IconEyeOff, IconArrowRight,
  IconPhone, IconMail, IconCalendar, IconShield, IconDollar, IconCard, IconNote
} from '../icons.jsx';
import { btnPrimary, btnSecondary, cardClass, inputClass, focusRing } from '../ui.js';
import {
  BELIZE_PREFIX,
  composeBelizePhone,
  formatLocalPhone,
  isCompleteOrEmptyLocal
} from '../phone.js';
import {
  displayToIso,
  formatDateInput,
  isoToDisplay,
  isCompleteOrEmptyDate,
  parseDateLocal
} from '../dates.js';
import { splitName } from '../name.js';

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function ageFromDob(dob) {
  const birth = parseDateLocal(dob);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function FieldLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-mutedfg">
      {Icon && <Icon className="w-3.5 h-3.5 text-mutedfg shrink-0" />}
      {children}
    </div>
  );
}

const EDITABLE = ['phone', 'email', 'gender', 'dob', 'ssn', 'monthly_rent_dollars', 'due_day', 'payment_method', 'lease_renewal_date', 'notes'];
const DATE_EDIT_FIELDS = new Set(['dob', 'lease_renewal_date']);

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthFromPaidOn(paidOn) {
  if (!paidOn || paidOn.length < 7) return null;
  return paidOn.slice(0, 7);
}

export default function TenantProfile({ tenant, onChanged, history, onViewReceipt }) {
  const [editing, setEditing] = useState(false);
  const [payFormOpen, setPayFormOpen] = useState(false);
  const [ssnRevealed, setSsnRevealed] = useState(false);
  const [form, setForm] = useState(null);
  const [successNote, setSuccessNote] = useState(null);
  const [bundleFrom, setBundleFrom] = useState(currentMonthValue);
  const [bundleTo, setBundleTo] = useState(currentMonthValue);
  const [bundleHint, setBundleHint] = useState(null);
  const [bundleBusy, setBundleBusy] = useState(false);
  const [phoneHint, setPhoneHint] = useState(null);
  const [dateHint, setDateHint] = useState(null);

  useEffect(() => {
    setSuccessNote(null);
    setPayFormOpen(false);
    setSsnRevealed(false);
    setEditing(false);
    setBundleHint(null);
    setPhoneHint(null);
    setDateHint(null);
    const month = currentMonthValue();
    setBundleFrom(month);
    setBundleTo(month);
  }, [tenant.id]);

  async function downloadReceiptBundle({ all = false } = {}) {
    setBundleHint(null);
    if (!all) {
      if (bundleTo < bundleFrom) {
        setBundleHint('To month must be on or after From month.');
        return;
      }
    }
    setBundleBusy(true);
    try {
      const qs = all
        ? new URLSearchParams({ all: '1' })
        : new URLSearchParams({ from: bundleFrom, to: bundleTo });
      const res = await fetch(`/api/receipts/tenant/${tenant.id}/bundle.zip?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] || (all ? 'receipts-all.zip' : `receipts-${bundleFrom}-to-${bundleTo}.zip`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBundleHint(`Downloaded ${filename}`);
    } catch (err) {
      setBundleHint(err.message || 'Could not download receipts.');
    } finally {
      setBundleBusy(false);
    }
  }

  function startEdit() {
    setPhoneHint(null);
    setDateHint(null);
    const parts = splitName(tenant.name);
    setForm({
      first: parts.first,
      middle: parts.middle,
      last: parts.last,
      phone_local: formatLocalPhone(tenant.phone || ''),
      email: tenant.email || '',
      gender: tenant.gender || '',
      dob: isoToDisplay(tenant.dob || ''),
      ssn: tenant.ssn || '',
      monthly_rent_dollars: (tenant.monthly_rent_cents / 100).toString(),
      due_day: tenant.due_day || '', payment_method: tenant.payment_method || '',
      lease_renewal_date: isoToDisplay(tenant.lease_renewal_date || ''),
      notes: tenant.notes || ''
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!String(form.first || '').trim() || !String(form.last || '').trim()) {
      setDateHint('First and last name are required.');
      return;
    }
    if (!isCompleteOrEmptyLocal(form.phone_local)) {
      setPhoneHint('Enter a full number as XXX-XXXX, or leave blank.');
      return;
    }
    const phone = composeBelizePhone(form.phone_local);
    if (phone === null) {
      setPhoneHint('Enter a full number as XXX-XXXX, or leave blank.');
      return;
    }
    if (!isCompleteOrEmptyDate(form.dob) || !isCompleteOrEmptyDate(form.lease_renewal_date)) {
      setDateHint('Use MM/DD/YYYY for dates, or leave blank.');
      return;
    }
    const dob = displayToIso(form.dob);
    const lease_renewal_date = displayToIso(form.lease_renewal_date);
    if (dob === null || lease_renewal_date === null) {
      setDateHint('Use MM/DD/YYYY for dates, or leave blank.');
      return;
    }
    setPhoneHint(null);
    setDateHint(null);
    await apiPatch(`/tenants/${tenant.id}`, {
      first: form.first,
      middle: form.middle,
      last: form.last,
      phone,
      email: form.email.trim(),
      gender: form.gender === 'male' || form.gender === 'female' ? form.gender : '',
      dob: dob || null,
      ssn: form.ssn || null,
      monthly_rent_cents: Math.round(parseFloat(form.monthly_rent_dollars || '0') * 100),
      due_day: form.due_day, payment_method: form.payment_method,
      lease_renewal_date: lease_renewal_date || null,
      notes: form.notes
    });
    setEditing(false);
    onChanged();
  }

  async function disableTenant() {
    if (!window.confirm(`Disable ${tenant.name}? Their unit will become vacant and receipts will be kept.`)) {
      return;
    }
    await apiPost(`/tenants/${tenant.id}/disable`, {});
    onChanged();
  }

  function handleRecorded(result) {
    setPayFormOpen(false);
    const payment = result?.payment;
    if (payment) {
      const pending = payment.pending_after_cents || 0;
      const note = pending > 0
        ? `Recorded ${money(payment.amount_cents)} with ${money(pending)} pending`
        : `Recorded ${money(payment.amount_cents)}, receipt generated`;
      setSuccessNote({ text: note, payment });
    }
    onChanged();
  }

  const maskedSsn = tenant.ssn ? `•••-••-${tenant.ssn.slice(-4)}` : 'Not on file';
  const age = ageFromDob(tenant.dob);
  const filteredHistory = (history || []).filter(h => {
    const ym = monthFromPaidOn(h.paid_on);
    if (!ym) return false;
    if (bundleFrom && ym < bundleFrom) return false;
    if (bundleTo && ym > bundleTo) return false;
    return true;
  });

  if (editing) {
    return (
      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex justify-between items-center px-4 py-4 border-b border-border">
          <h2 className="text-base font-bold m-0">{tenant.name}</h2>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
            <button onClick={saveEdit} className={btnPrimary}>
              <IconCheck className="w-3.5 h-3.5" />Save
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">First name</label>
            <input
              value={form.first}
              onChange={e => setForm({ ...form, first: e.target.value })}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Middle (optional)</label>
            <input
              value={form.middle}
              onChange={e => setForm({ ...form, middle: e.target.value })}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Last name</label>
            <input
              value={form.last}
              onChange={e => setForm({ ...form, last: e.target.value })}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Phone (WhatsApp)</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="shrink-0 px-2.5 py-2 rounded-lg bg-muted text-[13px] font-semibold text-mutedfg select-none">
                {BELIZE_PREFIX}
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="XXX-XXXX"
                value={form.phone_local}
                onChange={e => {
                  setPhoneHint(null);
                  setForm({ ...form, phone_local: formatLocalPhone(e.target.value) });
                }}
                className={`${inputClass} flex-1 font-mono`}
                aria-label="Local phone number"
              />
            </div>
            {phoneHint && (
              <p className="mt-1.5 mb-0 text-[12px] text-warning">{phoneHint}</p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={`${inputClass} mt-1`}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Gender</label>
            <select
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value })}
              className={`${inputClass} mt-1`}
            >
              <option value="">Select…</option>
              <option value="male">Male (Mr.)</option>
              <option value="female">Female (Ms.)</option>
            </select>
          </div>
          {EDITABLE.filter(f => f !== 'notes' && f !== 'phone' && f !== 'email' && f !== 'gender').map(field => (
            <div key={field}>
              <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">
                {field === 'dob' ? 'Date of birth' : field.replace(/_/g, ' ')}
              </label>
              <input
                value={form[field]}
                placeholder={DATE_EDIT_FIELDS.has(field) ? 'MM/DD/YYYY' : undefined}
                inputMode={DATE_EDIT_FIELDS.has(field) ? 'numeric' : undefined}
                onChange={e => {
                  const value = DATE_EDIT_FIELDS.has(field)
                    ? formatDateInput(e.target.value)
                    : e.target.value;
                  if (DATE_EDIT_FIELDS.has(field)) setDateHint(null);
                  setForm({ ...form, [field]: value });
                }}
                className={`${inputClass} mt-1${DATE_EDIT_FIELDS.has(field) ? ' font-mono' : ''}`}
              />
            </div>
          ))}
        </div>
        {dateHint && (
          <p className="mx-4 mb-2 text-[12px] text-warning m-0">{dateHint}</p>
        )}
        <div className="mx-4 mb-4 p-3 rounded-[10px] bg-muted">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-mutedfg mb-1.5">
            <IconNote className="w-3.5 h-3.5" />Notes
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3} className={`${inputClass}`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardClass} overflow-hidden transition-shadow duration-200 hover:shadow-card-hover`}>
      <div className="flex justify-between items-start gap-3 px-4 py-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar name={tenant.name} size="md" />
          <div>
            <h2 className="text-base font-bold m-0">{tenant.name}</h2>
            <p className="text-[12.5px] text-mutedfg mt-0.5 mb-0">
              {tenant.unit_label || 'No unit (former)'} · {tenant.unit_floor != null ? `Floor ${tenant.unit_floor}` : 'Unassigned'}
              {tenant.onboarded_date ? ` · onboarded ${isoToDisplay(tenant.onboarded_date)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={tenant.status} active={tenant.active} />
          <button onClick={startEdit} className={btnSecondary} disabled={tenant.active === 0}>Edit</button>
          {tenant.active !== 0 && tenant.status !== 'free' && (
            <button onClick={() => setPayFormOpen(!payFormOpen)} className={btnPrimary}>
              <IconCheck className="w-3.5 h-3.5" />
              Record payment
            </button>
          )}
          {tenant.active !== 0 && (
            <button type="button" onClick={disableTenant} className={btnSecondary}>
              Disable tenant
            </button>
          )}
        </div>
      </div>

      {successNote && (
        <div className="mx-4 mt-4 px-3.5 py-3 rounded-[10px] bg-successbg text-success text-[13px] font-semibold flex items-center gap-2 flex-wrap">
          <IconCheck className="w-4 h-4 shrink-0" />
          <span>{successNote.text}</span>
          <span className="text-mutedfg">·</span>
          <button
            type="button"
            onClick={() => {
              onViewReceipt(successNote.payment);
              setSuccessNote(null);
            }}
            className={`inline-flex items-center gap-1 text-accent font-semibold ${focusRing} rounded`}
          >
            view receipt
          </button>
          <button
            type="button"
            onClick={() => setSuccessNote(null)}
            className={`ml-auto text-xs font-semibold text-success/70 hover:text-success ${focusRing} rounded`}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {payFormOpen && (
        <RecordPaymentForm
          tenant={tenant}
          onCancel={() => setPayFormOpen(false)}
          onRecorded={handleRecorded}
        />
      )}

      {tenant.pending_balance_cents > 0 && (
        <div className="mx-4 mt-4 px-3.5 py-3 rounded-[10px] bg-warningbg text-warning flex items-center justify-between gap-3 flex-wrap text-[13px]">
          <span>Pending balance carried to next receipt</span>
          <strong className="font-mono text-[15px]">{money(tenant.pending_balance_cents)}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        <div>
          <FieldLabel icon={IconPhone}>Phone (WhatsApp)</FieldLabel>
          <div className="text-[13.5px] mt-1">
            {tenant.phone || <span className="text-mutedfg italic">Not on file. Click Edit to add</span>}
          </div>
        </div>
        <div>
          <FieldLabel icon={IconMail}>Email</FieldLabel>
          <div className="text-[13.5px] mt-1">
            {tenant.email || <span className="text-mutedfg italic">Not on file. Click Edit to add</span>}
          </div>
        </div>
        <div>
          <FieldLabel>Gender</FieldLabel>
          <div className="text-[13.5px] mt-1">
            {tenant.gender === 'male'
              ? 'Male (Mr.)'
              : tenant.gender === 'female'
                ? 'Female (Ms.)'
                : <span className="text-mutedfg italic">Not on file. Click Edit to add</span>}
          </div>
        </div>
        <div>
          <FieldLabel icon={IconCalendar}>Date of birth</FieldLabel>
          <div className="text-[13.5px] mt-1">
            {tenant.dob ? `${isoToDisplay(tenant.dob)}${age != null ? ` (age ${age})` : ''}` : 'Not on file'}
          </div>
        </div>
        <div>
          <FieldLabel icon={IconShield}>Social security #</FieldLabel>
          <div className="text-[13.5px] mt-1 flex items-center gap-2">
            <span className="font-mono">{tenant.ssn ? (ssnRevealed ? tenant.ssn : maskedSsn) : 'Not on file'}</span>
            {tenant.ssn && (
              <button
                type="button"
                onClick={() => setSsnRevealed(!ssnRevealed)}
                className={`p-0.5 text-mutedfg hover:text-primary ${focusRing} rounded`}
                aria-label="Toggle SSN visibility"
              >
                {ssnRevealed ? <IconEyeOff className="w-[15px] h-[15px]" /> : <IconEye className="w-[15px] h-[15px]" />}
              </button>
            )}
          </div>
        </div>
        <div>
          <FieldLabel icon={IconDollar}>Monthly rent</FieldLabel>
          <div className="text-[13.5px] mt-1">
            {tenant.status === 'free' ? 'Rent free' : `${money(tenant.monthly_rent_cents)} · due ${tenant.due_day}`}
          </div>
        </div>
        <div>
          <FieldLabel icon={IconCard}>Payment method</FieldLabel>
          <div className="text-[13.5px] mt-1">{tenant.payment_method || 'Not set'}</div>
        </div>
        <div>
          <FieldLabel icon={IconCalendar}>Lease renewal</FieldLabel>
          <div className="text-[13.5px] mt-1">{tenant.lease_renewal_date ? isoToDisplay(tenant.lease_renewal_date) : 'Not set'}</div>
        </div>
      </div>

      <div className="mx-4 mb-4 px-3.5 py-3 rounded-[10px] bg-muted text-[13px]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-mutedfg mb-1.5">
          <IconNote className="w-3.5 h-3.5" />Notes
        </div>
        {tenant.notes || 'No notes yet.'}
      </div>

      {history && (
        <div className="mt-2">
          <div className="px-4 pt-4 pb-3 border-t border-border flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-semibold m-0">Payment history</h2>
              <p className="text-[11.5px] text-mutedfg m-0 mt-1">
                Edit a date if it was entered wrong. The receipt number month updates with the date.
                {' '}
                {filteredHistory.length} receipt{filteredHistory.length === 1 ? '' : 's'} in range
                {history.length > 0 ? ` · ${history.length} total on file` : ''}
                {bundleFrom && bundleTo ? ` · ${bundleFrom} to ${bundleTo}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide text-mutedfg block mb-1">From</label>
                <input
                  type="month"
                  value={bundleFrom}
                  onChange={e => setBundleFrom(e.target.value)}
                  className={`${inputClass} w-[140px]`}
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide text-mutedfg block mb-1">To</label>
                <input
                  type="month"
                  value={bundleTo}
                  onChange={e => setBundleTo(e.target.value)}
                  className={`${inputClass} w-[140px]`}
                />
              </div>
              <button
                type="button"
                onClick={() => downloadReceiptBundle({ all: false })}
                disabled={bundleBusy || filteredHistory.length === 0}
                className={btnSecondary}
              >
                {bundleBusy ? 'Preparing…' : 'Download range'}
              </button>
              <button
                type="button"
                onClick={() => downloadReceiptBundle({ all: true })}
                disabled={bundleBusy || history.length === 0}
                className={btnPrimary}
                title="Download every receipt on file for this tenant"
              >
                Download all
              </button>
            </div>
          </div>
          {bundleHint && (
            <p className="px-4 pb-2 text-[12px] text-mutedfg m-0">{bundleHint}</p>
          )}
          {history.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-mutedfg">No payments recorded yet.</p>
          ) : filteredHistory.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-mutedfg">No receipts in this month range. Widen From / To to see earlier months.</p>
          ) : (
            <table className="w-full text-[13.5px]">
              <tbody>
                {filteredHistory.map(h => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <PaymentDateEditor payment={h} onSaved={onChanged} />
                    </td>
                    <td className="px-4 py-3 font-mono">{money(h.amount_cents)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(h)}
                        className={`inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent ${focusRing} rounded`}
                      >
                        View receipt
                        <IconArrowRight className="w-[13px] h-[13px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
