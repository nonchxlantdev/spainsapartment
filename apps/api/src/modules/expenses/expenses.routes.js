import { Router } from 'express';

export function createExpensesRouter({ expensesService }) {
  const router = Router();

  router.get('/categories', (req, res) => {
    res.json(expensesService.categories());
  });

  router.get('/', (req, res) => {
    const { month, category } = req.query;
    res.json(expensesService.list({ month, category }));
  });

  router.post('/', (req, res) => {
    try {
      const expense = expensesService.create(req.body);
      res.status(201).json(expense);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/:id', (req, res) => {
    const expense = expensesService.get(Number(req.params.id));
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  });

  router.patch('/:id', (req, res) => {
    try {
      const expense = expensesService.edit(Number(req.params.id), req.body);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      res.json(expense);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:id/payments', (req, res) => {
    try {
      const expense = expensesService.addPayment(Number(req.params.id), req.body.amountCents);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      res.status(201).json(expense);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:id/mark-paid', (req, res) => {
    const expense = expensesService.markPaid(Number(req.params.id));
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  });

  router.delete('/:id', (req, res) => {
    try {
      expensesService.remove(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
