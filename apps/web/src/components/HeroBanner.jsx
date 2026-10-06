import { useEffect, useRef, useState } from 'react';
import { IconBell, IconCalendar, IconChevronDown, IconLogout, IconMoon, IconSearch, IconSun } from '../icons.jsx';
import { focusRing } from '../ui.js';
import { dueAlertLabel } from '../dueAlerts.js';

const TIER_STYLE = {
  overdue: { dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]', text: 'text-red-300' },
  today: { dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]', text: 'text-amber-300' },
  soon: { dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]', text: 'text-cyan-300' }
};

function formatToday() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function HeroBanner({ stats, onComingSoon, theme, onToggleTheme, dueAlerts = [], onSelectTenant, onLogout }) {
  const [scanQuery, setScanQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const adminName = 'Admin';
  const adminBadge = initials("Spain's Apartment");
  const isDark = theme !== 'light';
  const alertCount = dueAlerts.length;

  useEffect(() => {
    if (!notifOpen) return undefined;
    function onDocClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [notifOpen]);

  function selectAlert(tenantId) {
    setNotifOpen(false);
    onSelectTenant?.(tenantId);
  }

  return (
    <header className="sticky top-0 z-10 px-4 md:px-6 lg:px-7 py-3 bg-hud-panel border-b border-amber-500/40 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.35)]">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-bold tracking-wide text-foreground m-0 uppercase">
              Building Control
            </h1>
            <p className="text-[11px] text-mutedfg m-0 font-mono">
              {stats.floors}F · {stats.units}U · {stats.family} family · {stats.vacant} vacant
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-9 h-9 inline-flex items-center justify-center border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors duration-150 ${focusRing}`}
          >
            {isDark ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-mono text-foreground border border-cyan-400/35 bg-muted/80 shadow-[0_0_12px_-4px_rgba(34,211,238,0.35)]">
            <IconCalendar className="w-3.5 h-3.5 text-cyan-400" />
            {formatToday()}
          </span>

          <div className="relative min-w-[180px] max-w-[320px] flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/80" />
            <input
              value={scanQuery}
              onChange={e => setScanQuery(e.target.value)}
              placeholder="Search tenants, units, or status..."
              aria-label="Search tenants, units, or status"
              className="hud-scan-input"
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(v => !v)}
              title={alertCount > 0 ? `${alertCount} rent alert${alertCount === 1 ? '' : 's'}` : 'No rent alerts'}
              aria-label={alertCount > 0 ? `${alertCount} rent alerts` : 'No rent alerts'}
              aria-expanded={notifOpen}
              className={`relative w-9 h-9 inline-flex items-center justify-center border transition-colors duration-150 ${focusRing} ${
                alertCount > 0
                  ? 'border-amber-500/60 text-amber-500 hover:bg-amber-500/10'
                  : 'border-cyan-400/40 text-cyan-400/80 hover:opacity-100 opacity-70'
              }`}
            >
              <IconBell className="w-4 h-4" />
              {alertCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold font-mono inline-flex items-center justify-center shadow-[0_0_8px_rgba(248,113,113,0.7)]">
                  {alertCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-[300px] max-w-[calc(100vw-2rem)] hud-panel-cyan p-0 overflow-hidden z-30">
                <div className="px-3.5 py-2.5 border-b border-cyan-400/20">
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-400 uppercase m-0">Rent Alerts</p>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {alertCount === 0 && (
                    <p className="px-3.5 py-4 text-[12.5px] text-mutedfg m-0">All rents on track — nothing due soon.</p>
                  )}
                  {dueAlerts.map(({ tenant, tier, daysDiff }) => {
                    const style = TIER_STYLE[tier] || TIER_STYLE.soon;
                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => selectAlert(tenant.id)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left border-b border-cyan-400/10 last:border-0 hover:bg-cyan-400/5"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-semibold text-foreground truncate">{tenant.name}</span>
                          <span className="block text-[11px] text-mutedfg font-mono">{tenant.unit_label || '—'}</span>
                        </span>
                        <span className={`text-[11px] font-mono font-bold shrink-0 ${style.text}`}>
                          {dueAlertLabel({ tier, daysDiff })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 text-[12px] text-foreground border border-cyan-400/50 bg-muted/60 shadow-[0_0_14px_-6px_rgba(34,211,238,0.5)]">
            <span className="w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400 text-cyan-400 text-[10px] font-bold inline-flex items-center justify-center font-mono">
              {adminBadge}
            </span>
            {adminName}
            <IconChevronDown className="w-3.5 h-3.5 text-mutedfg" />
          </span>

          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className={`w-9 h-9 inline-flex items-center justify-center border border-amber-500/25 text-mutedfg hover:text-amber-500 hover:border-amber-500/60 transition-colors duration-150 ${focusRing}`}
          >
            <IconLogout className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
