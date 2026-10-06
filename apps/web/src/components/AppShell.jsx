// apps/web/src/components/AppShell.jsx
import logo from '../assets/logo.png';
import { IconDashboard, IconTenants, IconBuilding, IconReceipt } from '../icons.jsx';
import { focusRing } from '../ui.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'tenants', label: 'Tenants', Icon: IconTenants },
  { id: 'building', label: 'Building', Icon: IconBuilding }
];

export default function AppShell({ activeTab, onSelectTab, showReceiptTab, children }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-12">
        <header className="flex items-center justify-between gap-4 flex-wrap pb-4 mb-1 border-b border-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="Spain's Apartment logo"
              className="w-[52px] h-[52px] object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold tracking-tight m-0">Spain's Apartment</h1>
              <p className="text-[12.5px] text-mutedfg mt-0.5 mb-0 truncate">
                #79 Vernon Street, Belize City · 3 floors · 11 units
              </p>
            </div>
          </div>
          <div
            className="hidden sm:block h-8 w-px bg-border shrink-0"
            aria-hidden="true"
          />
          <p className="hidden sm:block text-[12px] text-mutedfg m-0 shrink-0">
            Single building · BZD
          </p>
        </header>

        <nav
          className="flex flex-wrap gap-0 border-b border-border mb-6"
          aria-label="Primary"
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-semibold border-b-2 -mb-px transition-colors duration-200 ${focusRing} rounded-t ${
                activeTab === id
                  ? 'text-primary border-primary'
                  : 'text-mutedfg border-transparent hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
          {showReceiptTab && (
            <span
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-semibold border-b-2 -mb-px text-primary border-gold"
              aria-current="page"
            >
              <IconReceipt className="w-4 h-4 shrink-0" aria-hidden="true" />
              Receipt preview
            </span>
          )}
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
}
