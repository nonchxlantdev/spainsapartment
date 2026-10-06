// apps/api/src/modules/leases/leases.routes.js
import { Router } from 'express';
import { renderLeasePdf } from './leases.pdf.js';

export function createLeasesRouter({ tenantsService, unitsRepository }) {
  const router = Router();

  router.post('/:tenantId/generate', async (req, res) => {
    const tenant = tenantsService.get(Number(req.params.tenantId));
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    if (!tenant.unit_id) return res.status(400).json({ error: 'Tenant has no unit assigned' });
    const unit = unitsRepository.findById(tenant.unit_id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    const { termMonths = 6, startDate, firstDueDate, bankAccount } = req.body;

    const buffer = await renderLeasePdf({ tenant, unit, termMonths, startDate, firstDueDate, bankAccount });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lease-${unit.unit_code}.pdf"`);
    res.send(buffer);
  });

  return router;
}
