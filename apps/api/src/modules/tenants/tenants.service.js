import { EDITABLE_FIELDS } from './tenants.repository.js';
import { composeName } from './name.js';
import {
  currentMonthKey,
  groupPaymentsByTenant,
  withCollectionStatus
} from '../payments/collection.js';

export function createTenantsService({
  tenantsRepository,
  unitsRepository,
  paymentsRepository = null,
  now = () => new Date()
}) {
  function resolveName(fields) {
    if (fields.first != null || fields.last != null || fields.middle != null) {
      const name = composeName({
        first: fields.first,
        middle: fields.middle,
        last: fields.last
      });
      if (!name) throw new Error('First and last name are required');
      if (!String(fields.first || '').trim() || !String(fields.last || '').trim()) {
        throw new Error('First and last name are required');
      }
      return name;
    }
    if (fields.name != null) {
      const name = String(fields.name).trim();
      if (!name) throw new Error('Name is required');
      return name;
    }
    return null;
  }

  function decorate(tenant, grouped) {
    if (!tenant || !grouped) return tenant;
    return withCollectionStatus(tenant, grouped.get(tenant.id) || [], currentMonthKey(now()));
  }

  function groupedPayments() {
    if (!paymentsRepository) return null;
    return groupPaymentsByTenant(paymentsRepository.allOrdered());
  }

  return {
    list() {
      const grouped = groupedPayments();
      return tenantsRepository.all().map(tenant => decorate(tenant, grouped));
    },
    get(id) {
      return decorate(tenantsRepository.findById(id), groupedPayments());
    },
    edit(id, fields) {
      const existing = tenantsRepository.findById(id);
      if (!existing) return null;
      const safeFields = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in fields) safeFields[key] = fields[key];
      }
      const name = resolveName(fields);
      if (name != null) safeFields.name = name;
      if ('gender' in safeFields) {
        safeFields.gender = safeFields.gender === 'male' || safeFields.gender === 'female' ? safeFields.gender : '';
      }
      return tenantsRepository.update(id, safeFields);
    },
    create(fields) {
      const name = resolveName(fields);
      if (!name) throw new Error('First and last name are required');

      const unitId = Number(fields.unit_id);
      if (!Number.isFinite(unitId)) throw new Error('Unit is required');

      const unit = unitsRepository.findById(unitId);
      if (!unit) throw new Error('Unit not found');
      if (unit.is_owner_residence) throw new Error('Cannot assign a tenant to the owner residence');

      const occupied = tenantsRepository.findActiveByUnitId(unitId);
      if (occupied) throw new Error(`${unit.label} already has an active tenant`);

      const monthly = Number(fields.monthly_rent_cents ?? unit.default_rent_cents ?? 0);
      return tenantsRepository.insert({
        unit_id: unitId,
        name,
        phone: fields.phone || '',
        email: fields.email || '',
        gender: fields.gender === 'male' || fields.gender === 'female' ? fields.gender : '',
        ssn: fields.ssn || null,
        dob: fields.dob || null,
        onboarded_date: fields.onboarded_date || null,
        lease_renewal_date: fields.lease_renewal_date || null,
        monthly_rent_cents: Number.isFinite(monthly) ? monthly : 0,
        due_day: fields.due_day || '',
        payment_method: fields.payment_method || 'Cash',
        notes: fields.notes || '',
        is_rent_free: fields.is_rent_free ? 1 : 0,
        status: fields.is_rent_free ? 'free' : 'pending'
      });
    },
    disable(id) {
      const existing = tenantsRepository.findById(id);
      if (!existing) return null;
      if (!existing.active) return existing;
      return tenantsRepository.disable(id);
    },
    vacantUnits() {
      const units = unitsRepository.all().filter(u => !u.is_owner_residence);
      return units.filter(u => !tenantsRepository.findActiveByUnitId(u.id));
    }
  };
}
