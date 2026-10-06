// apps/web/src/pages/Expenses.jsx
import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api.js';
import HudPanel from '../components/HudPanel.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import BillStatusPill from '../components/BillStatusPill.jsx';
import { IconAlert, IconCheck, IconPlus } from '../icons.jsx';
import { btnPrimary, btnSecondary, focusRing, inputClass } from '../ui.js';
import { displayToIso, formatDateInput, isCompleteOrEmptyDate, isoToDisplay, todayDisplay, todayIso } from '../dates.js';
import { billAlertLabel, collectBillAlerts } from '../billAlerts.js';

const TIER_STYLE = {
  overdue: { ring: 'border-destructive/50', dot: 'bg-destructive', text: 'text-destructive' },
  today: { ring: 'border-warning/50', dot: 'bg-warning', text: 'text-warning' },
  soon: { ring: 'border-hud-cyan/50', dot: 'bg-hud-cyan', text: 'text-hud-cyan' }
};

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthKey(dateIso) {
  return dateIso.slice(0, 7);
}

function currentMonthKey() {
  return monthKey(todayIso());
}

function isInstallment(expense) {
  return Boolean(expense?.is_installment || expense?.category === 'Property Tax');
}

// Bills are grouped/filtered by the month they're due in, not the month
// they were logged in — a bill entered in September but due in October
// belongs under October. Falls back to the bill date when there's no due
// date (e.g. Property Tax, Butane) since those have nothing else to group by.
function expenseMonthKey(expense) {
  return monthKey(expense.due_date || expense.bill_date);
}

