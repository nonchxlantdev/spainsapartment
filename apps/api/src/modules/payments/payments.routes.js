import { Router } from 'express';

export function createPaymentsRouter({ paymentsService, tenantsService, paymentsRepository }) {
  const router = Router();

  router.get('/recent', (req, res) => {
    const limit = Math.min(10, Math.max(1, Number(req.query.limit || 4)));
    res.json(paymentsRepository.recentWithTenant(limit));
  });

  router.get('/collection', (req, res) => {
    try {
      res.json(paymentsService.getCollection(req.query.month));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/:id', (req, res) => {
    try {
      const payment = paymentsService.updatePaidOn(Number(req.params.id), req.body?.paidOn);
      res.json(payment);
    } catch (err) {
      const status = /not found/i.test(err.message) ? 404 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  router.post('/', (req, res) => {
    const { tenantId, amountCents, method, paidOn, description, status, pendingAfterCents, receiptNote } = req.body;
    if (!tenantsService.get(tenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    try {
      const result = paymentsService.recordPayment(tenantId, {
        amountCents,
        method,
        paidOn,
        description,
        status,
        pendingAfterCents,
        receiptNote
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
