// apps/api/src/app.js
import express from 'express';
import cors from 'cors';
import { getDb } from './db/index.js';
import { createUnitsRepository } from './modules/units/units.repository.js';
import { createTenantsRepository } from './modules/tenants/tenants.repository.js';
import { createTenantsService } from './modules/tenants/tenants.service.js';
import { createTenantsRouter } from './modules/tenants/tenants.routes.js';
import { createPaymentsRepository } from './modules/payments/payments.repository.js';
import { createPaymentsService } from './modules/payments/payments.service.js';
import { createPaymentsRouter } from './modules/payments/payments.routes.js';
import { createReceiptsRouter } from './modules/receipts/receipts.routes.js';
import { createLeasesRouter } from './modules/leases/leases.routes.js';
import { createDashboardService } from './modules/dashboard/dashboard.service.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createExpensesRepository } from './modules/expenses/expenses.repository.js';
import { createExpensesService } from './modules/expenses/expenses.service.js';
import { createExpensesRouter } from './modules/expenses/expenses.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthRouter, requireAuth } from './modules/auth/auth.routes.js';
import { getAuthPassword } from './modules/auth/auth.config.js';

function ensureApiPrefix(req, _res, next) {
  const url = req.url || '/';
  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) {
    next();
    return;
  }
  req.url = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
  next();
}

export function createApp(db = getDb()) {
  const unitsRepository = createUnitsRepository(db);
  const tenantsRepository = createTenantsRepository(db);
  const paymentsRepository = createPaymentsRepository(db);
  const tenantsService = createTenantsService({ tenantsRepository, unitsRepository, paymentsRepository });
  const paymentsService = createPaymentsService({ tenantsRepository, paymentsRepository });
  const dashboardService = createDashboardService({ tenantsRepository, paymentsRepository });
  const authService = createAuthService({ db, getPassword: getAuthPassword });
  const expensesRepository = createExpensesRepository(db);
  const expensesService = createExpensesService({ expensesRepository });

  const app = express();
  if (process.env.VERCEL) app.use(ensureApiPrefix);
  app.use(cors());
  app.use(express.json());

  // Auth + health are reachable without a session; everything else under
  // /api requires one (see requireAuth below).
  app.use('/api/auth', createAuthRouter({ authService }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api', requireAuth(authService));

  app.use('/api/units', (req, res) => res.json(unitsRepository.all()));
  app.use('/api/tenants', createTenantsRouter({ tenantsService }));
  app.use('/api/payments', createPaymentsRouter({ paymentsService, tenantsService, paymentsRepository }));
  app.use('/api/receipts', createReceiptsRouter({ paymentsRepository, tenantsService }));
  app.use('/api/leases', createLeasesRouter({ tenantsService, unitsRepository }));
  app.use('/api/dashboard', createDashboardRouter({ dashboardService }));
  app.use('/api/expenses', createExpensesRouter({ expensesService }));

  return app;
}
