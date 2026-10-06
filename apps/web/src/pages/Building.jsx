// apps/web/src/pages/Building.jsx
import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import { cardClass } from '../ui.js';

const FLOOR_DESC = {
  3: '4 units',
  2: 'your residence + 2 units',
  1: '4 units'
};

export default function Building() {
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    apiGet('/units').then(setUnits);
    apiGet('/tenants').then(setTenants);
  }, []);

  function occupantFor(unit) {
    if (unit.is_owner_residence) return { label: 'You', state: 'owner' };
    const tenant = tenants.find(t => t.unit_id === unit.id);
    if (!tenant) return { label: 'Vacant', state: 'vacant' };
    return { label: tenant.name, state: tenant.is_rent_free ? 'free' : 'occupied' };
  }

  const floors = [3, 2, 1].map(floor => ({
    floor,
    units: units.filter(u => u.floor === floor)
  }));

  const occupiedCount = units.filter(u => {
    const occ = occupantFor(u);
    return occ.state === 'occupied' || occ.state === 'free' || occ.state === 'owner';
  }).length;

  const styles = {
    occupied: 'border-secondary bg-gradient-to-b from-secondary/10 to-transparent',
    vacant: 'border-dashed border-border text-mutedfg bg-surface',
    owner: 'bg-muted border-dashed border-border',
    free: 'bg-muted border-border'
  };

  return (
    <div className="space-y-5">
      <div className={`${cardClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-gold`}>
        <div>
          <h2 className="text-[15px] font-bold m-0">Spain's Apartment</h2>
          <p className="text-[13px] text-mutedfg mt-1 mb-0">
            #79 Vernon Street, Belize City · 3 floors · 11 units
          </p>
        </div>
        <p className="text-[13px] font-mono font-semibold m-0">
          {occupiedCount} / {units.length || 11} occupied
        </p>
      </div>

      <div className={`${cardClass} p-5 space-y-6`}>
        {floors.map(({ floor, units: floorUnits }) => (
          <div key={floor}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-bold text-[14px]">Floor {floor}</span>
              <span className="text-[12px] text-mutedfg">{FLOOR_DESC[floor]}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {floorUnits.map(u => {
                const occ = occupantFor(u);
                return (
                  <div
                    key={u.id}
                    className={`relative border rounded-xl p-3.5 text-xs shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-px ${styles[occ.state]}`}
                  >
                    {occ.state === 'occupied' && (
                      <span
                        className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-secondary"
                        aria-hidden="true"
                      />
                    )}
                    <div className="font-bold text-[12.5px] mb-1">{u.label}</div>
                    <div className="text-mutedfg truncate">{occ.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
