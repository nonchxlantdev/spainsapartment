import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';

describe('database schema', () => {
  let db;
  beforeEach(() => {
    db = new Database(':memory:');
  });

  it('creates all expected tables', () => {
    initSchema(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map(r => r.name);
    expect(tables).toEqual(['expenses', 'payments', 'sessions', 'tenants', 'units']);
  });

  it('is safe to apply twice (idempotent)', () => {
    initSchema(db);
    expect(() => initSchema(db)).not.toThrow();
  });
});

import { createUnitsRepository } from '../src/modules/units/units.repository.js';

describe('units repository', () => {
  let db, repo;
  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
    repo = createUnitsRepository(db);
  });

  it('inserts and retrieves a unit by id', () => {
    const unit = repo.insertSeed({ floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 });
    expect(unit.id).toBeGreaterThan(0);
    expect(repo.findById(unit.id).unit_code).toBe('U2');
  });

  it('finds a unit by its unit_code', () => {
    repo.insertSeed({ floor: 3, label: 'Unit 7', unit_code: 'U7', is_owner_residence: 0, default_rent_cents: 50000 });
    expect(repo.findByCode('U7').label).toBe('Unit 7');
  });

  it('lists all units ordered by floor then label', () => {
    repo.insertSeed({ floor: 3, label: 'Unit 9', unit_code: 'U9', is_owner_residence: 0, default_rent_cents: 60000 });
    repo.insertSeed({ floor: 1, label: 'Unit 1', unit_code: 'U1', is_owner_residence: 0, default_rent_cents: 0 });
    const all = repo.all();
    expect(all[0].unit_code).toBe('U1');
    expect(all[all.length - 1].unit_code).toBe('U9');
  });
});
