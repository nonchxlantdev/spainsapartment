import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createTenantsService } from '../src/modules/tenants/tenants.service.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { createPaymentsService } from '../src/modules/payments/payments.service.js';
import { createReceiptsRouter, monthRangeBounds } from '../src/modules/receipts/receipts.routes.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const tenantsService = createTenantsService({ tenantsRepository: tenantsRepo });
  const paymentsRepo = createPaymentsRepository(db);
  const paymentsService = createPaymentsService({
    tenantsRepository: tenantsRepo,
    paymentsRepository: paymentsRepo
  });

  const unit = unitsRepo.insertSeed({
    floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000
  });
  const tenant = tenantsRepo.insertSeed({
    unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: null, dob: null,
    onboarded_date: null, lease_renewal_date: null, monthly_rent_cents: 40000, due_day: '5th',
    payment_method: 'Cash', status: 'pending', pending_balance_cents: 0, notes: '',
    receipt_count: 0, is_rent_free: 0
  });

  const app = express();
  app.use(express.json());
  app.use('/api/receipts', createReceiptsRouter({ paymentsRepository: paymentsRepo, tenantsService }));

  return { app, tenantId: tenant.id, paymentsService, paymentsRepo };
}

describe('monthRangeBounds', () => {
  it('rejects inverted ranges and bad formats', () => {
    expect(monthRangeBounds('2026-03', '2026-01')).toBeNull();
    expect(monthRangeBounds('bad', '2026-01')).toBeNull();
  });

  it('allows pre-2026 months and returns inclusive calendar bounds', () => {
    expect(monthRangeBounds('2024-08', '2024-08')).toEqual({
      fromDate: '2024-08-01',
      toDate: '2024-08-31',
      fromMonth: '2024-08',
      toMonth: '2024-08'
    });
    expect(monthRangeBounds('2026-01', '2026-02')).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-02-28',
      fromMonth: '2026-01',
      toMonth: '2026-02'
    });
  });
});

describe('GET /api/receipts/tenant/:id/bundle.zip', () => {
  it('returns a zip for payments in range and excludes outside payments', async () => {
    const { app, tenantId, paymentsService } = setup();
    paymentsService.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-01-05', description: 'Jan'
    });
    paymentsService.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-03-05', description: 'Mar'
    });

    const ok = await request(app)
      .get(`/api/receipts/tenant/${tenantId}/bundle.zip?from=2026-01&to=2026-01`)
      .buffer(true)
      .parse((res, cb) => {
        const data = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(data)));
      });
    expect(ok.status).toBe(200);
    expect(ok.headers['content-type']).toMatch(/zip/);
    expect(Buffer.from(ok.body).subarray(0, 2).toString()).toBe('PK');
    expect(ok.headers['content-disposition']).toMatch(/WN-receipts-2026-01-to-2026-01\.zip/);

    const empty = await request(app).get(
      `/api/receipts/tenant/${tenantId}/bundle.zip?from=2026-06&to=2026-06`
    );
    expect(empty.status).toBe(404);
    expect(empty.body.error).toMatch(/No receipts/);
  });

  it('all=1 returns every receipt on file', async () => {
    const { app, tenantId, paymentsService } = setup();
    paymentsService.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-01-05', description: 'Jan'
    });
    const res = await request(app)
      .get(`/api/receipts/tenant/${tenantId}/bundle.zip?all=1`)
      .buffer(true)
      .parse((r, cb) => {
        const data = [];
        r.on('data', chunk => data.push(chunk));
        r.on('end', () => cb(null, Buffer.concat(data)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/WN-receipts-all\.zip/);
  });

  it('rejects invalid query params', async () => {
    const { app, tenantId } = setup();
    const res = await request(app).get(
      `/api/receipts/tenant/${tenantId}/bundle.zip?from=2026-03&to=2026-01`
    );
    expect(res.status).toBe(400);
  });
});
