import { Router } from 'express';

export function createTenantsRouter({ tenantsService }) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(tenantsService.list());
  });

  router.get('/vacant-units', (req, res) => {
    res.json(tenantsService.vacantUnits());
  });

  router.post('/', (req, res) => {
    try {
      const tenant = tenantsService.create(req.body);
      res.status(201).json(tenant);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/:id', (req, res) => {
    const tenant = tenantsService.get(Number(req.params.id));
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  });

  router.patch('/:id', (req, res) => {
    try {
      const tenant = tenantsService.edit(Number(req.params.id), req.body);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      res.json(tenant);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:id/disable', (req, res) => {
    const tenant = tenantsService.disable(Number(req.params.id));
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  });

  return router;
}
