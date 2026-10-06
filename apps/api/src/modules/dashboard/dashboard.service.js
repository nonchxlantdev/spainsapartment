import {
  currentMonthKey,
  groupPaymentsByTenant,
  monthLabel,
  summarizeTenants,
  withCollectionStatus
} from '../payments/collection.js';

export function createDashboardService({ tenantsRepository, paymentsRepository = null, now = () => new Date() }) {
  function getMonthlySummary() {
    const month = currentMonthKey(now());
    const all = tenantsRepository.all();
    const grouped = paymentsRepository ? groupPaymentsByTenant(paymentsRepository.allOrdered()) : null;
    const tenants = grouped
      ? all.map(tenant => withCollectionStatus(tenant, grouped.get(tenant.id) || [], month))
      : all;
    const summary = summarizeTenants(tenants);

    return {
      ...summary,
      month,
      monthLabel: monthLabel(month),
      tenants
    };
  }

  return { getMonthlySummary };
}
