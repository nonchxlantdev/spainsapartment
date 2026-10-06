// apps/web/src/components/RentStatusTable.jsx
import StatusPill from './StatusPill.jsx';
import { cardClass, focusRing } from '../ui.js';

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })} BZ`;
}

function rowProps(t, onSelectTenant) {
  return {
    tabIndex: 0,
    role: 'button',
    onClick: () => onSelectTenant(t.id),
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectTenant(t.id);
      }
    }
  };
}

export default function RentStatusTable({ tenants, onSelectTenant }) {
  if (!tenants.length) {
    return (
      <div className="p-8 text-center text-mutedfg text-sm">
        No tenants to display for this month.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden divide-y divide-border">
        {tenants.map(t => (
          <div
            key={t.id}
            {...rowProps(t, onSelectTenant)}
            className={`p-4 hover:bg-muted cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:bg-muted ${focusRing}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-semibold text-[14px]">{t.name}</div>
                <div className="text-xs text-mutedfg mt-0.5">{t.unit_label}</div>
              </div>
              <StatusPill status={t.status} active={t.active} />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-mutedfg font-bold">Due</dt>
                <dd className="m-0">{t.due_day || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-mutedfg font-bold">Method</dt>
                <dd className="m-0">{t.payment_method || 'Not set'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10.5px] uppercase tracking-wide text-mutedfg font-bold">Amount</dt>
                <dd className="m-0 font-mono">
                  {t.status === 'free' ? 'Free' : money(t.monthly_rent_cents)}
                  {t.pending_balance_cents > 0 && (
                    <span className="text-warning text-xs ml-1">
                      (+{money(t.pending_balance_cents)} pending)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-[11.5px] uppercase tracking-wide text-mutedfg text-left border-b border-border bg-muted/40">
              <th className="px-5 py-3 font-bold">Tenant</th>
              <th className="px-5 py-3 font-bold">Unit</th>
              <th className="px-5 py-3 font-bold">Due</th>
              <th className="px-5 py-3 font-bold">Amount</th>
              <th className="px-5 py-3 font-bold">Method</th>
              <th className="px-5 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr
                key={t.id}
                {...rowProps(t, onSelectTenant)}
                className="border-b border-border last:border-0 hover:bg-muted cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:bg-muted"
              >
                <td className="px-5 py-3.5 font-semibold">{t.name}</td>
                <td className="px-5 py-3.5">{t.unit_label}</td>
                <td className="px-5 py-3.5">{t.due_day || 'Not set'}</td>
                <td className="px-5 py-3.5 font-mono">
                  {t.status === 'free' ? 'Free' : money(t.monthly_rent_cents)}
                  {t.pending_balance_cents > 0 && (
                    <span className="text-warning text-xs ml-1">
                      (+{money(t.pending_balance_cents)} pending)
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">{t.payment_method || 'Not set'}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={t.status} active={t.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
