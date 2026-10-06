import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createTenantsService } from '../src/modules/tenants/tenants.service.js';
import { createTenantsRouter } from '../src/modules/tenants/tenants.routes.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { createPaymentsService } from '../src/modules/payments/payments.service.js';
import { createPaymentsRouter } from '../src/modules/payments/payments.routes.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const tenantsService = createTenantsService({ tenantsRepository: tenantsRepo });
  const paymentsRepo = createPaymentsRepository(db);
  const paymentsService = createPaymentsService({ tenantsRepository: tenantsRepo, paymentsRepository: paymentsRepo });

  const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 });
  const tenant = tenantsRepo.insertSeed({
    unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: null, dob: null, onboarded_date: null,
    lease_renewal_date: null, monthly_rent_cents: 40000, due_day: '5th', payment_method: 'Cash',
    status: 'pending', pending_balance_cents: 0, notes: '', receipt_count: 0, is_rent_free: 0
  });

  const app = express();
  app.use(express.json());
  app.use('/api/tenants', createTenantsRouter({ tenantsService }));
  app.use('/api/payments', createPaymentsRouter({ paymentsService, tenantsService, paymentsRepository: paymentsRepo }));

  return { app, tenantId: tenant.id };
}

describe('POST /api/payments', () => {
  it('records a payment and returns the updated tenant', async () => {
    const { app, tenantId } = setup();
    const res = await request(app).post('/api/payments').send({
      tenantId, amountCents: 37000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent'
    });
    expect(res.status).toBe(201);
    expect(res.body.tenant.status).toBe('partial');
    expect(res.body.payment.receipt_number).toBe('WN0920260001');
  });

  it('returns 404 for an unknown tenant', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/payments').send({
      tenantId: 9999, amountCents: 1000, method: 'Cash', paidOn: '2026-09-05', description: 'x'
    });
    expect(res.status).toBe(404);
  });
});

describe('GET/PATCH /api/tenants', () => {
  it('lists tenants and updates editable fields', async () => {
    const { app, tenantId } = setup();
    const list = await request(app).get('/api/tenants');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const patch = await request(app).patch(`/api/tenants/${tenantId}`).send({ phone: '+501 600-1234' });
    expect(patch.status).toBe(200);
    expect(patch.body.phone).toBe('+501 600-1234');
  });
});

describe('GET /api/payments/recent', () => {
  it('returns recent payments joined with tenant data', async () => {
    const { app, tenantId } = setup();
    await request(app).post('/api/payments').send({
      tenantId, amountCents: 37000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent'
    });
    const res = await request(app).get('/api/payments/recent?limit=4');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({
      tenant_name: 'Wilbense Noel',
      unit_label: 'Unit 2'
    });
  });
});
