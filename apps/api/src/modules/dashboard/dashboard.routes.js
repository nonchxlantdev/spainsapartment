import { Router } from 'express';

export function createDashboardRouter({ dashboardService }) {
  const router = Router();
  router.get('/', (req, res) => {
    res.json(dashboardService.getMonthlySummary());
  });
  return router;
}
