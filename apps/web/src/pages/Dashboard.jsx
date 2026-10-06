import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../api.js';
import StatusPill from '../components/StatusPill.jsx';
import {
  IconAlert,
  IconBuilding,
  IconChat,
  IconClock,
  IconDollar,
  IconDots,
  IconDoor,
  IconEye,
  IconFilter,
  IconPlane,
  IconPlus,
  IconSearch,
  IconTenants
} from '../icons.jsx';
import { btnPrimary, cardClass, focusRing } from '../ui.js';
import AddTenantForm from '../components/AddTenantForm.jsx';
import HudPanel from '../components/HudPanel.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import { useMountedPct } from '../hooks.js';
import { dueAlertLabel } from '../dueAlerts.js';

const DUE_TIER_STYLE = {
  overdue: {
    ring: 'border-red-400/50',
    dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
    text: 'text-red-300'
  },
  today: {
    ring: 'border-amber-400/50',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    text: 'text-amber-300'
  },
  soon: {
    ring: 'border-cyan-400/50',
    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    text: 'text-cyan-300'
  }
};

function DueAlertsPanel({ dueAlerts, onSelectTenant }) {
  const overdueCount = dueAlerts.filter(a => a.tier === 'overdue').length;
  const badgeClass = overdueCount > 0 ? 'text-red-400' : dueAlerts.length > 0 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <HudPanel className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <IconAlert className={`w-4 h-4 ${badgeClass}`} />
        <h3 className={`text-[14px] font-bold m-0 tracking-[0.18em] uppercase ${badgeClass}`}>Due Alerts</h3>
        {dueAlerts.length > 0 && (
          <span className="ml-auto font-mono text-[11px] text-mutedfg">{dueAlerts.length}</span>
        )}
      </div>
      {dueAlerts.length === 0 ? (
        <p className="text-[12.5px] text-mutedfg m-0">All rents on track — nothing due soon.</p>
      ) : (
        <div className="space-y-1.5">
          {dueAlerts.map(({ tenant, tier, daysDiff }, idx) => {
            const style = DUE_TIER_STYLE[tier] || DUE_TIER_STYLE.soon;
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => onSelectTenant?.(tenant.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left bg-muted/40 border ${style.ring} hover:bg-muted/70 transition-colors duration-150 animate-row-in`}
                style={{ animationDelay: `${idx * 45}ms` }}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-foreground truncate">{tenant.name}</span>
                  <span className="block text-[10.5px] text-mutedfg font-mono">{tenant.unit_label || '—'}</span>
                </span>
                <span className={`text-[11px] font-mono font-bold shrink-0 ${style.text}`}>
                  {dueAlertLabel({ tier, daysDiff })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </HudPanel>
  );
}

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function monthLabel(date = new Date()) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function formatRelativeTime(ts) {
  const date = new Date(String(ts).replace(' ', 'T') + 'Z');
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays <= 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}, ${time}`;
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'partial', label: 'Partial' },
  { id: 'free', label: 'No rent' }
];

function CollectionMeter({ collectedCents, expectedCents, outstandingCents, monthLabel: label }) {
  const pct = expectedCents > 0 ? Math.min(100, Math.round((collectedCents / expectedCents) * 100)) : 0;
  const barPct = useMountedPct(pct);
  return (
    <HudPanel className="p-5 h-full">
      <p className="text-[11px] font-semibold tracking-[0.28em] text-amber-500 uppercase m-0">Monthly Collection</p>
      <p className="text-[12px] text-mutedfg mt-1 mb-4">{label} rent. Payments from earlier months are not included.</p>
      <p className="font-mono text-[28px] sm:text-[34px] font-bold leading-none m-0">
        <span className="text-amber-500"><AnimatedNumber value={collectedCents} format={money} /></span>
        <span className="text-mutedfg text-[22px] sm:text-[26px]"> / {money(expectedCents)}</span>
      </p>

      <div className="relative mt-5 mb-4">
        <div className="h-4 bg-muted border border-amber-500/20 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.55)] transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${barPct}%` }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-hud-shimmer"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 flex justify-between px-[1px]" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <span key={i} className="w-px h-full bg-cyan-400/25" />
          ))}
        </div>
        <span
          className="absolute -top-1 font-mono text-[11px] font-bold text-[#0B1220] bg-amber-500 px-1.5 py-0.5 shadow-hud-amber transition-all duration-700 ease-out"
          style={{ left: `min(calc(${barPct}% - 18px), calc(100% - 42px))` }}
        >
          <AnimatedNumber value={pct} />%
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <span className="font-mono text-amber-500"><AnimatedNumber value={collectedCents} format={money} /></span> Collected
        </span>
        <span className="font-mono text-mutedfg"><AnimatedNumber value={pct} />% of expected</span>
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]" />
          <span className="font-mono text-orange-400"><AnimatedNumber value={outstandingCents} format={money} /></span> Remaining
        </span>
      </div>
    </HudPanel>
  );
}

function OccupancyRadar({ occupied, total, vacant, rentFree, percent }) {
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 72;
  const progressR = 58;
  const circumference = 2 * Math.PI * progressR;
  const animatedPercent = useMountedPct(percent);
  const dash = (Math.min(100, animatedPercent) / 100) * circumference;
  const markers = [0, 60, 120, 180, 240, 300];

  return (
    <HudPanel accent="cyan" className="p-5 h-full">
      <p className="text-[11px] font-semibold tracking-[0.28em] text-cyan-400 uppercase m-0 mb-3">Occupancy Radar</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative shrink-0">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full animate-hud-sweep"
            style={{
              background: 'conic-gradient(from 0deg, rgba(34,211,238,0.22), transparent 35%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 63%, black 78%, transparent 79%)',
              maskImage: 'radial-gradient(circle, transparent 62%, black 63%, black 78%, transparent 79%)'
            }}
          />
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="relative">
            <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={progressR + 8} fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx={cx} cy={cy} r={progressR} fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="8" />
            <circle
              cx={cx}
              cy={cy}
              r={progressR}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="8"
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                strokeDasharray: `${dash} ${circumference}`,
                transition: 'stroke-dasharray 0.8s ease-out',
                filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.65))'
              }}
            />
            {markers.map((deg, idx) => {
              const rad = ((deg - 90) * Math.PI) / 180;
              const x = cx + outerR * Math.cos(rad);
              const y = cy + outerR * Math.sin(rad);
              return (
                <circle
                  key={deg}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#22D3EE"
                  opacity="0.7"
                  className="animate-hud-pulse-dot"
                  style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${idx * 260}ms` }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="font-mono text-[22px] font-bold text-foreground m-0 leading-none">
              <AnimatedNumber value={occupied} /> / {total}
            </p>
            <p className="text-[11px] text-mutedfg m-0 mt-1 uppercase tracking-wider">Occupied</p>
            <p className="font-mono text-[13px] text-cyan-400 m-0"><AnimatedNumber value={Math.round(percent)} />%</p>
          </div>
        </div>
        <div className="space-y-2 text-[12px] w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            <span className="text-mutedfg">Occupied</span>
            <span className="font-mono text-foreground ml-auto"><AnimatedNumber value={occupied} /></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-mutedfg">Vacant</span>
            <span className="font-mono text-foreground ml-auto"><AnimatedNumber value={vacant} /></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.7)]" />
            <span className="text-mutedfg">Rent-free</span>
            <span className="font-mono text-foreground ml-auto"><AnimatedNumber value={rentFree} /></span>
          </div>
        </div>
      </div>
    </HudPanel>
  );
}

function LeaseStatusDonut({ counts, total }) {
  const segments = [
    { key: 'paid', color: '#4ADE80', count: counts.paid },
    { key: 'pending', color: '#60A5FA', count: counts.pending },
    { key: 'partial', color: '#FBBF24', count: counts.partial },
    { key: 'free', color: '#2DD4BF', count: counts.free }
  ];
  const sum = segments.reduce((a, s) => a + s.count, 0) || 1;
  const size = 120;
  const r = 42;
  const c = 2 * Math.PI * r;
  const reveal = useMountedPct(1, 80);
  let offset = 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(138,160,191,0.2)" strokeWidth="12" />
          {segments.map((seg, idx) => {
            const len = (seg.count / sum) * c * reveal;
            const el = (
              <circle
                key={seg.key}
                cx={60}
                cy={60}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                transform="rotate(-90 60 60)"
                style={{
                  strokeDasharray: `${len} ${c - len}`,
                  strokeDashoffset: -offset,
                  transition: 'stroke-dasharray 0.7s ease-out',
                  transitionDelay: `${idx * 90}ms`
                }}
              />
            );
            offset += (seg.count / sum) * c;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-[22px] font-bold text-foreground m-0 leading-none"><AnimatedNumber value={total} /></p>
          <p className="text-[9px] uppercase tracking-wider text-mutedfg m-0">Leases</p>
        </div>
      </div>
      <div className="space-y-1.5 text-[11px] flex-1">
        {[
          { label: 'Paid', count: counts.paid, color: 'bg-emerald-400' },
          { label: 'Pending', count: counts.pending, color: 'bg-blue-400' },
          { label: 'Partial', count: counts.partial, color: 'bg-amber-400' },
          { label: 'No rent', count: counts.free, color: 'bg-teal-400' }
        ].map(row => (
          <div key={row.label} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${row.color}`} />
            <span className="text-mutedfg">{row.label}</span>
            <span className="font-mono text-foreground ml-auto"><AnimatedNumber value={row.count} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ onSelectTenant, onGoTenants, onGoPayments, sessionStartedAt, onComingSoon, dueAlerts = [] }) {
  const [summary, setSummary] = useState(null);
  const [units, setUnits] = useState([]);
  const [recent, setRecent] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);
  const [showFormer, setShowFormer] = useState(false);
  const [adding, setAdding] = useState(false);

  function reload() {
    return Promise.all([apiGet('/dashboard'), apiGet('/units'), apiGet('/payments/recent?limit=4')])
      .then(([dash, unitsData, recentData]) => {
        setSummary(dash);
        setUnits(unitsData);
        const since = new Date(sessionStartedAt || 0).getTime();
        const fresh = recentData.filter(item => {
          const createdAt = new Date(String(item.created_at).replace(' ', 'T') + 'Z').getTime();
          return Number.isFinite(createdAt) && createdAt >= since;
        });
        setRecent(fresh);
      });
  }

  useEffect(() => {
    reload().catch(err => setError(err.message));
  }, [sessionStartedAt]);

  const baseTenants = useMemo(() => {
    if (!summary) return [];
    return summary.tenants.filter(t => (showFormer ? true : t.active !== 0));
  }, [summary, showFormer]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0, paid: 0, pending: 0, partial: 0, free: 0 };
    for (const t of baseTenants) {
      if (t.active === 0) continue;
      counts.all += 1;
      if (t.status === 'paid') counts.paid += 1;
      else if (t.status === 'pending') counts.pending += 1;
      else if (t.status === 'partial') counts.partial += 1;
      else if (t.status === 'free' || t.is_rent_free) counts.free += 1;
    }
    return counts;
  }, [baseTenants]);

  const filteredTenants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseTenants.filter(t => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'free') {
          if (!(t.status === 'free' || t.is_rent_free)) return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      return [t.name, t.unit_label, t.status].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [baseTenants, query, statusFilter]);

  if (error) return <div className={`${cardClass} p-6 text-destructive`}>Could not load dashboard: {error}</div>;
  if (!summary) return <div className={`${cardClass} p-6 text-mutedfg`}>Loading dashboard...</div>;

  const unitCount = units.length || 11;
  const activeTenants = summary.tenants.filter(t => t.active !== 0);
  const rentFreeCount = activeTenants.filter(t => t.is_rent_free || t.status === 'free').length;
  // "Occupied" means the unit has someone living in it — a paying tenant, a
  // rent-free tenant (e.g. family), or the owner's own residence — not just
  // paying tenants. Vacant is whatever's left.
  const occupiedUnitIds = new Set(activeTenants.map(t => t.unit_id));
  const ownerResidenceCount = units.filter(u => u.is_owner_residence).length;
  const occupiedCount = occupiedUnitIds.size + ownerResidenceCount;
  const vacantCount = Math.max(0, unitCount - occupiedCount);
  const occupancyPercent = unitCount > 0 ? (occupiedCount / unitCount) * 100 : 0;
  const month = monthLabel();
  const leaseCounts = {
    paid: activeTenants.filter(t => t.status === 'paid').length,
    pending: activeTenants.filter(t => t.status === 'pending').length,
    partial: activeTenants.filter(t => t.status === 'partial').length,
    free: rentFreeCount
  };

  return (
    <div>
      {adding && (
        <AddTenantForm
          onCancel={() => setAdding(false)}
          onCreated={tenant => {
            setAdding(false);
            reload().then(() => onSelectTenant?.(tenant.id));
          }}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="xl:col-span-2 animate-row-in" style={{ animationDelay: '0ms' }}>
          <CollectionMeter
            collectedCents={summary.collectedCents}
            expectedCents={summary.expectedCents}
            outstandingCents={summary.outstandingCents}
            monthLabel={summary.monthLabel || month}
          />
        </div>
        <div className="animate-row-in" style={{ animationDelay: '60ms' }}>
          <OccupancyRadar
            occupied={occupiedCount}
            total={unitCount}
            vacant={vacantCount}
            rentFree={rentFreeCount}
            percent={occupancyPercent}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
        <section className="overflow-hidden animate-row-in" style={{ animationDelay: '120ms' }}>
          <HudPanel className="overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full border border-amber-500/50 text-amber-500 bg-amber-500/10 inline-flex items-center justify-center shadow-hud-amber">
                <IconTenants className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold m-0 text-foreground">{month} Rent Status</h2>
                <p className="text-xs text-mutedfg m-0">Click a tenant to open their profile</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative min-w-[220px] max-w-full flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/80" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search tenants, unit or status..."
                  className="hud-scan-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFormer(v => !v)}
                title={showFormer ? 'Hide former tenants' : 'Show former tenants'}
                className={`h-9 px-3 border text-[12px] font-semibold inline-flex items-center gap-1.5 ${focusRing} ${
                  showFormer
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-500'
                    : 'border-cyan-400/30 text-mutedfg hover:border-cyan-400/60 hover:text-foreground'
                }`}
              >
                <IconFilter className="w-3.5 h-3.5" />
                {showFormer ? 'Former on' : 'Former'}
              </button>
              <button type="button" onClick={() => setAdding(true)} className={`${btnPrimary} h-9`}>
                <IconPlus className="w-3.5 h-3.5" /> Add Tenant
              </button>
            </div>
          </div>

          <div className="px-4 py-2.5 flex flex-wrap gap-2 border-b border-amber-500/15">
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f.id;
              const n = statusCounts[f.id] ?? 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${focusRing} ${
                    active
                      ? 'bg-amber-500 text-[#0B1220] shadow-hud-amber'
                      : 'border border-amber-500/30 text-mutedfg hover:text-foreground hover:border-amber-500/50'
                  }`}
                >
                  {f.label} <span className="font-mono">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-mutedfg border-b border-amber-500/20 bg-muted/40">
                  <th className="px-4 py-2.5 text-left">#</th>
                  <th className="px-4 py-2.5 text-left">Tenant</th>
                  <th className="px-4 py-2.5 text-left">Unit</th>
                  <th className="px-4 py-2.5 text-left">Due Date</th>
                  <th className="px-4 py-2.5 text-left">Amount</th>
                  <th className="px-4 py-2.5 text-left">Method</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody key={`${statusFilter}::${query}::${showFormer}`}>
                {filteredTenants.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTenant(t.id)}
                    className="border-b border-amber-500/10 last:border-0 hover:bg-cyan-400/5 cursor-pointer animate-row-in"
                    style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}
                  >
                    <td className="px-4 py-3 font-mono text-mutedfg">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2.5">
                        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-500 rounded-full w-7 h-7 text-[11px] font-bold inline-flex items-center justify-center font-mono">
                          {t.name.split(/\s+/).map(w => w[0]).slice(0, 1)}
                        </div>
                        <span className="font-semibold text-foreground">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{t.unit_label || '—'}</td>
                    <td className="px-4 py-3 font-mono">{t.due_day || 'Not set'}</td>
                    <td className="px-4 py-3 font-mono">
                      {t.status === 'free' ? 'Free' : money(t.monthly_rent_cents)}
                      {t.pending_balance_cents > 0 && (
                        <span className="text-warning text-xs ml-1">(+{money(t.pending_balance_cents)} pending)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{t.payment_method || 'N/A'}</td>
                    <td className="px-4 py-3"><StatusPill status={t.status} active={t.active} /></td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onSelectTenant(t.id);
                          }}
                          title="Open tenant profile"
                          aria-label="Open tenant profile"
                          className={`w-7 h-7 border border-cyan-400/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-400/10 ${focusRing} inline-flex items-center justify-center`}
                        >
                          <IconEye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onComingSoon?.('Message'); }}
                          title="Message — not built yet"
                          aria-label="Message (not built yet)"
                          className="w-7 h-7 border border-amber-500/20 text-mutedfg opacity-50 hover:opacity-80 transition-opacity duration-150 inline-flex items-center justify-center"
                        >
                          <IconChat className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onComingSoon?.('More options'); }}
                          title="More options — not built yet"
                          aria-label="More options (not built yet)"
                          className="w-7 h-7 border border-amber-500/20 text-mutedfg opacity-50 hover:opacity-80 transition-opacity duration-150 inline-flex items-center justify-center"
                        >
                          <IconDots className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-mutedfg text-sm">
                      No tenants match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </HudPanel>
        </section>

        <aside className="space-y-4">
          <div className="animate-row-in" style={{ animationDelay: '140ms' }}>
            <DueAlertsPanel dueAlerts={dueAlerts} onSelectTenant={onSelectTenant} />
          </div>

          <HudPanel className="p-4 animate-row-in" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <IconClock className="w-4 h-4 text-amber-500" />
              <h3 className="text-[14px] font-bold m-0 tracking-[0.18em] uppercase text-amber-500">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onGoPayments || onGoTenants}
                className="p-2.5 bg-muted/60 border border-emerald-400/40 text-left hover:bg-emerald-500/10 transition-colors shadow-[0_0_16px_-8px_rgba(52,211,153,0.5)]"
                title="Open Payments to record this month"
              >
                <span className="w-7 h-7 rounded-full border border-emerald-400/70 text-emerald-400 bg-emerald-500/10 inline-flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                  <IconDollar className="w-3.5 h-3.5" />
                </span>
                <p className="text-[12px] font-semibold m-0 text-foreground">Record Payment</p>
                <p className="text-[10.5px] text-mutedfg m-0.5">Opens Payments</p>
              </button>
              <button
                type="button"
                onClick={() => onComingSoon?.('Add Tenant')}
                title="Add Tenant — not built yet"
                className="p-2.5 bg-muted/40 border border-amber-500/30 text-left opacity-55 hover:opacity-80 transition-opacity duration-150"
              >
                <span className="w-7 h-7 rounded-full border border-amber-500/50 text-amber-500 inline-flex items-center justify-center mb-2">
                  <IconTenants className="w-3.5 h-3.5" />
                </span>
                <p className="text-[12px] font-semibold m-0">Add Tenant</p>
                <p className="text-[10.5px] text-mutedfg m-0.5">Coming soon</p>
              </button>
              <button
                type="button"
                onClick={() => onComingSoon?.('Add Unit')}
                title="Add Unit — not built yet"
                className="p-2.5 bg-muted/40 border border-cyan-400/30 text-left opacity-55 hover:opacity-80 transition-opacity duration-150"
              >
                <span className="w-7 h-7 rounded-full border border-cyan-400/50 text-cyan-400 inline-flex items-center justify-center mb-2">
                  <IconDoor className="w-3.5 h-3.5" />
                </span>
                <p className="text-[12px] font-semibold m-0">Add Unit</p>
                <p className="text-[10.5px] text-mutedfg m-0.5">Coming soon</p>
              </button>
              <button
                type="button"
                onClick={() => onComingSoon?.('Send Message')}
                title="Send Message — not built yet"
                className="p-2.5 bg-muted/40 border border-violet-400/40 text-left opacity-55 hover:opacity-80 transition-opacity duration-150"
              >
                <span className="w-7 h-7 rounded-full border border-violet-400/50 text-violet-300 inline-flex items-center justify-center mb-2">
                  <IconPlane className="w-3.5 h-3.5" />
                </span>
                <p className="text-[12px] font-semibold m-0">Send Message</p>
                <p className="text-[10.5px] text-mutedfg m-0.5">Coming soon</p>
              </button>
            </div>
          </HudPanel>

          <HudPanel accent="cyan" className="p-4 animate-row-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <IconBuilding className="w-4 h-4 text-cyan-400" />
              <h3 className="text-[14px] font-bold m-0 tracking-[0.18em] uppercase text-cyan-400">Lease Status</h3>
            </div>
            <LeaseStatusDonut counts={leaseCounts} total={summary.payingCount} />
          </HudPanel>

          <HudPanel className="p-4 animate-row-in" style={{ animationDelay: '240ms' }}>
            <h3 className="text-[14px] font-bold m-0 tracking-[0.18em] uppercase text-amber-500 mb-3">Units</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Occupied', value: occupiedCount, ring: 'border-emerald-400/50 text-emerald-400 shadow-[0_0_12px_-4px_rgba(52,211,153,0.55)]', Icon: IconTenants },
                { label: 'Vacant', value: vacantCount, ring: 'border-slate-400/50 text-slate-300', Icon: IconDoor },
                { label: 'Rent-Free', value: rentFreeCount, ring: 'border-blue-400/50 text-blue-300 shadow-[0_0_12px_-4px_rgba(96,165,250,0.5)]', Icon: IconBuilding }
              ].map(chip => (
                <div key={chip.label} className={`px-2 py-2.5 text-center bg-muted/50 border ${chip.ring}`}>
                  <chip.Icon className="w-3.5 h-3.5 mx-auto mb-1" />
                  <p className="font-mono text-[18px] font-bold m-0 leading-none"><AnimatedNumber value={chip.value} /></p>
                  <p className="text-[9px] uppercase tracking-wide text-mutedfg m-0 mt-1">{chip.label}</p>
                </div>
              ))}
            </div>
          </HudPanel>

          <HudPanel className="p-4 animate-row-in" style={{ animationDelay: '280ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconClock className="w-4 h-4 text-amber-500" />
                <h3 className="text-[14px] font-bold m-0 tracking-[0.18em] uppercase text-amber-500">Recent Activity</h3>
              </div>
              <button
                type="button"
                onClick={() => onComingSoon?.('Activity log')}
                title="Activity log — not built yet"
                className="text-xs text-mutedfg opacity-60 hover:opacity-90 transition-opacity duration-150"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recent.map((item, idx) => {
                const partial = item.pending_after_cents > 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 animate-row-in"
                    style={{ animationDelay: `${idx * 70}ms` }}
                  >
                    <span
                      className={`w-8 h-8 rounded-full inline-flex items-center justify-center border ${
                        partial
                          ? 'border-orange-400/60 text-orange-300 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                          : 'border-emerald-400/60 text-emerald-300 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                      }`}
                    >
                      <IconDollar className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] font-semibold m-0 text-foreground">{partial ? 'Partial payment' : 'Payment received'}</p>
                        <p className={`text-[12.5px] font-mono m-0 ${partial ? 'text-orange-300' : 'text-emerald-300'}`}>
                          {money(item.amount_cents)}
                        </p>
                      </div>
                      <p className="text-[11.5px] text-mutedfg m-0">{item.tenant_name} - {item.unit_label}</p>
                      <p className="text-[11px] text-mutedfg m-0.5 font-mono">{formatRelativeTime(item.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {recent.length === 0 && (
                <p className="text-xs text-mutedfg m-0">
                  No recent activity yet. Activity appears after new payments are recorded.
                </p>
              )}
            </div>
          </HudPanel>
        </aside>
      </div>

      <footer className="mt-6 px-1">
        <div className="flex items-center gap-3 text-mutedfg">
          <p className="m-0 text-[12px] uppercase tracking-[0.22em]">
            Spain&apos;s Apartment · Building Control
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-amber-500/50 to-transparent" />
          <span className="text-[11px] font-mono text-amber-500/80">OPS</span>
        </div>
      </footer>
    </div>
  );
}
