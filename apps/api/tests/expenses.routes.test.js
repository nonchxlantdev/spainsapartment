import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createExpensesRepository } from '../src/modules/expenses/expenses.repository.js';
import { createExpensesService } from '../src/modules/expenses/expenses.service.js';
import { createExpensesRouter } from '../src/modules/expenses/expenses.routes.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const expensesRepository = createExpensesRepository(db);
  const expensesService = createExpensesService({ expensesRepository });

  const app = express();
  app.use(express.json());
  app.use('/api/expenses', createExpensesRouter({ expensesService }));

  return { app };
}

function farFutureIso() {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

describe('POST /api/expenses', () => {
  it('logs a bill and returns computed balance/status', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/expenses').send({
      category: 'Electricity',
      coverage: 'Owner Residence',
      amountCents: 14250,
      billDate: '2026-09-01',
      dueDate: farFutureIso(),
      paidAmountCents: 0
    });
    expect(res.status).toBe(201);
    expect(res.body.balance_cents).toBe(14250);
    expect(res.body.status).toBe('due');
  });

  it('rejects a coverage group that does not belong to the category', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/expenses').send({
      category: 'Internet',
      coverage: 'Owner Residence',
      amountCents: 13000,
      billDate: '2026-09-01'
    });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown category', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/expenses').send({
      category: 'Cellphone',
      amountCents: 5000,
      billDate: '2026-09-01'
    });
    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative amount', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/expenses').send({
      category: 'Garbage',
      amountCents: 0,
      billDate: '2026-09-01'
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses', () => {
  it('filters by month and category', async () => {
    const { app } = setup();
    await request(app).post('/api/expenses').send({ category: 'Garbage', amountCents: 6000, billDate: '2026-09-01' });
    await request(app).post('/api/expenses').send({ category: 'Cable', amountCents: 9500, billDate: '2026-08-15' });

    const septOnly = await request(app).get('/api/expenses?month=2026-09');
    expect(septOnly.body).toHaveLength(1);
    expect(septOnly.body[0].category).toBe('Garbage');

    const cableOnly = await request(app).get('/api/expenses?month=all&category=Cable');
    expect(cableOnly.body).toHaveLength(1);
    expect(cableOnly.body[0].category).toBe('Cable');
  });
});

describe('bill payments', () => {
  it('accumulates partial payments and flips to paid once the balance clears', async () => {
    const { app } = setup();
    const create = await request(app).post('/api/expenses').send({
      category: 'Water',
      coverage: 'Timothy & Jak',
      amountCents: 3400,
      billDate: '2026-09-01'
    });
    const id = create.body.id;

    const partial = await request(app).post(`/api/expenses/${id}/payments`).send({ amountCents: 2000 });
    expect(partial.status).toBe(201);
    expect(partial.body.status).toBe('partial');
    expect(partial.body.balance_cents).toBe(1400);

    const rest = await request(app).post(`/api/expenses/${id}/payments`).send({ amountCents: 1400 });
    expect(rest.body.status).toBe('paid');
    expect(rest.body.balance_cents).toBe(0);
  });

  it('mark-paid pays a bill off in one step', async () => {
    const { app } = setup();
    const create = await request(app).post('/api/expenses').send({
      category: 'Butane',
      coverage: 'Owner Residence',
      amountCents: 4500,
      billDate: '2026-09-01'
    });
    const res = await request(app).post(`/api/expenses/${create.body.id}/mark-paid`);
    expect(res.body.status).toBe('paid');
    expect(res.body.paid_amount_cents).toBe(4500);
  });

  it('a bill overdue and unpaid is flagged overdue, not just due', async () => {
    const { app } = setup();
    const create = await request(app).post('/api/expenses').send({
      category: 'Cable',
      amountCents: 9500,
      billDate: '2020-01-01',
      dueDate: '2020-01-10'
    });
    expect(create.body.status).toBe('overdue');
    expect(create.body.due_tier).toBe('overdue');
  });
});

describe('DELETE /api/expenses/:id', () => {
  it('removes a bill', async () => {
    const { app } = setup();
    const create = await request(app).post('/api/expenses').send({ category: 'Other', amountCents: 1000, billDate: '2026-09-01' });
    const del = await request(app).delete(`/api/expenses/${create.body.id}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/expenses/${create.body.id}`);
    expect(get.status).toBe(404);
  });
});
