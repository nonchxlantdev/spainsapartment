// apps/web/src/App.jsx
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import HeroBanner from './components/HeroBanner.jsx';
import Toast from './components/Toast.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tenants from './pages/Tenants.jsx';
import Building from './pages/Building.jsx';
import Expenses from './pages/Expenses.jsx';
import Payments from './pages/Payments.jsx';
import Receipts from './pages/Receipts.jsx';
import { useTheme, useToast } from './hooks.js';
import { collectDueAlerts } from './dueAlerts.js';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const [heroStats, setHeroStats] = useState({ floors: 3, units: 11, family: 0, vacant: 0 });
  const [dueAlerts, setDueAlerts] = useState([]);
  const [authStatus, setAuthStatus] = useState('checking'); // 'checking' | 'authed' | 'anon'
  const [toast, fireToast] = useToast();
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    apiGet('/auth/status')
      .then(res => setAuthStatus(res.authenticated ? 'authed' : 'anon'))
      .catch(() => setAuthStatus('anon'));
  }, []);

  function handleLogout() {
    apiPost('/auth/logout')
      .catch(() => {})
      .finally(() => setAuthStatus('anon'));
  }

  function comingSoon(label) {
    fireToast(`${label} — not built yet`);
  }

  function refreshOverview() {
    return Promise.all([apiGet('/units'), apiGet('/tenants')])
      .then(([units, tenants]) => {
        const family = tenants.filter(t => t.is_rent_free || t.status === 'free').length;
        const occupiedUnitIds = new Set(tenants.map(t => t.unit_id));
        const vacant = units.filter(u => !u.is_owner_residence && !occupiedUnitIds.has(u.id)).length;
        const floors = Math.max(...units.map(u => u.floor), 3);
        setHeroStats({ floors, units: units.length, family, vacant });
        setDueAlerts(collectDueAlerts(tenants));
      })
      .catch(() => {});
  }

  // Refresh once authenticated, and again whenever the dashboard tab is
  // opened, so the due-date alerts (and hero stats) don't go stale across a
  // long session. Gated on authStatus so an anonymous visitor never fires an
  // API call that would 401 against the login screen.
  useEffect(() => {
    if (authStatus === 'authed' && tab === 'dashboard') refreshOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authStatus]);

  function openTenant(id) {
    setSelectedTenantId(id);
    setViewingReceipt(null);
    setTab('tenants');
  }

  function selectTab(id) {
    setViewingReceipt(null);
    setTab(id);
  }

  function viewReceipt(payment, tenant) {
    setViewingReceipt({ receipt: payment, tenant });
  }

  const activeTab = viewingReceipt ? 'tenants' : tab;

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-mutedfg text-[12px] uppercase tracking-[0.22em] font-mono animate-pulse">
          Initializing…
        </p>
      </div>
    );
  }

  if (authStatus === 'anon') {
    return <Login onAuthenticated={() => setAuthStatus('authed')} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onSelectTab={selectTab} onComingSoon={comingSoon} />
      <div className="md:ml-[240px] min-h-screen">
        <HeroBanner
          stats={heroStats}
          onComingSoon={comingSoon}
          theme={theme}
          onToggleTheme={toggleTheme}
          dueAlerts={dueAlerts}
          onSelectTenant={openTenant}
          onLogout={handleLogout}
        />
        <div className="px-4 py-4 md:px-6 md:py-5 lg:px-7">
          {viewingReceipt ? (
            <Receipts
              receipt={viewingReceipt.receipt}
              tenant={viewingReceipt.tenant}
              onBack={() => setViewingReceipt(null)}
            />
          ) : (
            <>
              {tab === 'dashboard' && (
                <Dashboard
                  onSelectTenant={openTenant}
                  onGoTenants={() => setTab('tenants')}
                  sessionStartedAt={sessionStartedAt}
                  onComingSoon={comingSoon}
                  dueAlerts={dueAlerts}
                  onGoPayments={() => setTab('payments')}
                />
              )}
              {tab === 'payments' && (
                <Payments
                  onChanged={refreshOverview}
                  onViewReceipt={viewReceipt}
                />
              )}
              {tab === 'tenants' && (
                <Tenants
                  selectedTenantId={selectedTenantId}
                  onSelectTenant={setSelectedTenantId}
                  onViewReceipt={viewReceipt}
                />
              )}
              {tab === 'building' && <Building />}
              {tab === 'expenses' && <Expenses onComingSoon={comingSoon} />}
            </>
          )}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
