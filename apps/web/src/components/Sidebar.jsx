import {
  IconDashboard,
  IconTenants,
  IconBuilding,
  IconDoor,
  IconCard,
  IconReceipt,
  IconBarChart,
  IconEnvelope,
  IconGear
} from '../icons.jsx';
import logo from '../assets/logo.png';
import { focusRing } from '../ui.js';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard, enabled: true },
  { id: 'tenants', label: 'Tenants', Icon: IconTenants, enabled: true },
  { id: 'building', label: 'Building', Icon: IconBuilding, enabled: true },
  { id: 'units', label: 'Units', Icon: IconDoor, enabled: false },
  { id: 'payments', label: 'Payments', Icon: IconCard, enabled: true },
  { id: 'expenses', label: 'Expenses', Icon: IconReceipt, enabled: true },
  { id: 'reports', label: 'Reports', Icon: IconBarChart, enabled: false },
  { id: 'messages', label: 'Messages', Icon: IconEnvelope, enabled: false },
  { id: 'settings', label: 'Settings', Icon: IconGear, enabled: false }
];

export default function Sidebar({ activeTab, onSelectTab, onComingSoon }) {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-hud-bg border-r border-amber-500/25 z-20">
      <div className="w-full px-3 py-6 flex flex-col">
        <div className="text-center mb-7 px-2">
          <p className="text-[15px] font-semibold tracking-wide text-foreground m-0">Spain's Apartment</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-mutedfg mt-1 mb-0">Building control</p>
        </div>

        <nav className="space-y-2.5" aria-label="Primary">
          {ITEMS.map(({ id, label, Icon, enabled }, idx) => {
            const active = activeTab === id;
            const stagger = { animationDelay: `${idx * 45}ms` };
            if (!enabled) {
              return (
                <button
                  key={id}
                  type="button"
                  aria-disabled="true"
                  onClick={() => onComingSoon?.(label)}
                  title={`${label} — not built yet`}
                  style={stagger}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg opacity-45 hover:opacity-65 text-left transition-opacity duration-150 animate-row-in ${focusRing}`}
                >
                  <span className="w-11 h-11 rounded-full border border-slate-500/50 text-slate-400 inline-flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-mutedfg">{label}</span>
                </button>
              );
            }
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={active ? 'page' : undefined}
                style={stagger}
                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-all duration-150 animate-row-in ${focusRing} ${
                  active ? 'bg-amber-500/10' : 'hover:bg-foreground/5'
                }`}
              >
                <span
                  className={`w-11 h-11 rounded-full inline-flex items-center justify-center shrink-0 transition-all duration-150 ${
                    active
                      ? 'border-2 border-amber-500 text-amber-500 shadow-hud-nav bg-amber-500/10'
                      : 'border border-cyan-400/35 text-cyan-400/80 hover:border-cyan-400/70 hover:text-cyan-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    active ? 'text-amber-500' : 'text-mutedfg group-hover:text-foreground'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 text-center px-2">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mb-4" />
          <img src={logo} alt="Spain's Apartment logo" className="w-[104px] h-[104px] object-contain mx-auto mb-2" />
          <p className="text-[10px] tracking-[0.28em] text-mutedfg uppercase m-0">Ops · Units · Ledgers</p>
        </div>
      </div>
    </aside>
  );
}
