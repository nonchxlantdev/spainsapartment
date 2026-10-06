// apps/web/src/pages/Tenants.jsx
import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import TenantProfile from '../components/TenantProfile.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconSearch } from '../icons.jsx';
import { cardClass, focusRing } from '../ui.js';

export default function Tenants({ selectedTenantId, onSelectTenant, onViewReceipt }) {
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [showFormer, setShowFormer] = useState(false);

  function loadHistory(id) {
    if (id) apiGet(`/receipts/tenant/${id}`).then(setHistory);
  }

  function refresh() {
    apiGet('/tenants').then(list => {
      setTenants(list);
      if (!selectedTenantId && list.length > 0) onSelectTenant(list[0].id);
      else loadHistory(selectedTenantId);
    });
  }

  useEffect(refresh, []);

  useEffect(() => {
    loadHistory(selectedTenantId);
  }, [selectedTenantId]);

  const filtered = tenants.filter(t => {
    if (!showFormer && t.active === 0) return false;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });
  const selected = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr] gap-5 items-start">
      <div className={`${cardClass} overflow-hidden lg:sticky lg:top-5`}>
        <div className="relative p-4 border-b border-border">
          <IconSearch
            className="absolute left-7 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-mutedfg pointer-events-none"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tenants"
            aria-label="Search tenants"
            className={`w-full border border-border rounded-lg bg-background text-foreground pl-9 pr-3 py-2 text-[13px] ${focusRing}`}
          />
          <label className="mt-2 flex items-center gap-2 text-[11.5px] text-mutedfg cursor-pointer">
            <input
              type="checkbox"
              checked={showFormer}
              onChange={e => setShowFormer(e.target.checked)}
            />
            Show former tenants
          </label>
        </div>
        <div className="max-h-[min(70vh,640px)] overflow-y-auto">
          {filtered.map(t => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTenant(t.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTenant(t.id);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border last:border-0 transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:bg-muted ${
                t.id === selectedTenantId
                  ? 'bg-muted shadow-[inset_3px_0_0_theme(colors.gold)]'
                  : ''
              } ${t.active === 0 ? 'opacity-70' : ''}`}
            >
              <Avatar name={t.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate">{t.name}</div>
                <div className="text-[11.5px] text-mutedfg">
                  {t.active === 0 ? 'Former' : t.unit_label || '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected ? (
        <TenantProfile
          tenant={selected}
          onChanged={refresh}
          history={history}
          onViewReceipt={h => onViewReceipt(h, selected)}
        />
      ) : (
        <div className={`${cardClass} p-8 text-center text-mutedfg`}>
          Select a tenant from the list
        </div>
      )}
    </div>
  );
}
