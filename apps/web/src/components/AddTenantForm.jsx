// apps/web/src/components/AddTenantForm.jsx
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api.js';
import { btnPrimary, btnSecondary, cardClass, inputClass } from '../ui.js';
import { BELIZE_PREFIX, composeBelizePhone, formatLocalPhone, isCompleteOrEmptyLocal } from '../phone.js';
import { displayToIso, formatDateInput, isCompleteOrEmptyDate } from '../dates.js';
import { IconCheck } from '../icons.jsx';

function moneyFromDollars(raw) {
  return Math.round(parseFloat(raw || '0') * 100);
}

export default function AddTenantForm({ onCancel, onCreated }) {
  const [vacant, setVacant] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first: '',
    middle: '',
    last: '',
    unit_id: '',
    monthly_rent_dollars: '',
    due_day: '',
    phone_local: '',
    email: '',
    gender: '',
    dob: '',
    notes: ''
  });

  useEffect(() => {
    apiGet('/tenants/vacant-units')
      .then(list => {
        setVacant(list);
        if (list[0]) {
          setForm(f => ({
            ...f,
            unit_id: String(list[0].id),
            monthly_rent_dollars: (list[0].default_rent_cents / 100).toString()
          }));
        }
      })
      .catch(err => setError(err.message));
  }, []);

  function onUnitChange(unitId) {
    const unit = vacant.find(u => String(u.id) === String(unitId));
    setForm(f => ({
      ...f,
      unit_id: unitId,
      monthly_rent_dollars: unit ? (unit.default_rent_cents / 100).toString() : f.monthly_rent_dollars
    }));
  }

  async function submit() {
    setError(null);
    if (!form.first.trim() || !form.last.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!form.unit_id) {
      setError('Select a vacant unit.');
      return;
    }
    if (!isCompleteOrEmptyLocal(form.phone_local)) {
      setError('Phone must be XXX-XXXX or blank.');
      return;
    }
    const phone = composeBelizePhone(form.phone_local);
    if (phone === null) {
      setError('Phone must be XXX-XXXX or blank.');
      return;
    }
    if (!isCompleteOrEmptyDate(form.dob)) {
      setError('DOB must be MM/DD/YYYY or blank.');
      return;
    }
    const dob = displayToIso(form.dob);
    if (dob === null) {
      setError('DOB must be MM/DD/YYYY or blank.');
      return;
    }

    setBusy(true);
    try {
      const tenant = await apiPost('/tenants', {
        first: form.first.trim(),
        middle: form.middle.trim(),
        last: form.last.trim(),
        unit_id: Number(form.unit_id),
        monthly_rent_cents: moneyFromDollars(form.monthly_rent_dollars),
        due_day: form.due_day.trim(),
        phone,
        email: form.email.trim(),
        gender: form.gender === 'male' || form.gender === 'female' ? form.gender : '',
        dob: dob || null,
        notes: form.notes.trim()
      });
      onCreated(tenant);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} p-4 mb-4`}>
      <h3 className="text-base font-bold m-0 mb-3">Add tenant</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">First</label>
          <input className={`${inputClass} mt-1`} value={form.first} onChange={e => setForm({ ...form, first: e.target.value })} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Middle (optional)</label>
          <input className={`${inputClass} mt-1`} value={form.middle} onChange={e => setForm({ ...form, middle: e.target.value })} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Last</label>
          <input className={`${inputClass} mt-1`} value={form.last} onChange={e => setForm({ ...form, last: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Unit</label>
          <select
            className={`${inputClass} mt-1`}
            value={form.unit_id}
            onChange={e => onUnitChange(e.target.value)}
            disabled={vacant.length === 0}
          >
            {vacant.length === 0 && <option value="">No vacant units</option>}
            {vacant.map(u => (
              <option key={u.id} value={u.id}>
                {u.label} · Floor {u.floor}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Monthly rent ($)</label>
          <input
            type="number"
            className={`${inputClass} mt-1`}
            value={form.monthly_rent_dollars}
            onChange={e => setForm({ ...form, monthly_rent_dollars: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Due day</label>
          <input
            className={`${inputClass} mt-1`}
            placeholder="e.g. 5th"
            value={form.due_day}
            onChange={e => setForm({ ...form, due_day: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Phone</label>
          <div className="mt-1 flex items-center gap-2">
            <span className="shrink-0 px-2.5 py-2 rounded-lg bg-muted text-[13px] font-semibold text-mutedfg">{BELIZE_PREFIX}</span>
            <input
              className={`${inputClass} font-mono`}
              placeholder="XXX-XXXX"
              value={form.phone_local}
              onChange={e => setForm({ ...form, phone_local: formatLocalPhone(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Email</label>
          <input
            type="email"
            className={`${inputClass} mt-1`}
            placeholder="name@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Gender</label>
          <select
            className={`${inputClass} mt-1`}
            value={form.gender}
            onChange={e => setForm({ ...form, gender: e.target.value })}
          >
            <option value="">Select…</option>
            <option value="male">Male (Mr.)</option>
            <option value="female">Female (Ms.)</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Date of birth</label>
          <input
            className={`${inputClass} mt-1 font-mono`}
            placeholder="MM/DD/YYYY"
            value={form.dob}
            onChange={e => setForm({ ...form, dob: formatDateInput(e.target.value) })}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg">Notes</label>
        <textarea
          className={`${inputClass} mt-1`}
          rows={2}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="button" onClick={submit} disabled={busy || vacant.length === 0} className={btnPrimary}>
          <IconCheck className="w-3.5 h-3.5" />
          {busy ? 'Saving…' : 'Create tenant'}
        </button>
      </div>
    </div>
  );
}