function monthKeyLabel(key) {
  if (key === 'all') return 'All Time';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

const emptyForm = {
  category: 'Electricity',
  coverage: '',
  amount: '',
  billDate: todayDisplay(),
  dueDate: '',
  paymentMade: '0.00',
  paidInFull: false
};

export default function Expenses({ onComingSoon }) {
  const [categoriesConfig, setCategoriesConfig] = useState(null); // { categories, order }
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [taxEditing, setTaxEditing] = useState(false);
  const [taxPaying, setTaxPaying] = useState(false);
  const [taxForm, setTaxForm] = useState({ remaining: '', installment: '', paid: '', behind: '' });
  const [taxPayAmount, setTaxPayAmount] = useState('');
  const [taxError, setTaxError] = useState(null);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(t);
  }, [savedFlash]);

  function refresh() {
    return apiGet('/expenses').then(setExpenses);
  }

  useEffect(() => {
    Promise.all([apiGet('/expenses/categories'), apiGet('/expenses')]).then(([cats, list]) => {
      setCategoriesConfig(cats);
      setExpenses(list);
      setLoaded(true);
    });
  }, []);

  const propertyTax = useMemo(() => expenses.find(e => isInstallment(e)) || null, [expenses]);

  const months = useMemo(() => {
    const keys = new Set(expenses.filter(e => !isInstallment(e)).map(e => expenseMonthKey(e)));
    keys.add(currentMonthKey());
    keys.add(selectedMonth);
    return Array.from(keys).sort().reverse();
  }, [expenses, selectedMonth]);

  const monthExpenses = useMemo(
    () => expenses.filter(e => !isInstallment(e) && (selectedMonth === 'all' || expenseMonthKey(e) === selectedMonth)),
    [expenses, selectedMonth]
  );
  const visible = useMemo(
    () => monthExpenses.filter(e => selectedCategory === 'all' || e.category === selectedCategory),
    [monthExpenses, selectedCategory]
  );

  const total = visible.reduce((s, e) => s + e.amount_cents, 0);
  const withBalance = visible.filter(e => e.balance_cents > 0);
  const balanceTotal = withBalance.reduce((s, e) => s + e.balance_cents, 0);

  const byCategory = useMemo(() => {
    const map = {};
    (categoriesConfig?.order || []).forEach(c => { map[c] = 0; });
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount_cents; });
    if (propertyTax) map['Property Tax'] = propertyTax.amount_cents;
    return map;
  }, [monthExpenses, categoriesConfig, propertyTax]);

  const billAlerts = useMemo(() => collectBillAlerts(expenses), [expenses]);

  const sorted = visible.slice().sort((a, b) => {
    const aUnpaid = a.balance_cents > 0 ? 0 : 1;
    const bUnpaid = b.balance_cents > 0 ? 0 : 1;
    return aUnpaid - bUnpaid || b.bill_date.localeCompare(a.bill_date) || b.id - a.id;
  });

  function lastAmountForCategory(category) {
    const match = expenses
      .filter(e => e.category === category)
      .sort((a, b) => b.bill_date.localeCompare(a.bill_date) || b.id - a.id)[0];
    return match ? match.amount_cents : null;
  }

  function categoryDef(name) {
    return categoriesConfig?.categories?.[name] || { fixed: false, groups: [] };
  }

  function blankFormFor(category) {
    const def = categoryDef(category);
    const last = def.fixed ? lastAmountForCategory(category) : null;
    return {
      ...emptyForm,
      category,
      coverage: def.groups[0] || '',
      billDate: todayDisplay(),
      amount: last != null ? (last / 100).toFixed(2) : ''
    };
  }

  function openForm(expense) {
    setFormError(null);
    setSavedFlash(false);
    setPayingId(null);
    if (expense) {
      setEditingId(expense.id);
      setForm({
        category: expense.category,
        coverage: expense.coverage || '',
        amount: (expense.amount_cents / 100).toFixed(2),
        billDate: isoToDisplay(expense.bill_date),
        dueDate: expense.due_date ? isoToDisplay(expense.due_date) : '',
        paymentMade: (expense.paid_amount_cents / 100).toFixed(2),
        paidInFull: expense.balance_cents <= 0
      });
    } else {
      setEditingId(null);
      setForm(blankFormFor('Electricity'));
    }
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
    setSavedFlash(false);
  }

  function onCategoryChange(category) {
    const def = categoryDef(category);
    const last = def.fixed ? lastAmountForCategory(category) : null;
    setForm(f => ({
      ...f,
      category,
      coverage: def.groups[0] || '',
      amount: !editingId && last != null ? (last / 100).toFixed(2) : f.amount
    }));
  }

  function fieldHint() {
    const def = categoryDef(form.category);
    if (def.fixed) return `Pre-filled from your last ${form.category} bill — change it if this month is different.`;
    if (form.category === 'Butane') return 'Logged on demand, whenever you buy a cylinder — no fixed monthly cadence.';
    return null;
  }

  const amountCentsPreview = Math.round(parseFloat(form.amount || '0') * 100);
  const paidCentsPreview = Math.round(parseFloat(form.paymentMade || '0') * 100);
  const balancePreview = Math.max(0, amountCentsPreview - paidCentsPreview);

  async function submitForm(addAnother = false) {
    const def = categoryDef(form.category);
    if (!isCompleteOrEmptyDate(form.billDate) || !form.billDate.trim()) {
      setFormError('Enter the bill date as MM/DD/YYYY.');
      return;
    }
    const billDate = displayToIso(form.billDate);
    if (!billDate) {
      setFormError('Enter the bill date as MM/DD/YYYY.');
      return;
    }
    if (form.dueDate.trim() && !isCompleteOrEmptyDate(form.dueDate)) {
      setFormError('Enter the due date as MM/DD/YYYY, or leave it blank.');
      return;
    }
    const dueDate = form.dueDate.trim() ? displayToIso(form.dueDate) : null;
    if (form.dueDate.trim() && !dueDate) {
      setFormError('Enter the due date as MM/DD/YYYY, or leave it blank.');
      return;
    }
    if (amountCentsPreview <= 0) {
      setFormError('Enter a bill amount greater than $0.');
      return;
    }

    const payload = {
      category: form.category,
      coverage: def.groups.length ? form.coverage || null : null,
      amountCents: amountCentsPreview,
      billDate,
      dueDate,
      paidAmountCents: form.paidInFull ? amountCentsPreview : paidCentsPreview
    };

    try {
      if (editingId) {
        await apiPatch(`/expenses/${editingId}`, payload);
      } else {
        await apiPost('/expenses', payload);
      }
      await refresh();
      if (addAnother && !editingId) {
        setForm(blankFormFor(form.category));
        setFormError(null);
        setSavedFlash(true);
      } else {
        closeForm();
      }
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function deleteExpense(id) {
    await apiDelete(`/expenses/${id}`);
    if (payingId === id) setPayingId(null);
    await refresh();
  }

  async function markPaid(id) {
    await apiPost(`/expenses/${id}/mark-paid`);
    await refresh();
  }

  async function confirmPayment(id) {
    const add = Math.round(parseFloat(payAmount || '0') * 100);
    if (add <= 0) return;
    await apiPost(`/expenses/${id}/payments`, { amountCents: add });
    setPayingId(null);
    setPayAmount('');
    await refresh();
  }

  function openTaxEdit() {
    if (!propertyTax) return;
    setTaxError(null);
    setTaxPaying(false);
    setTaxForm({
      remaining: (propertyTax.amount_cents / 100).toFixed(2),
      installment: (propertyTax.installment_cents / 100).toFixed(2),
      paid: (propertyTax.paid_amount_cents / 100).toFixed(2),
      behind: (propertyTax.behind_cents / 100).toFixed(2)
    });
    setTaxEditing(true);
  }

  function openTaxPay() {
    if (!propertyTax) return;
    setTaxError(null);
    setTaxEditing(false);
    setTaxPayAmount(((propertyTax.installment_cents || 0) / 100).toFixed(2));
    setTaxPaying(true);
  }

  async function saveTaxEdit() {
    if (!propertyTax) return;
    const remaining = Math.round(parseFloat(taxForm.remaining || '0') * 100);
    const installment = Math.round(parseFloat(taxForm.installment || '0') * 100);
    const paid = Math.round(parseFloat(taxForm.paid || '0') * 100);
    const behind = Math.round(parseFloat(taxForm.behind || '0') * 100);
    if (![remaining, installment, paid, behind].every(n => Number.isFinite(n) && n >= 0)) {
      setTaxError('Enter valid amounts for remaining, monthly payment, paid, and behind.');
      return;
    }
    try {
      await apiPatch(`/expenses/${propertyTax.id}`, {
        amountCents: remaining,
        installmentCents: installment,
        paidAmountCents: paid,
        behindCents: behind
      });
      setTaxEditing(false);
      setTaxError(null);
      await refresh();
    } catch (err) {
      setTaxError(err.message);
    }
  }

  async function confirmTaxPayment() {
    if (!propertyTax) return;
    const add = Math.round(parseFloat(taxPayAmount || '0') * 100);
    if (!Number.isFinite(add) || add <= 0) {
      setTaxError('Enter a payment amount greater than $0.');
      return;
    }
    try {
      await apiPost(`/expenses/${propertyTax.id}/payments`, { amountCents: add });
      setTaxPaying(false);
      setTaxPayAmount('');
      setTaxError(null);
      await refresh();
    } catch (err) {
      setTaxError(err.message);
    }
  }

  const loggableCategories = (categoriesConfig?.order || []).filter(
    c => !categoriesConfig?.categories?.[c]?.installment
  );

  if (!loaded) {
    return <div className="text-mutedfg text-[13px]">Loading expenses…</div>;
  }

  const def = categoryDef(form.category);
  const hint = fieldHint();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold m-0">Expenses</h2>
          <p className="text-[13px] text-mutedfg mt-1 mb-0">Building utility &amp; property bills</p>
        </div>
        <button type="button" onClick={() => openForm(null)} className={btnPrimary}>
          <IconPlus className="w-3.5 h-3.5" />
          Log a Bill
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] gap-4">
        <HudPanel className="p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary m-0 mb-3">
            {monthKeyLabel(selectedMonth)}{selectedCategory !== 'all' ? ` · ${selectedCategory}` : ''}
          </p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-mutedfg m-0 mb-2">Balance</p>
          <p className={`text-[32px] font-bold font-mono m-0 leading-none ${balanceTotal > 0 ? 'text-warning' : ''}`}>
            <AnimatedNumber value={balanceTotal} format={money} />
          </p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-mutedfg m-0 mt-4 mb-2">Total</p>
          <p className="text-[32px] font-bold font-mono m-0 leading-none">
            <AnimatedNumber value={total} format={money} />
          </p>
          <p className="text-[11.5px] text-mutedfg mt-3 mb-0">
            {visible.length} bill{visible.length === 1 ? '' : 's'}
            {withBalance.length > 0 ? ` · ${withBalance.length} still unpaid` : ' · all paid off'}
          </p>
        </HudPanel>

        <HudPanel accent="cyan" className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(categoriesConfig?.order || []).map(c => {
              const amt = byCategory[c] || 0;
              const active = selectedCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (c === 'Property Tax') {
                      setSelectedCategory('all');
                      openTaxEdit();
                      return;
                    }
                    setSelectedCategory(active ? 'all' : c);
                  }}
                  title={c === 'Property Tax' ? 'Open the overall Property Tax balance' : active ? 'Click to clear category filter' : `Click to filter by ${c}`}
                  className={`text-left rounded-lg border px-2.5 py-2 transition-colors duration-150 ${focusRing} ${
                    active ? 'border-primary bg-primary/10' : 'border-hud-cyan/30 bg-muted/40 hover:border-hud-cyan/60'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wide text-hud-cyan m-0 mb-1 truncate">{c}</p>
                  <p className={`text-[14px] font-bold font-mono m-0 ${amt === 0 ? 'text-mutedfg font-medium' : ''}`}>
                    {amt === 0 ? '—' : money(amt)}
                  </p>
                </button>
              );
            })}
          </div>
        </HudPanel>
      </div>

      {propertyTax && (
        <PropertyTaxCard
          tax={propertyTax}
          editing={taxEditing}
          paying={taxPaying}
          form={taxForm}
          payAmount={taxPayAmount}
          error={taxError}
          onFormChange={setTaxForm}
          onPayAmountChange={setTaxPayAmount}
          onEdit={openTaxEdit}
          onPay={openTaxPay}
          onCancel={() => { setTaxEditing(false); setTaxPaying(false); setTaxError(null); }}
          onSaveEdit={saveTaxEdit}
          onConfirmPay={confirmTaxPayment}
        />
      )}

      <HudPanel className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <IconAlert className={`w-4 h-4 ${billAlerts.length ? 'text-warning' : 'text-success'}`} />
          <h3 className={`text-[13px] font-bold m-0 tracking-[0.16em] uppercase ${billAlerts.length ? 'text-warning' : 'text-success'}`}>
            Bill Alerts
          </h3>
          {billAlerts.length > 0 && <span className="ml-auto font-mono text-[11px] text-mutedfg">{billAlerts.length}</span>}
        </div>
        {billAlerts.length === 0 ? (
          <p className="text-[12.5px] text-mutedfg m-0">No bills due soon — nothing needs attention.</p>
        ) : (
          <div className="space-y-1.5">
            {billAlerts.map(({ expense, tier, daysDiff }, idx) => {
              const style = TIER_STYLE[tier] || TIER_STYLE.soon;
              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => (isInstallment(expense) ? openTaxEdit() : openForm(expense))}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left bg-muted/40 border ${style.ring} hover:bg-muted/70 transition-colors duration-150 animate-row-in`}
                  style={{ animationDelay: `${idx * 45}ms` }}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-foreground truncate">
                      {expense.category}{expense.coverage ? ` · ${expense.coverage}` : ''}
                    </span>
                    <span className="block text-[10.5px] text-mutedfg font-mono">{money(expense.balance_cents)} balance</span>
                  </span>
                  <span className={`text-[11px] font-mono font-bold shrink-0 ${style.text}`}>
                    {billAlertLabel(tier, daysDiff, expense)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[10.5px] text-mutedfg mt-3 mb-0">
          Preview only for now — pushing this into a notification (dashboard bell / WhatsApp) is a later step.
        </p>
      </HudPanel>

      <HudPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${inputClass} font-mono`}>
              {months.map(k => (
                <option key={k} value={k}>{monthKeyLabel(k)}</option>
              ))}
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={inputClass}>
              <option value="all">All Categories</option>
              {loggableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {showForm && (
          <div className="p-4 border-b border-border bg-muted/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Category</label>
                <select value={form.category} onChange={e => onCategoryChange(e.target.value)} className={inputClass}>
                  {loggableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {def.groups.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Coverage Group</label>
                  <select
                    value={form.coverage}
                    onChange={e => setForm(f => ({ ...f, coverage: e.target.value }))}
                    className={inputClass}
                  >
                    {def.groups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Bill Amount (BZ$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={`${inputClass} font-mono`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Bill Date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/DD/YYYY"
                  value={form.billDate}
                  onChange={e => setForm(f => ({ ...f, billDate: formatDateInput(e.target.value) }))}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Due Date (optional)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/DD/YYYY"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: formatDateInput(e.target.value) }))}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">Payment Made (BZ$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.paymentMade}
                  onChange={e => setForm(f => ({ ...f, paymentMade: e.target.value, paidInFull: false }))}
                  className={`${inputClass} font-mono`}
                  placeholder="0.00"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12.5px] text-foreground cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.paidInFull}
                onChange={e => {
                  const checked = e.target.checked;
                  setForm(f => ({ ...f, paidInFull: checked, paymentMade: checked ? (f.amount || '0') : '0.00' }));
                }}
              />
              Paid in full
            </label>

            {hint && <p className="text-[11px] text-mutedfg mb-2">{hint}</p>}
            <p className="text-[12px] font-mono mb-2">
              {amountCentsPreview > 0 && (
                balancePreview <= 0
                  ? <span className="text-mutedfg">Balance: $0.00 — this will be marked Paid.</span>
                  : <>Balance remaining: <span className="text-warning font-semibold">{money(balancePreview)}</span></>
              )}
            </p>
            <p className="text-[11px] text-mutedfg mb-3">Leave Payment Made at $0 to log a bill as unpaid.</p>

            {formError && <p className="text-[12px] text-destructive mb-2">{formError}</p>}
            {savedFlash && <p className="text-[12px] text-success mb-2">✓ Bill saved — form ready for the next one.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className={btnSecondary}>Cancel</button>
              {!editingId && (
                <button type="button" onClick={() => submitForm(true)} className={btnSecondary}>
                  <IconPlus className="w-3.5 h-3.5" />
                  Save &amp; Add Another
                </button>
              )}
              <button type="button" onClick={() => submitForm(false)} className={btnPrimary}>
                <IconCheck className="w-3.5 h-3.5" />
                Save Bill
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-mutedfg border-b border-border">
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Bill Date</th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Category</th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Covers</th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Amount</th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Balance</th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Due Date</th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">Status</th>
                <th className="px-3.5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3.5 py-8 text-center text-mutedfg">
                    {expenses.filter(e => !isInstallment(e)).length === 0
                      ? 'No bills logged yet — click "Log a Bill" above.'
                      : selectedCategory === 'Property Tax'
                        ? 'Property Tax is the overall balance in the card above — it is not a monthly bill.'
                        : 'No bills match this month/category filter.'}
                  </td>
                </tr>
              )}
              {sorted.map(e => (
                <FragmentRow
                  key={e.id}
                  expense={e}
                  isPaying={payingId === e.id}
                  payAmount={payAmount}
                  onPayAmountChange={setPayAmount}
                  onTogglePay={() => {
                    setPayingId(payingId === e.id ? null : e.id);
                    setPayAmount('');
                  }}
                  onConfirmPay={() => confirmPayment(e.id)}
                  onMarkPaid={() => markPaid(e.id)}
                  onEdit={() => openForm(e)}
                  onDelete={() => deleteExpense(e.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </HudPanel>
    </div>
  );
}

function PropertyTaxCard({
  tax, editing, paying, form, payAmount, error,
  onFormChange, onPayAmountChange, onEdit, onPay, onCancel, onSaveEdit, onConfirmPay
}) {
  const fields = [
    ['remaining', 'Remaining'],
    ['installment', 'Monthly payment'],
    ['paid', 'Paid towards'],
    ['behind', 'Behind']
  ];

  return (
    <HudPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary m-0 mb-1">Property Tax</p>
          <p className="text-[13px] text-mutedfg m-0">Overall balance — not a monthly bill. Behind rises by the monthly payment each new month you don’t pay.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tax.amount_cents > 0 && (
            <button type="button" onClick={onPay} className={btnPrimary}>Pay towards</button>
          )}
          <button type="button" onClick={onEdit} className={btnSecondary}>Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TaxStat label="Remaining" value={tax.amount_cents} />
        <TaxStat label="Monthly payment" value={tax.installment_cents} />
        <TaxStat label="Paid towards" value={tax.paid_amount_cents} />
        <TaxStat label="Behind" value={tax.behind_cents} warn={tax.behind_cents > 0} />
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {fields.map(([key, label]) => (
              <div key={key}>
                <label className="text-[11px] font-bold uppercase tracking-wide text-mutedfg block mb-1">{label} (BZ$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form[key]}
                  onChange={e => onFormChange(f => ({ ...f, [key]: e.target.value }))}
                  className={`${inputClass} font-mono`}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-[12px] text-destructive mb-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
            <button type="button" onClick={onSaveEdit} className={btnPrimary}>
              <IconCheck className="w-3.5 h-3.5" />
              Save Property Tax
            </button>
          </div>
        </div>
      )}

      {paying && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-mutedfg">
              Pay towards remaining {money(tax.amount_cents)}
              {tax.behind_cents > 0 ? ` · behind ${money(tax.behind_cents)}` : ''}:
            </span>
            <input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={e => onPayAmountChange(e.target.value)}
              className={`${inputClass} font-mono w-[120px]`}
              onKeyDown={e => { if (e.key === 'Enter') onConfirmPay(); }}
            />
            <button type="button" onClick={onConfirmPay} className={btnPrimary}>Add payment</button>
            <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
          </div>
          {error && <p className="text-[12px] text-destructive mt-2 mb-0">{error}</p>}
        </div>
      )}
    </HudPanel>
  );
}

function TaxStat({ label, value, warn = false }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-mutedfg m-0 mb-1">{label}</p>
      <p className={`text-[18px] font-bold font-mono m-0 ${warn ? 'text-warning' : ''}`}>{money(value || 0)}</p>
    </div>
  );
}

function FragmentRow({ expense: e, isPaying, payAmount, onPayAmountChange, onTogglePay, onConfirmPay, onMarkPaid, onEdit, onDelete }) {
  return (
    <>
      <tr className="border-b border-border/60 align-top">
        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">{isoToDisplay(e.bill_date)}</td>
        <td className="px-3.5 py-2.5 whitespace-nowrap">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-hud-cyan/12 text-hud-cyan ring-1 ring-inset ring-hud-cyan/30">
            {e.category}
          </span>
        </td>
        <td className="px-3.5 py-2.5 text-mutedfg">{e.coverage || 'Whole building'}</td>
        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">{money(e.amount_cents)}</td>
        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
          {e.balance_cents <= 0 ? (
            <span className="text-mutedfg">—</span>
          ) : (
            <span className={e.status === 'overdue' ? 'text-destructive font-semibold' : 'text-warning font-semibold'}>
              {money(e.balance_cents)}
            </span>
          )}
        </td>
        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
          {e.due_date ? (
            <span className={e.due_tier === 'overdue' ? 'text-destructive font-semibold' : e.due_tier ? 'text-warning font-semibold' : ''}>
              {isoToDisplay(e.due_date)}
            </span>
          ) : (
            <span className="text-mutedfg">—</span>
          )}
        </td>
        <td className="px-3.5 py-2.5"><BillStatusPill status={e.status} /></td>
        <td className="px-3.5 py-2.5">
          <div className="flex flex-wrap justify-end gap-1.5">
            {e.balance_cents > 0 && (
              <button type="button" onClick={onTogglePay} className={`${btnSecondary} px-2 py-1 text-[11px]`}>
                Pay
              </button>
            )}
            {e.balance_cents > 0 && (
              <button type="button" onClick={onMarkPaid} className={`${btnSecondary} px-2 py-1 text-[11px]`}>
                Mark Paid
              </button>
            )}
            <button type="button" onClick={onEdit} className={`${btnSecondary} px-2 py-1 text-[11px]`}>
              Edit
            </button>
            <button type="button" onClick={onDelete} className={`${btnSecondary} px-2 py-1 text-[11px] hover:text-destructive hover:border-destructive/50`}>
              Delete
            </button>
          </div>
        </td>
      </tr>
      {isPaying && (
        <tr className="bg-hud-cyan/5 border-b border-border/60">
          <td colSpan={8} className="px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-mutedfg">
                Add payment toward <strong className="text-foreground">{e.category}{e.coverage ? ` · ${e.coverage}` : ''}</strong> (balance {money(e.balance_cents)}):
              </span>
              <input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={ev => onPayAmountChange(ev.target.value)}
                placeholder="0.00"
                className={`${inputClass} font-mono w-[110px]`}
                onKeyDown={ev => { if (ev.key === 'Enter') onConfirmPay(); }}
              />
              <button type="button" onClick={onConfirmPay} className={`${btnPrimary} px-3 py-1.5 text-[11.5px]`}>Add Payment</button>
              <button type="button" onClick={onTogglePay} className={`${btnSecondary} px-3 py-1.5 text-[11.5px]`}>Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
