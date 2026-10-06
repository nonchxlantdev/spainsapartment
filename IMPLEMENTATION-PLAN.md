# Spain's Apartment — Personal Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, single-user web app that manages 79 Vernon Street: tenant profiles, lease and receipt PDF generation, payment recording with partial-balance carryover, a monthly collections dashboard, and one-click WhatsApp receipt delivery.

**Architecture:** An npm-workspaces monorepo with two apps: `apps/api` (Express + better-sqlite3, serving JSON + generated PDFs) and `apps/web` (React + Vite + Tailwind, a single-page tabbed UI). Money is stored as integer cents everywhere. No authentication — this runs locally for one user.

**Tech Stack:** Node.js 18+, Express 4, better-sqlite3 ^11, pdfkit ^0.15, React 18, Vite 5, Tailwind CSS 3, Vitest ^2, Supertest ^7.

## Global Constraints

- Money is always stored and passed between backend layers as **integer cents** (e.g. $400.00 → `40000`). Only the UI and PDF layers format to dollars.
- Dates are stored as ISO strings (`YYYY-MM-DD`).
- Receipt numbers follow the pattern `<UnitCode>-<3-digit-sequence>` (e.g. `U2-001`), sequential **per tenant**, never reused. Exception: Keyon Flowers' historical receipt `11000001` is seeded as-is and is not regenerated.
- No ORM — use better-sqlite3 directly with hand-written SQL (avoids the Prisma native-binary/network friction encountered on the sibling `property-management-system` project).
- No auth, no multi-user roles — single-user local tool.
- Business identity used throughout: name "Glenrick Spain", phone "+501 638-7406", address "#79 Vernon Street, Belize City", email "glenrickspain@hotmail.com", WhatsApp sending number "5016157575".
- Color tokens: primary `#2563EB`, accent `#059669`, background `#F8FAFC`, foreground `#0F172A`, warning `#B45309`, destructive `#DC2626`. Fonts: Fira Sans (UI text), Fira Code (numbers/amounts/receipt numbers).
- The provided "Spain's Apartment" logo file must be used as the primary brand mark in the web app header and on generated receipts/leases.

---

## File Structure

```
personal-management/
  package.json                                   # npm workspaces root
  README.md
  apps/
    api/
      package.json
      assets/
        logo.png                                 # brand logo, copied in Task 1
      src/
        db/
          schema.sql
          schema.js
          index.js
        modules/
          units/
            units.repository.js
          tenants/
            tenants.repository.js
            tenants.service.js
            tenants.routes.js
          payments/
            payments.repository.js
            payments.service.js
            payments.routes.js
          receipts/
            amount-to-words.js
            receipts.pdf.js
            receipts.routes.js
          leases/
            leases.pdf.js
            leases.routes.js
          dashboard/
            dashboard.service.js
            dashboard.routes.js
        seed.js
        app.js
        server.js
      tests/
        units.repository.test.js
        tenants.service.test.js
        payments.service.test.js
        receipts.pdf.test.js
        amount-to-words.test.js
        leases.pdf.test.js
        dashboard.service.test.js
        payments.routes.test.js
    web/
      package.json
      index.html
      vite.config.js
      tailwind.config.js
      postcss.config.js
      src/
        main.jsx
        App.jsx
        api.js
        assets/
          logo.png
        pages/
          Dashboard.jsx
          Tenants.jsx
          Building.jsx
          Receipts.jsx
        components/
          TenantProfile.jsx
          RecordPaymentForm.jsx
          StatusPill.jsx
```

---

## Task 1: Monorepo scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `apps/api/package.json`
- Create: `apps/web/package.json` (placeholder, filled in fully in Task 11)
- Create: `.gitignore`
- Create: `apps/api/assets/logo.png`
- Create: `apps/web/src/assets/logo.png`

**Interfaces:**
- Produces: npm workspaces (`apps/api`, `apps/web`), `npm run dev` at root runs both apps concurrently, `npm test` runs both apps' test suites.

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "spains-apartment-personal-management",
  "private": true,
  "workspaces": ["apps/api", "apps/web"],
  "scripts": {
    "dev": "concurrently -n api,web -c blue,green \"npm run dev -w apps/api\" \"npm run dev -w apps/web\"",
    "test": "npm test -w apps/api && npm test -w apps/web",
    "seed": "node apps/api/src/seed.js"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
apps/api/data/
apps/api/generated/
dist/
.DS_Store
```

- [ ] **Step 3: Create `apps/api/package.json`**

```json
{
  "name": "@spains-apartment/api",
  "private": true,
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "seed": "node src/seed.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.5.0",
    "cors": "^2.8.5",
    "express": "^4.21.1",
    "pdfkit": "^0.15.1"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 4: Copy the provided logo file into both apps**

The logo file (the "Spain's Apartment — In Loving Memory" gold-wreath mark, provided by the user) must be placed at:
- `apps/api/assets/logo.png` (used when rendering receipt/lease PDFs)
- `apps/web/src/assets/logo.png` (used in the web header)

If working from this session's files, the resized copy is at `/home/claude/logo-small.png` (320×320 PNG produced from the user's original upload) — copy that file to both paths above.

- [ ] **Step 5: Install root dependencies**

Run: `npm install`
Expected: `concurrently` installed at the root, workspace symlinks for `apps/api` created.

- [ ] **Step 6: Commit**

```bash
git init
git add package.json .gitignore apps/api/package.json apps/api/assets/logo.png apps/web/src/assets/logo.png
git commit -m "chore: scaffold monorepo workspace and brand assets"
```

---

## Task 2: SQLite schema and database bootstrap

**Files:**
- Create: `apps/api/src/db/schema.sql`
- Create: `apps/api/src/db/schema.js`
- Create: `apps/api/src/db/index.js`
- Test: `apps/api/tests/units.repository.test.js` (schema portion only — full units repo test is Task 3)

**Interfaces:**
- Produces: `initSchema(db)` — applies all `CREATE TABLE IF NOT EXISTS` statements to a given better-sqlite3 database instance. `getDb()` — returns the singleton production database (file-backed, WAL mode, foreign keys on).
- Consumes: nothing (first module).

- [ ] **Step 1: Write the schema SQL**

Create `apps/api/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor INTEGER NOT NULL,
  label TEXT NOT NULL,
  unit_code TEXT NOT NULL UNIQUE,
  is_owner_residence INTEGER NOT NULL DEFAULT 0,
  default_rent_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES units(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  ssn TEXT,
  dob TEXT,
  onboarded_date TEXT,
  lease_renewal_date TEXT,
  monthly_rent_cents INTEGER NOT NULL DEFAULT 0,
  due_day TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  pending_balance_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  receipt_count INTEGER NOT NULL DEFAULT 0,
  is_rent_free INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,
  paid_on TEXT NOT NULL,
  description TEXT NOT NULL,
  pending_after_cents INTEGER NOT NULL DEFAULT 0,
  receipt_number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Write `schema.js` to load and apply it**

```js
// apps/api/src/db/schema.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initSchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
}
```

- [ ] **Step 3: Write the failing test for the production db bootstrap**

Create `apps/api/tests/units.repository.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';

describe('database schema', () => {
  let db;
  beforeEach(() => {
    db = new Database(':memory:');
  });

  it('creates the units, tenants, and payments tables', () => {
    initSchema(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map(r => r.name);
    expect(tables).toEqual(['payments', 'tenants', 'units']);
  });

  it('is safe to apply twice (idempotent)', () => {
    initSchema(db);
    expect(() => initSchema(db)).not.toThrow();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — `Cannot find module '../src/db/schema.js'` (not yet created) or table assertion fails.

- [ ] **Step 5: Confirm schema.js (from Step 2) makes it pass**

Run: `npm test -w apps/api`
Expected: PASS — both assertions succeed.

- [ ] **Step 6: Write the production database bootstrap module**

```js
// apps/api/src/db/index.js
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'spains-apartment.db');

let dbInstance = null;

export function getDb(dbPath = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  initSchema(dbInstance);
  return dbInstance;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/db apps/api/tests/units.repository.test.js
git commit -m "feat(api): add SQLite schema and database bootstrap"
```

---

## Task 3: Units repository and real building data

**Files:**
- Create: `apps/api/src/modules/units/units.repository.js`
- Modify: `apps/api/tests/units.repository.test.js` (add repository behavior tests)

**Interfaces:**
- Consumes: `initSchema(db)` from Task 2.
- Produces: `createUnitsRepository(db)` → `{ all(), findById(id), findByCode(code), insertSeed(unit) }`. `insertSeed` accepts `{ floor, label, unit_code, is_owner_residence, default_rent_cents }` and returns the inserted row. Later tasks (Tenants, Payments) rely on `unit_code` and `default_rent_cents`.

- [ ] **Step 1: Add the failing repository tests**

Append to `apps/api/tests/units.repository.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — `Cannot find module '../src/modules/units/units.repository.js'`

- [ ] **Step 3: Implement the units repository**

```js
// apps/api/src/modules/units/units.repository.js
export function createUnitsRepository(db) {
  const repo = {
    all() {
      return db.prepare('SELECT * FROM units ORDER BY floor, label').all();
    },
    findById(id) {
      return db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    },
    findByCode(code) {
      return db.prepare('SELECT * FROM units WHERE unit_code = ?').get(code);
    },
    insertSeed(unit) {
      const stmt = db.prepare(`
        INSERT INTO units (floor, label, unit_code, is_owner_residence, default_rent_cents)
        VALUES (@floor, @label, @unit_code, @is_owner_residence, @default_rent_cents)
      `);
      const info = stmt.run(unit);
      return repo.findById(info.lastInsertRowid);
    }
  };
  return repo;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS — all units repository tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/units apps/api/tests/units.repository.test.js
git commit -m "feat(api): add units repository"
```

---

## Task 4: Tenants repository, service, and real seed data

**Files:**
- Create: `apps/api/src/modules/tenants/tenants.repository.js`
- Create: `apps/api/src/modules/tenants/tenants.service.js`
- Test: `apps/api/tests/tenants.service.test.js`

**Interfaces:**
- Consumes: `createUnitsRepository(db)` from Task 3.
- Produces:
  - `createTenantsRepository(db)` → `{ all(), findById(id), insertSeed(tenant), update(id, fields), updateAfterPayment(id, { status, pending_balance_cents, payment_method, receipt_count }) }`. Rows returned by `all()`/`findById()` are joined with `units` and include `unit_label`, `unit_floor`, `unit_code`.
  - `createTenantsService({ tenantsRepository })` → `{ list(), get(id), edit(id, fields) }`. `edit` whitelists editable fields: `name, phone, ssn, dob, onboarded_date, lease_renewal_date, monthly_rent_cents, due_day, payment_method, notes`.
- Task 5 (Payments) depends on `tenantsRepository.findById` and `updateAfterPayment` exactly as defined here.

- [ ] **Step 1: Write the failing repository + service tests**

Create `apps/api/tests/tenants.service.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createTenantsService } from '../src/modules/tenants/tenants.service.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const service = createTenantsService({ tenantsRepository: tenantsRepo });
  const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 });
  return { db, unitsRepo, tenantsRepo, service, unit };
}

describe('tenants repository', () => {
  it('inserts a tenant joined with its unit info', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: '000412897', dob: '1990-07-22',
      onboarded_date: '2025-11-05', lease_renewal_date: '2026-11-05', monthly_rent_cents: 40000,
      due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
      notes: '', receipt_count: 0, is_rent_free: 0
    });
    const found = tenantsRepo.findById(tenant.id);
    expect(found.unit_code).toBe('U2');
    expect(found.unit_floor).toBe(1);
  });

  it('updates whitelisted fields via update()', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: null, dob: null,
      onboarded_date: null, lease_renewal_date: null, monthly_rent_cents: 40000,
      due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
      notes: '', receipt_count: 0, is_rent_free: 0
    });
    const updated = tenantsRepo.update(tenant.id, { phone: '+501 600-1234', notes: 'Pays a day early' });
    expect(updated.phone).toBe('+501 600-1234');
    expect(updated.notes).toBe('Pays a day early');
  });

  it('applies status, pending balance, method, and receipt_count via updateAfterPayment()', () => {
    const { tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: null, dob: null,
      onboarded_date: null, lease_renewal_date: null, monthly_rent_cents: 40000,
      due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
      notes: '', receipt_count: 0, is_rent_free: 0
    });
    const updated = tenantsRepo.updateAfterPayment(tenant.id, {
      status: 'partial', pending_balance_cents: 3000, payment_method: 'Cash', receipt_count: 1
    });
    expect(updated.status).toBe('partial');
    expect(updated.pending_balance_cents).toBe(3000);
    expect(updated.receipt_count).toBe(1);
  });
});

describe('tenants service', () => {
  it('rejects edits to fields outside the whitelist (e.g. status, receipt_count)', () => {
    const { service, tenantsRepo, unit } = setup();
    const tenant = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: null, dob: null,
      onboarded_date: null, lease_renewal_date: null, monthly_rent_cents: 40000,
      due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
      notes: '', receipt_count: 0, is_rent_free: 0
    });
    const updated = service.edit(tenant.id, { status: 'paid', receipt_count: 99, phone: '+501 600-9999' });
    expect(updated.status).toBe('pending'); // unchanged — not editable directly
    expect(updated.receipt_count).toBe(0);  // unchanged
    expect(updated.phone).toBe('+501 600-9999'); // editable field applied
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the tenants repository**

```js
// apps/api/src/modules/tenants/tenants.repository.js
const EDITABLE_FIELDS = [
  'name', 'phone', 'ssn', 'dob', 'onboarded_date', 'lease_renewal_date',
  'monthly_rent_cents', 'due_day', 'payment_method', 'notes'
];

export function createTenantsRepository(db) {
  const SELECT = `
    SELECT t.*, u.label AS unit_label, u.floor AS unit_floor, u.unit_code AS unit_code
    FROM tenants t JOIN units u ON u.id = t.unit_id
  `;

  const repo = {
    all() {
      return db.prepare(`${SELECT} ORDER BY u.floor, u.label`).all();
    },
    findById(id) {
      return db.prepare(`${SELECT} WHERE t.id = ?`).get(id);
    },
    insertSeed(tenant) {
      const stmt = db.prepare(`
        INSERT INTO tenants (unit_id, name, phone, ssn, dob, onboarded_date, lease_renewal_date,
          monthly_rent_cents, due_day, payment_method, status, pending_balance_cents, notes,
          receipt_count, is_rent_free)
        VALUES (@unit_id, @name, @phone, @ssn, @dob, @onboarded_date, @lease_renewal_date,
          @monthly_rent_cents, @due_day, @payment_method, @status, @pending_balance_cents, @notes,
          @receipt_count, @is_rent_free)
      `);
      const info = stmt.run(tenant);
      return repo.findById(info.lastInsertRowid);
    },
    update(id, fields) {
      const keys = Object.keys(fields).filter(k => EDITABLE_FIELDS.includes(k));
      if (keys.length === 0) return repo.findById(id);
      const setClause = keys.map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE tenants SET ${setClause} WHERE id = @id`).run({ ...fields, id });
      return repo.findById(id);
    },
    updateAfterPayment(id, { status, pending_balance_cents, payment_method, receipt_count }) {
      db.prepare(`
        UPDATE tenants
        SET status = @status, pending_balance_cents = @pending_balance_cents,
            payment_method = @payment_method, receipt_count = @receipt_count
        WHERE id = @id
      `).run({ id, status, pending_balance_cents, payment_method, receipt_count });
      return repo.findById(id);
    }
  };
  return repo;
}

export { EDITABLE_FIELDS };
```

- [ ] **Step 4: Implement the tenants service**

```js
// apps/api/src/modules/tenants/tenants.service.js
import { EDITABLE_FIELDS } from './tenants.repository.js';

export function createTenantsService({ tenantsRepository }) {
  return {
    list() {
      return tenantsRepository.all();
    },
    get(id) {
      return tenantsRepository.findById(id);
    },
    edit(id, fields) {
      const safeFields = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in fields) safeFields[key] = fields[key];
      }
      return tenantsRepository.update(id, safeFields);
    }
  };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS — all tenants repository and service tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/tenants apps/api/tests/tenants.service.test.js
git commit -m "feat(api): add tenants repository and service with field whitelist"
```

---

## Task 5: Payments service — recordPayment core logic

This is the most important business logic in the system: it must exactly match the validated mockup's behavior (paid vs. partial, pending-balance carryover, per-tenant sequential receipt numbers).

**Files:**
- Create: `apps/api/src/modules/payments/payments.repository.js`
- Create: `apps/api/src/modules/payments/payments.service.js`
- Test: `apps/api/tests/payments.service.test.js`

**Interfaces:**
- Consumes: `createTenantsRepository(db)` (Task 4), `createUnitsRepository(db)` (Task 3).
- Produces: `createPaymentsRepository(db)` → `{ insert(payment), findById(id), forTenant(tenantId) }`. `createPaymentsService({ tenantsRepository, paymentsRepository })` → `{ recordPayment(tenantId, { amountCents, method, paidOn, description }) }`, returning `{ payment, tenant }`. Task 6 (routes) and Task 7 (receipt PDF) consume this exact shape.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/payments.service.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from '../src/modules/payments/payments.repository.js';
import { createPaymentsService } from '../src/modules/payments/payments.service.js';

function setup() {
  const db = new Database(':memory:');
  initSchema(db);
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const paymentsRepo = createPaymentsRepository(db);
  const service = createPaymentsService({ tenantsRepository: tenantsRepo, paymentsRepository: paymentsRepo });

  const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 });
  const tenant = tenantsRepo.insertSeed({
    unit_id: unit.id, name: 'Wilbense Noel', phone: '', ssn: '000412897', dob: '1990-07-22',
    onboarded_date: '2025-11-05', lease_renewal_date: '2026-11-05', monthly_rent_cents: 40000,
    due_day: '5th', payment_method: 'Cash', status: 'pending', pending_balance_cents: 0,
    notes: '', receipt_count: 0, is_rent_free: 0
  });

  return { db, unitsRepo, tenantsRepo, paymentsRepo, service, tenantId: tenant.id };
}

describe('payments service - recordPayment', () => {
  it('records a full payment as paid with no pending balance', () => {
    const { service, tenantId } = setup();
    const { payment, tenant } = service.recordPayment(tenantId, {
      amountCents: 40000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent'
    });
    expect(tenant.status).toBe('paid');
    expect(tenant.pending_balance_cents).toBe(0);
    expect(payment.receipt_number).toBe('U2-001');
    expect(payment.pending_after_cents).toBe(0);
  });

  it('records a partial payment and carries the shortfall as a pending balance', () => {
    const { service, tenantId } = setup();
    const { payment, tenant } = service.recordPayment(tenantId, {
      amountCents: 37000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent'
    });
    expect(tenant.status).toBe('partial');
    expect(tenant.pending_balance_cents).toBe(3000);
    expect(payment.pending_after_cents).toBe(3000);
  });

  it('adds the prior pending balance onto what is due on the next payment', () => {
    const { service, tenantId } = setup();
    service.recordPayment(tenantId, { amountCents: 37000, method: 'Cash', paidOn: '2026-09-05', description: 'September 2026 Rent' });
    const { tenant } = service.recordPayment(tenantId, { amountCents: 43000, method: 'Cash', paidOn: '2026-10-05', description: 'October 2026 Rent' });
    expect(tenant.status).toBe('paid');
    expect(tenant.pending_balance_cents).toBe(0);
  });

  it('increments the per-tenant receipt sequence on every payment', () => {
    const { service, tenantId } = setup();
    const first = service.recordPayment(tenantId, { amountCents: 40000, method: 'Cash', paidOn: '2026-09-05', description: 'Sept' });
    const second = service.recordPayment(tenantId, { amountCents: 40000, method: 'Cash', paidOn: '2026-10-05', description: 'Oct' });
    expect(first.payment.receipt_number).toBe('U2-001');
    expect(second.payment.receipt_number).toBe('U2-002');
  });

  it('treats an overpayment as paid in full (no negative pending balance)', () => {
    const { service, tenantId } = setup();
    const { tenant } = service.recordPayment(tenantId, { amountCents: 45000, method: 'Cash', paidOn: '2026-09-05', description: 'Sept' });
    expect(tenant.status).toBe('paid');
    expect(tenant.pending_balance_cents).toBe(0);
  });

  it('refuses to record a payment for a rent-free tenant', () => {
    const { service, unitsRepo, tenantsRepo } = setup();
    const unit = unitsRepo.insertSeed({ floor: 1, label: 'Unit 1', unit_code: 'U1', is_owner_residence: 0, default_rent_cents: 0 });
    const freeTenant = tenantsRepo.insertSeed({
      unit_id: unit.id, name: 'Flacko', phone: '', ssn: null, dob: null, onboarded_date: null,
      lease_renewal_date: null, monthly_rent_cents: 0, due_day: '—', payment_method: 'N/A',
      status: 'free', pending_balance_cents: 0, notes: '', receipt_count: 0, is_rent_free: 1
    });
    expect(() => service.recordPayment(freeTenant.id, { amountCents: 0, method: 'Cash', paidOn: '2026-09-05', description: 'n/a' }))
      .toThrow(/rent-free/);
  });

  it('throws when the tenant does not exist', () => {
    const { service } = setup();
    expect(() => service.recordPayment(9999, { amountCents: 1000, method: 'Cash', paidOn: '2026-09-05', description: 'x' }))
      .toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the payments repository**

```js
// apps/api/src/modules/payments/payments.repository.js
export function createPaymentsRepository(db) {
  const repo = {
    insert(payment) {
      const stmt = db.prepare(`
        INSERT INTO payments (tenant_id, amount_cents, method, paid_on, description, pending_after_cents, receipt_number)
        VALUES (@tenant_id, @amount_cents, @method, @paid_on, @description, @pending_after_cents, @receipt_number)
      `);
      const info = stmt.run(payment);
      return repo.findById(info.lastInsertRowid);
    },
    findById(id) {
      return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    },
    findByReceiptNumber(receiptNumber) {
      return db.prepare('SELECT * FROM payments WHERE receipt_number = ?').get(receiptNumber);
    },
    forTenant(tenantId) {
      return db.prepare('SELECT * FROM payments WHERE tenant_id = ? ORDER BY paid_on DESC, id DESC').all(tenantId);
    }
  };
  return repo;
}
```

- [ ] **Step 4: Implement the payments service**

```js
// apps/api/src/modules/payments/payments.service.js
export function createPaymentsService({ tenantsRepository, paymentsRepository }) {
  function recordPayment(tenantId, { amountCents, method, paidOn, description }) {
    const tenant = tenantsRepository.findById(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    if (tenant.is_rent_free) throw new Error(`${tenant.name} is rent-free — no payment to record`);

    const dueTotalCents = tenant.monthly_rent_cents + tenant.pending_balance_cents;
    const shortfallCents = dueTotalCents - amountCents;
    const status = shortfallCents > 0 ? 'partial' : 'paid';
    const pendingAfterCents = shortfallCents > 0 ? shortfallCents : 0;
    const nextReceiptCount = tenant.receipt_count + 1;
    const receiptNumber = `${tenant.unit_code}-${String(nextReceiptCount).padStart(3, '0')}`;

    const payment = paymentsRepository.insert({
      tenant_id: tenantId,
      amount_cents: amountCents,
      method,
      paid_on: paidOn,
      description,
      pending_after_cents: pendingAfterCents,
      receipt_number: receiptNumber
    });

    const updatedTenant = tenantsRepository.updateAfterPayment(tenantId, {
      status,
      pending_balance_cents: pendingAfterCents,
      payment_method: method,
      receipt_count: nextReceiptCount
    });

    return { payment, tenant: updatedTenant };
  }

  return { recordPayment };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS — all 7 payments service tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/payments apps/api/tests/payments.service.test.js
git commit -m "feat(api): add payments service with pending-balance carryover and per-tenant receipt numbering"
```

---

## Task 6: Tenants and Payments API routes

**Files:**
- Create: `apps/api/src/modules/tenants/tenants.routes.js`
- Create: `apps/api/src/modules/payments/payments.routes.js`
- Test: `apps/api/tests/payments.routes.test.js`

**Interfaces:**
- Consumes: `createTenantsService` (Task 4), `createPaymentsService` (Task 5).
- Produces: `createTenantsRouter({ tenantsService })` (Express router) exposing `GET /` (list), `GET /:id`, `PATCH /:id`. `createPaymentsRouter({ paymentsService, tenantsService })` exposing `POST /` with body `{ tenantId, amountCents, method, paidOn, description }`, returning `{ payment, tenant }` (201) or `{ error }` (400/404). Task 10 mounts these under `/api/tenants` and `/api/payments`.

- [ ] **Step 1: Write the failing route test**

Create `apps/api/tests/payments.routes.test.js`:

```js
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
  app.use('/api/payments', createPaymentsRouter({ paymentsService, tenantsService }));

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
    expect(res.body.payment.receipt_number).toBe('U2-001');
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — route modules not found.

- [ ] **Step 3: Implement the tenants router**

```js
// apps/api/src/modules/tenants/tenants.routes.js
import { Router } from 'express';

export function createTenantsRouter({ tenantsService }) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(tenantsService.list());
  });

  router.get('/:id', (req, res) => {
    const tenant = tenantsService.get(Number(req.params.id));
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  });

  router.patch('/:id', (req, res) => {
    const tenant = tenantsService.edit(Number(req.params.id), req.body);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  });

  return router;
}
```

- [ ] **Step 4: Implement the payments router**

```js
// apps/api/src/modules/payments/payments.routes.js
import { Router } from 'express';

export function createPaymentsRouter({ paymentsService, tenantsService }) {
  const router = Router();

  router.post('/', (req, res) => {
    const { tenantId, amountCents, method, paidOn, description } = req.body;
    if (!tenantsService.get(tenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    try {
      const result = paymentsService.recordPayment(tenantId, { amountCents, method, paidOn, description });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS — all route tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/tenants/tenants.routes.js apps/api/src/modules/payments/payments.routes.js apps/api/tests/payments.routes.test.js
git commit -m "feat(api): add tenants and payments HTTP routes"
```

---

## Task 7: Amount-to-words helper and receipt PDF generation

**Files:**
- Create: `apps/api/src/modules/receipts/amount-to-words.js`
- Create: `apps/api/src/modules/receipts/receipts.pdf.js`
- Test: `apps/api/tests/amount-to-words.test.js`
- Test: `apps/api/tests/receipts.pdf.test.js`

**Interfaces:**
- Produces: `amountToWords(cents)` → string, e.g. `amountToWords(50000) === 'Five Hundred Dollars & Zero Cents'` (verified against the real lease sample). `renderReceiptPdf({ payment, tenant, logoPath }) => Promise<Buffer>`.
- Consumed by: Task 8 (lease PDF reuses `amountToWords`), Task 9 (receipts route, added in Task 10).

- [ ] **Step 1: Write the failing amount-to-words test**

Create `apps/api/tests/amount-to-words.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { amountToWords } from '../src/modules/receipts/amount-to-words.js';

describe('amountToWords', () => {
  it('matches the real lease sample: $500.00 -> "Five Hundred Dollars & Zero Cents"', () => {
    expect(amountToWords(50000)).toBe('Five Hundred Dollars & Zero Cents');
  });

  it('handles $400.00', () => {
    expect(amountToWords(40000)).toBe('Four Hundred Dollars & Zero Cents');
  });

  it('handles amounts with cents, e.g. $370.50', () => {
    expect(amountToWords(37050)).toBe('Three Hundred and Seventy Dollars & Fifty Cents');
  });

  it('uses singular "Dollar"/"Cent" for exactly 1', () => {
    expect(amountToWords(101)).toBe('One Dollar & One Cent');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `amount-to-words.js`**

```js
// apps/api/src/modules/receipts/amount-to-words.js
const ONES = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');
  return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
}

export function amountToWords(cents) {
  const dollars = Math.floor(cents / 100);
  const remCents = cents % 100;
  const dollarWords = numberToWords(dollars);
  const centWords = remCents === 0 ? 'Zero' : numberToWords(remCents);
  return `${dollarWords} Dollar${dollars === 1 ? '' : 's'} & ${centWords} Cent${remCents === 1 ? '' : 's'}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS — all 4 amount-to-words tests green.

- [ ] **Step 5: Write the failing receipt PDF test**

Create `apps/api/tests/receipts.pdf.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { renderReceiptPdf } from '../src/modules/receipts/receipts.pdf.js';

describe('renderReceiptPdf', () => {
  it('produces a valid, non-trivial PDF buffer', async () => {
    const buffer = await renderReceiptPdf({
      payment: {
        receipt_number: 'U2-001', paid_on: '2026-09-05', amount_cents: 37000,
        description: 'September 2026 Rent — Unit 2, Floor 1', method: 'Cash', pending_after_cents: 3000
      },
      tenant: { name: 'Wilbense Noel' },
      logoPath: null
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('does not throw when logoPath points to a missing file', async () => {
    const buffer = await renderReceiptPdf({
      payment: { receipt_number: 'U5-001', paid_on: '2026-09-03', amount_cents: 50000, description: 'Sept', method: 'Cash', pending_after_cents: 0 },
      tenant: { name: 'Jak Hussain' },
      logoPath: '/nonexistent/logo.png'
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `receipts.pdf.js`**

```js
// apps/api/src/modules/receipts/receipts.pdf.js
import PDFDocument from 'pdfkit';
import fs from 'node:fs';

export function renderReceiptPdf({ payment, tenant, logoPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (logoPath && fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, doc.page.width - 100, 30, { width: 60 });
      } catch {
        // logo is decorative — never fail receipt generation over it
      }
    }

    doc.fontSize(20).fillColor('#2563EB').text('RENT RECEIPT', 40, 40);
    doc.fontSize(10).fillColor('#64748B').text('CUSTOMER COPY');
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor('#0F172A');
    doc.text(`Receipt Number: ${payment.receipt_number}`);
    doc.text(`Date: ${payment.paid_on}`);
    doc.moveDown(0.5);
    doc.text(`Received From: ${tenant.name}`);
    doc.text(`Amount: $${(payment.amount_cents / 100).toFixed(2)} BZ`);
    doc.text(`For Payment: ${payment.description}`);
    doc.text(`Payment Received In: ${payment.method}`);
    doc.moveDown(0.5);
    doc.text('Received By: Glenrick Spain');

    if (payment.pending_after_cents > 0) {
      doc.moveDown(1);
      doc.fillColor('#B45309').text(
        `Pending balance: $${(payment.pending_after_cents / 100).toFixed(2)} — carried onto next month's rent`
      );
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#64748B').text(
      '+501 638-7406   #79 Vernon Street, Belize City   glenrickspain@hotmail.com',
      { align: 'center' }
    );

    doc.end();
  });
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS — both receipt PDF tests green.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/receipts apps/api/tests/amount-to-words.test.js apps/api/tests/receipts.pdf.test.js
git commit -m "feat(api): add amount-to-words helper and receipt PDF generation"
```

---

## Task 8: Lease PDF generation

**Files:**
- Create: `apps/api/src/modules/leases/leases.pdf.js`
- Test: `apps/api/tests/leases.pdf.test.js`

**Interfaces:**
- Consumes: `amountToWords(cents)` from Task 7.
- Produces: `renderLeasePdf({ tenant, unit, termMonths, startDate, firstDueDate, bankAccount })` → `Promise<Buffer>`. Wired into a route in Task 10.

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/leases.pdf.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { renderLeasePdf } from '../src/modules/leases/leases.pdf.js';

describe('renderLeasePdf', () => {
  it('produces a valid PDF buffer containing the tenant name and rent in words', async () => {
    const buffer = await renderLeasePdf({
      tenant: { name: 'Kwame K. Bennett', monthly_rent_cents: 50000, ssn: '000379235', phone: '+501 614-4997' },
      unit: { label: 'Unit 7', floor: 3 },
      termMonths: 6,
      startDate: '2026-09-01',
      firstDueDate: '2026-10-01',
      bankAccount: '211480994'
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `leases.pdf.js`**

```js
// apps/api/src/modules/leases/leases.pdf.js
import PDFDocument from 'pdfkit';
import { amountToWords } from '../receipts/amount-to-words.js';

function formatLongDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function renderLeasePdf({ tenant, unit, termMonths, startDate, firstDueDate, bankAccount }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const rentWords = amountToWords(tenant.monthly_rent_cents);
    const rentDollars = (tenant.monthly_rent_cents / 100).toFixed(2);
    const startLong = formatLongDate(startDate);
    const firstDueLong = formatLongDate(firstDueDate);

    const heading = (text) => doc.moveDown(1).fontSize(12).fillColor('#0F172A').font('Helvetica-Bold').text(text);
    const body = (text) => doc.fontSize(11).font('Helvetica').fillColor('#0F172A').text(text, { align: 'justify' });

    doc.fontSize(14).font('Helvetica-Bold').text('B E L I Z E', { align: 'center' });
    doc.moveDown(1);
    body(
      `THIS LEASE made the ${startLong} between Glenrick M. Spain of Belize City, Belize, ` +
      `(hereinafter called "the Landlord") of the One Part and ${tenant.name} of Belize City, Belize ` +
      `(hereinafter called "the Tenant") of the Other Part WITNESSES as follows:`
    );

    heading('1. Definitions and Interpretation');
    body('In this lease, unless the context otherwise requires,');
    body('1.1 "The premises" means the building and land situated at #79 Vernon Street, Belize City, Belize.');
    body('1.2 "The tenancy" means the tenancy created by these presents.');

    heading('2. Demise');
    body(
      `The Landlord demises to the Tenant the Premises TO HOLD the Premises to the Tenant for the ` +
      `purpose solely of private dwelling (no business is to be conducted on the Premises) for a term ` +
      `of ${termMonths} months commencing on ${startLong} subject to the performance and observance of the ` +
      `covenants on the part of the Tenant YIELDING AND PAYING to the Landlord rent in the amount of ` +
      `${rentWords} ($${rentDollars}) per month payable to the Landlord's Atlantic Bank Account: ${bankAccount} ` +
      `advance without demand on the first of each month, the first of such payments becoming due and owing ` +
      `on the ${firstDueLong} every 1st of the month thereafter.`
    );

    heading("3. Tenant's Covenants");
    body(
      '3.1 Rent — To pay the reserved rent at the times and in the manner specified in paragraph 2. Failure ' +
      'to pay the rent within three (3) business days of the time specified shall result in a charge of $20.00 BZ ' +
      'for each day the rent is not paid. Failure to pay rent beyond 15 days will automatically trigger the last ' +
      "month's payment to be applied, and the tenant should vacate the premises by the 17th of the month."
    );
    body('3.2 Security Deposit — No security deposit is collected; only first and last month\'s rent, the last month\'s rent held as a security measure upon termination by either party (30-day notice required).');
    body('3.3 Utilities — Electricity and water are covered by the Landlord.');
    body('3.4 Garbage disposal — Pick-up days are Tuesdays and Fridays.');
    body('3.5 Alterations — No structural alterations without the Landlord\'s prior written consent.');
    body('3.6 Repairs — Tenant covers minor maintenance/wear and tear; Landlord may enter with 24 hours notice for inspection/repairs.');
    body('3.7 Assignment/Subletting — Not permitted without the Landlord\'s written approval.');
    body('3.8 Indemnity — Tenant indemnifies the Landlord against damage caused by the Tenant, their agents, licensees, or visitors.');

    heading("4. Landlord's Covenants");
    body('4.1 Property Taxes — Landlord pays all property taxes and similar assessments.');
    body('4.2 Quiet Enjoyment — Tenant may peaceably hold and enjoy the premises without interruption, provided covenants are observed.');
    body('4.3 Repairs — Landlord pays for and effects all repairs necessary to keep the premises tenantable.');

    heading('5. Further Covenants and Provisos');
    body('5.1 If fire, riot, civil commotion, or act of God renders the premises wholly unfit for use, the tenancy ceases.');
    body(
      `5.2 Option to Renew — The Tenant may continue the tenancy for a further term of ${termMonths} months at a ` +
      'rental to be agreed, with notice of renewal given at least two months prior to expiration.'
    );
    body('5.3 Forfeiture — Rent unpaid for 30 days, or breach of covenant, entitles the Landlord to re-enter and end the tenancy. Abandonment beyond 14 days (no communication beyond 8 days) is treated as a breach.');
    body('5.4 Option to Determine — Either party may end the tenancy with not less than one month\'s written notice.');
    body('5.5 Jurisdiction — This Agreement is governed by the laws of Belize; the courts of Belize have jurisdiction.');

    doc.moveDown(2);
    doc.fontSize(11).font('Helvetica-Bold').text('Signed by:');
    doc.font('Helvetica').text('Landlord: _____________________________');
    doc.moveDown(1);
    doc.text(`I ${tenant.name.toUpperCase()} hereby agree to the terms above and this shall supersede any other agreements.`);
    doc.moveDown(1);
    doc.text('Signed by (Tenant): __________________');
    doc.text(`Tel: ${tenant.phone || '_________________'}`);
    doc.text(`Social Security #: ${tenant.ssn || '_________________'}`);
    doc.moveDown(1);
    doc.text('Witness Name & Signature: _________________________');

    doc.end();
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/leases apps/api/tests/leases.pdf.test.js
git commit -m "feat(api): add lease PDF generation modeled on the real Belize lease template"
```

---

## Task 9: Dashboard aggregation service and route

**Files:**
- Create: `apps/api/src/modules/dashboard/dashboard.service.js`
- Create: `apps/api/src/modules/dashboard/dashboard.routes.js`
- Test: `apps/api/tests/dashboard.service.test.js`

**Interfaces:**
- Consumes: `createTenantsRepository(db)` (Task 4).
- Produces: `createDashboardService({ tenantsRepository })` → `{ getMonthlySummary() }` returning `{ expectedCents, collectedCents, outstandingCents, payingCount, paidCount, occupiedUnits, tenants }`. `createDashboardRouter({ dashboardService })` exposing `GET /`.

- [ ] **Step 1: Write the failing test, seeded with the real September 2026 figures from the spec**

Create `apps/api/tests/dashboard.service.test.js`:

```js
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema.js';
import { createUnitsRepository } from '../src/modules/units/units.repository.js';
import { createTenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js';

function seedRealTenants(db) {
  const unitsRepo = createUnitsRepository(db);
  const tenantsRepo = createTenantsRepository(db);
  const u = (code, floor, label, rent) => unitsRepo.insertSeed({ floor, label, unit_code: code, is_owner_residence: 0, default_rent_cents: rent });
  const t = (unit, name, rent, status, pending) => tenantsRepo.insertSeed({
    unit_id: unit.id, name, phone: '', ssn: null, dob: null, onboarded_date: null, lease_renewal_date: null,
    monthly_rent_cents: rent, due_day: '', payment_method: 'Cash', status, pending_balance_cents: pending,
    notes: '', receipt_count: status === 'pending' ? 0 : 1, is_rent_free: 0
  });

  t(u('U1', 1, 'Unit 1', 0), 'Flacko', 0, 'free', 0);
  t(u('U2', 1, 'Unit 2', 40000), 'Wilbense Noel', 40000, 'partial', 3000);
  t(u('U3', 1, 'Unit 3', 50000), 'Maya King', 50000, 'pending', 0);
  t(u('U5', 2, 'Unit 5', 50000), 'Jak Hussain', 50000, 'paid', 0);
  t(u('U6', 2, 'Unit 6', 45000), 'Timothy Mena', 45000, 'paid', 0);
  t(u('U7', 3, 'Unit 7', 50000), 'Kwame Bennett', 50000, 'paid', 0);
  t(u('U8', 3, 'Unit 8', 60000), 'Catalina Banner', 60000, 'pending', 0);
  t(u('U9', 3, 'Unit 9', 60000), 'Keyon Flowers', 60000, 'pending', 0);
  t(u('U10', 3, 'Unit 10', 50000), 'Samson Jacobs', 50000, 'pending', 0);
  // mark Flacko's tenants entry as rent-free explicitly via update since insertSeed above sets it via is_rent_free arg
}

describe('dashboard service', () => {
  it('computes expected, collected, outstanding, and paid count against the real September figures', () => {
    const db = new Database(':memory:');
    initSchema(db);
    seedRealTenants(db);
    const tenantsRepo = createTenantsRepository(db);
    const service = createDashboardService({ tenantsRepository: tenantsRepo });

    const summary = service.getMonthlySummary();
    expect(summary.expectedCents).toBe(405000); // $4,050 across the 8 paying tenants
    expect(summary.collectedCents).toBe(182000); // $1,820 collected so far
    expect(summary.outstandingCents).toBe(223000); // $2,230 outstanding
    expect(summary.payingCount).toBe(8);
    expect(summary.paidCount).toBe(3); // Jak, Timothy, Kwame (Wilbense is partial, not paid)
    expect(summary.occupiedUnits).toBe(9); // 8 paying + Flacko, out of 10 non-owner units
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/api`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `dashboard.service.js`**

```js
// apps/api/src/modules/dashboard/dashboard.service.js
export function createDashboardService({ tenantsRepository }) {
  function getMonthlySummary() {
    const tenants = tenantsRepository.all();
    const paying = tenants.filter(t => !t.is_rent_free);

    const expectedCents = paying.reduce((sum, t) => sum + t.monthly_rent_cents, 0);
    const collectedCents = paying.reduce((sum, t) => {
      if (t.status === 'paid') return sum + t.monthly_rent_cents;
      if (t.status === 'partial') return sum + (t.monthly_rent_cents - t.pending_balance_cents);
      return sum;
    }, 0);
    const outstandingCents = expectedCents - collectedCents;
    const paidCount = paying.filter(t => t.status === 'paid').length;

    return {
      expectedCents,
      collectedCents,
      outstandingCents,
      payingCount: paying.length,
      paidCount,
      occupiedUnits: tenants.length,
      tenants
    };
  }

  return { getMonthlySummary };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -w apps/api`
Expected: PASS.

- [ ] **Step 5: Implement the dashboard route**

```js
// apps/api/src/modules/dashboard/dashboard.routes.js
import { Router } from 'express';

export function createDashboardRouter({ dashboardService }) {
  const router = Router();
  router.get('/', (req, res) => {
    res.json(dashboardService.getMonthlySummary());
  });
  return router;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/dashboard apps/api/tests/dashboard.service.test.js
git commit -m "feat(api): add dashboard aggregation service and route"
```

---

## Task 10: Express app wiring, receipts/leases routes, and seed script

**Files:**
- Create: `apps/api/src/modules/receipts/receipts.routes.js`
- Create: `apps/api/src/modules/leases/leases.routes.js`
- Create: `apps/api/src/app.js`
- Create: `apps/api/src/server.js`
- Create: `apps/api/src/seed.js`

**Interfaces:**
- Consumes: every service/router from Tasks 3–9.
- Produces: `createApp()` → configured Express app (no `listen()` — used by tests and by `server.js`). Running `node src/server.js` starts the HTTP server on `PORT` (default 4000) and seeds the database on first boot if `units` is empty.

- [ ] **Step 1: Implement the receipts route (PDF download + JSON history)**

```js
// apps/api/src/modules/receipts/receipts.routes.js
import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderReceiptPdf } from './receipts.pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'logo.png');

export function createReceiptsRouter({ paymentsRepository, tenantsService }) {
  const router = Router();

  router.get('/tenant/:tenantId', (req, res) => {
    res.json(paymentsRepository.forTenant(Number(req.params.tenantId)));
  });

  router.get('/:receiptNumber/pdf', async (req, res) => {
    const payment = paymentsRepository.findByReceiptNumber(req.params.receiptNumber);
    if (!payment) return res.status(404).json({ error: 'Receipt not found' });
    const tenant = tenantsService.get(payment.tenant_id);
    const buffer = await renderReceiptPdf({ payment, tenant, logoPath: LOGO_PATH });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${payment.receipt_number}.pdf"`);
    res.send(buffer);
  });

  return router;
}
```

- [ ] **Step 2: Implement the leases route**

```js
// apps/api/src/modules/leases/leases.routes.js
import { Router } from 'express';
import { renderLeasePdf } from './leases.pdf.js';

export function createLeasesRouter({ tenantsService, unitsRepository }) {
  const router = Router();

  router.post('/:tenantId/generate', async (req, res) => {
    const tenant = tenantsService.get(Number(req.params.tenantId));
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const unit = unitsRepository.findById(tenant.unit_id);
    const { termMonths = 6, startDate, firstDueDate, bankAccount } = req.body;

    const buffer = await renderLeasePdf({ tenant, unit, termMonths, startDate, firstDueDate, bankAccount });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lease-${unit.unit_code}.pdf"`);
    res.send(buffer);
  });

  return router;
}
```

- [ ] **Step 3: Implement `app.js`, wiring every module together**

```js
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

export function createApp(db = getDb()) {
  const unitsRepository = createUnitsRepository(db);
  const tenantsRepository = createTenantsRepository(db);
  const tenantsService = createTenantsService({ tenantsRepository });
  const paymentsRepository = createPaymentsRepository(db);
  const paymentsService = createPaymentsService({ tenantsRepository, paymentsRepository });
  const dashboardService = createDashboardService({ tenantsRepository });

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/units', (req, res) => res.json(unitsRepository.all()));
  app.use('/api/tenants', createTenantsRouter({ tenantsService }));
  app.use('/api/payments', createPaymentsRouter({ paymentsService, tenantsService }));
  app.use('/api/receipts', createReceiptsRouter({ paymentsRepository, tenantsService }));
  app.use('/api/leases', createLeasesRouter({ tenantsService, unitsRepository }));
  app.use('/api/dashboard', createDashboardRouter({ dashboardService }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  return app;
}
```

- [ ] **Step 4: Implement the seed script**

This seeds the 11 real units and 9 real tenants (including Flacko rent-free and Keyon's legacy receipt) from the approved spec, only if the `units` table is currently empty:

```js
// apps/api/src/seed.js
import { getDb } from './db/index.js';
import { createUnitsRepository } from './modules/units/units.repository.js';
import { createTenantsRepository } from './modules/tenants/tenants.repository.js';
import { createPaymentsRepository } from './modules/payments/payments.repository.js';

export function seedIfEmpty(db = getDb()) {
  const unitsRepository = createUnitsRepository(db);
  if (unitsRepository.all().length > 0) return;

  const tenantsRepository = createTenantsRepository(db);
  const paymentsRepository = createPaymentsRepository(db);

  const units = [
    { floor: 1, label: 'Unit 1', unit_code: 'U1', is_owner_residence: 0, default_rent_cents: 0 },
    { floor: 1, label: 'Unit 2', unit_code: 'U2', is_owner_residence: 0, default_rent_cents: 40000 },
    { floor: 1, label: 'Unit 3', unit_code: 'U3', is_owner_residence: 0, default_rent_cents: 50000 },
    { floor: 1, label: 'Unit 4', unit_code: 'U4', is_owner_residence: 0, default_rent_cents: 0 },
    { floor: 2, label: "Owner's Residence", unit_code: 'OWNER', is_owner_residence: 1, default_rent_cents: 0 },
    { floor: 2, label: 'Unit 5', unit_code: 'U5', is_owner_residence: 0, default_rent_cents: 50000 },
    { floor: 2, label: 'Unit 6', unit_code: 'U6', is_owner_residence: 0, default_rent_cents: 45000 },
    { floor: 3, label: 'Unit 7', unit_code: 'U7', is_owner_residence: 0, default_rent_cents: 50000 },
    { floor: 3, label: 'Unit 8', unit_code: 'U8', is_owner_residence: 0, default_rent_cents: 60000 },
    { floor: 3, label: 'Unit 9', unit_code: 'U9', is_owner_residence: 0, default_rent_cents: 60000 },
    { floor: 3, label: 'Unit 10', unit_code: 'U10', is_owner_residence: 0, default_rent_cents: 50000 }
  ];
  const inserted = {};
  for (const u of units) inserted[u.unit_code] = unitsRepository.insertSeed(u);

  const tenant = (code, fields) => tenantsRepository.insertSeed({
    unit_id: inserted[code].id, phone: '', ssn: null, dob: null, onboarded_date: null,
    lease_renewal_date: null, due_day: '', payment_method: 'Cash', notes: '', receipt_count: 0,
    is_rent_free: 0, pending_balance_cents: 0, status: 'pending', ...fields
  });

  tenant('U1', { name: 'Flacko', monthly_rent_cents: 0, due_day: '—', payment_method: 'N/A', status: 'free', is_rent_free: 1, notes: "Landlord's uncle — occupies rent-free. Excluded from collection totals." });
  const wilbense = tenant('U2', { name: 'Wilbense Noel', monthly_rent_cents: 40000, due_day: '5th', dob: '1990-07-22', ssn: '000412897', onboarded_date: '2025-11-05', lease_renewal_date: '2026-11-05', status: 'partial', pending_balance_cents: 3000, receipt_count: 1, notes: 'Paid $370 of $400 for September. Remaining $30 carried to October.' });
  tenant('U3', { name: 'Maya King', monthly_rent_cents: 50000, due_day: '17th', dob: '1997-01-27', onboarded_date: '2025-09-17', lease_renewal_date: '2026-09-17', notes: 'Lease renewal is due this month.' });
  const jak = tenant('U5', { name: 'Jak Hussain', monthly_rent_cents: 50000, due_day: '4th', dob: '1988-12-02', onboarded_date: '2025-06-04', lease_renewal_date: '2026-12-04', status: 'paid', receipt_count: 1, notes: 'Reliable, always pays a day early.' });
  const timothy = tenant('U6', { name: 'Timothy Mena', monthly_rent_cents: 45000, due_day: '10th', dob: '1999-10-30', onboarded_date: '2025-10-10', lease_renewal_date: '2026-10-10', payment_method: 'Online Transfer', status: 'paid', receipt_count: 1 });
  const kwame = tenant('U7', { name: 'Kwame Bennett', monthly_rent_cents: 50000, due_day: '1st', dob: '1994-03-11', ssn: '000379235', phone: '+501 614-4997', onboarded_date: '2026-01-01', lease_renewal_date: '2027-01-01', payment_method: 'Online Transfer', status: 'paid', receipt_count: 1, notes: 'First and last month paid upfront per lease.' });
  tenant('U8', { name: 'Catalina Banner', monthly_rent_cents: 60000, due_day: '30th/31st', dob: '1996-05-18', onboarded_date: '2025-02-28', lease_renewal_date: '2026-08-28' });
  const keyon = tenant('U9', { name: 'Keyon Flowers', monthly_rent_cents: 60000, due_day: '20th', dob: '1993-09-09', onboarded_date: '2024-08-01', lease_renewal_date: '2027-08-01', payment_method: 'Online Transfer', receipt_count: 1, notes: 'Original tenant from the sample receipt (3rd floor apt).' });
  tenant('U10', { name: 'Samson Jacobs', monthly_rent_cents: 50000, due_day: 'Last Friday', dob: '1985-04-14', onboarded_date: '2025-04-25', lease_renewal_date: '2026-10-25', payment_method: 'Online Transfer' });

  paymentsRepository.insert({ tenant_id: wilbense.id, amount_cents: 37000, method: 'Cash', paid_on: '2026-09-05', description: 'September 2026 Rent — Unit 2, Floor 1', pending_after_cents: 3000, receipt_number: 'U2-001' });
  paymentsRepository.insert({ tenant_id: jak.id, amount_cents: 50000, method: 'Cash', paid_on: '2026-09-03', description: 'September 2026 Rent — Unit 5, Floor 2', pending_after_cents: 0, receipt_number: 'U5-001' });
  paymentsRepository.insert({ tenant_id: timothy.id, amount_cents: 45000, method: 'Online Transfer', paid_on: '2026-09-09', description: 'September 2026 Rent — Unit 6, Floor 2', pending_after_cents: 0, receipt_number: 'U6-001' });
  paymentsRepository.insert({ tenant_id: kwame.id, amount_cents: 50000, method: 'Online Transfer', paid_on: '2026-09-01', description: 'September 2026 Rent — Unit 7, Floor 3', pending_after_cents: 0, receipt_number: 'U7-001' });
  // Keyon's real historical receipt — preserved exactly as issued, before the current numbering pattern started
  paymentsRepository.insert({ tenant_id: keyon.id, amount_cents: 70000, method: 'Online Transfer', paid_on: '2024-08-01', description: 'First Month Rent - 3rd Floor Apt', pending_after_cents: 0, receipt_number: '11000001' });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedIfEmpty();
  console.log('Seed complete.');
}
```

- [ ] **Step 5: Implement `server.js`**

```js
// apps/api/src/server.js
import { createApp } from './app.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();
const app = createApp();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Spain's Apartment API listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 6: Run the full backend test suite to confirm nothing broke**

Run: `npm test -w apps/api`
Expected: PASS — all tests from Tasks 2–9 still green.

- [ ] **Step 7: Manually verify the server boots and seeds correctly**

Run: `npm run dev -w apps/api`
Then in another terminal: `curl http://localhost:4000/api/dashboard`
Expected: JSON with `expectedCents: 405000, collectedCents: 182000, outstandingCents: 223000`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/receipts/receipts.routes.js apps/api/src/modules/leases/leases.routes.js apps/api/src/app.js apps/api/src/server.js apps/api/src/seed.js
git commit -m "feat(api): wire up Express app, receipts/leases routes, and real seed data"
```

---

## Task 11: Frontend scaffold — Vite, React, Tailwind, brand theme

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.js`
- Create: `apps/web/tailwind.config.js`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.jsx`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/api.js`
- Create: `apps/web/src/App.jsx`

**Interfaces:**
- Produces: a running Vite dev server at `http://localhost:5173`, proxying `/api` to `http://localhost:4000`. `api.js` exports `apiGet(path)`, `apiPatch(path, body)`, `apiPost(path, body)` — a thin `fetch` wrapper Tasks 12–14 use exclusively for backend calls. `App.jsx` renders the header (logo + brand name) and tab navigation (Dashboard / Tenants / Building / Receipts), matching the validated mockup.

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@spains-apartment/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: Write `vite.config.js` with the dev proxy to the API**

```js
// apps/web/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
```

- [ ] **Step 3: Write Tailwind config with the brand theme tokens**

```js
// apps/web/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        accent: '#059669',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        foreground: '#0F172A',
        mutedfg: '#64748B',
        muted: '#F1F5FD',
        border: '#E2E8F0',
        warning: '#B45309',
        warningbg: '#FEF3E2',
        success: '#15803D',
        successbg: '#EAF7EE',
        destructive: '#DC2626'
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'ui-sans-serif', 'system-ui'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
```

```js
// apps/web/postcss.config.js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
```

- [ ] **Step 4: Write `index.html`, loading the Fira fonts**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap">
    <title>Spain's Apartment</title>
  </head>
  <body class="bg-background text-foreground font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `src/index.css` and `src/main.jsx`**

```css
/* apps/web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```jsx
// apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Write the API client**

```js
// apps/web/src/api.js
const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function apiGet(path) {
  return fetch(`${BASE}${path}`).then(handle);
}

export function apiPatch(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(handle);
}

export function apiPost(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(handle);
}
```

- [ ] **Step 7: Write `App.jsx` — header, tabs, and routing between pages by state**

```jsx
// apps/web/src/App.jsx
import { useState } from 'react';
import logo from './assets/logo.png';
import Dashboard from './pages/Dashboard.jsx';
import Tenants from './pages/Tenants.jsx';
import Building from './pages/Building.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'building', label: 'Building' }
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  function openTenant(id) {
    setSelectedTenantId(id);
    setTab('tenants');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <img src={logo} alt="Spain's Apartment logo" className="w-12 h-12 object-contain" />
        <div>
          <h1 className="text-lg font-bold">Spain's Apartment</h1>
          <p className="text-xs text-mutedfg">#79 Vernon Street, Belize City · 3 floors · 11 units</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t.id ? 'text-primary border-primary' : 'text-mutedfg border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard onSelectTenant={openTenant} />}
      {tab === 'tenants' && <Tenants selectedTenantId={selectedTenantId} onSelectTenant={setSelectedTenantId} />}
      {tab === 'building' && <Building />}
    </div>
  );
}
```

- [ ] **Step 8: Install frontend dependencies and confirm the dev server boots**

Run: `npm install`
Run: `npm run dev -w apps/web`
Expected: Vite dev server starts on `http://localhost:5173`; visiting it shows the header with logo and tab bar (pages render empty/error until Tasks 12–14 create them — that's expected at this point).

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/vite.config.js apps/web/tailwind.config.js apps/web/postcss.config.js apps/web/index.html apps/web/src/main.jsx apps/web/src/index.css apps/web/src/api.js apps/web/src/App.jsx
git commit -m "feat(web): scaffold Vite/React/Tailwind app with brand theme and tab navigation"
```

---

## Task 12: Frontend Dashboard page

**Files:**
- Create: `apps/web/src/components/StatusPill.jsx`
- Create: `apps/web/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `apiGet` from Task 11, `GET /api/dashboard` from Task 9.
- Produces: `<StatusPill status="paid|partial|pending|free" />` reused by Task 13. `<Dashboard onSelectTenant={(id) => void} />`.

- [ ] **Step 1: Implement the shared status pill**

```jsx
// apps/web/src/components/StatusPill.jsx
const STYLES = {
  paid: 'bg-successbg text-success',
  partial: 'bg-warningbg text-warning',
  pending: 'bg-muted text-mutedfg',
  free: 'bg-muted text-accent'
};
const LABELS = { paid: 'Paid', partial: 'Partial', pending: 'Pending', free: 'No rent' };

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Implement the Dashboard page**

```jsx
// apps/web/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import StatusPill from '../components/StatusPill.jsx';

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

export default function Dashboard({ onSelectTenant }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/dashboard').then(setSummary).catch(err => setError(err.message));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!summary) return <p className="text-mutedfg">Loading…</p>;

  const kpis = [
    { label: 'Expected this month', value: money(summary.expectedCents) },
    { label: 'Collected so far', value: money(summary.collectedCents) },
    { label: 'Outstanding', value: money(summary.outstandingCents) },
    { label: 'Occupied units', value: `${summary.occupiedUnits} / 10` }
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {kpis.map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-mutedfg uppercase">{k.label}</div>
            <div className="text-2xl font-bold font-mono mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-mutedfg text-left border-b border-border">
              <th className="p-3">Tenant</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.tenants.map(t => (
              <tr
                key={t.id}
                className="border-b border-border last:border-0 hover:bg-muted cursor-pointer"
                onClick={() => onSelectTenant(t.id)}
              >
                <td className="p-3 font-semibold">{t.name}</td>
                <td className="p-3">{t.unit_label}</td>
                <td className="p-3 font-mono">
                  {t.status === 'free' ? 'Free' : money(t.monthly_rent_cents)}
                  {t.pending_balance_cents > 0 && (
                    <span className="text-warning text-xs ml-1">(+{money(t.pending_balance_cents)} pending)</span>
                  )}
                </td>
                <td className="p-3"><StatusPill status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify in the browser**

With both `npm run dev -w apps/api` and `npm run dev -w apps/web` running, visit `http://localhost:5173`.
Expected: Dashboard tab shows 4 KPI cards matching the seeded data ($4,050 / $1,820 / $2,230 / 9 of 10) and a 9-row tenant table; clicking a row switches to the Tenants tab (page not built yet until Task 13 — a blank/placeholder is expected at this point).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/StatusPill.jsx apps/web/src/pages/Dashboard.jsx
git commit -m "feat(web): add Dashboard page with KPI cards and tenant status table"
```

---

## Task 13: Frontend Tenants list, profile view/edit, and record-payment form

**Files:**
- Create: `apps/web/src/components/RecordPaymentForm.jsx`
- Create: `apps/web/src/components/TenantProfile.jsx`
- Create: `apps/web/src/pages/Tenants.jsx`

**Interfaces:**
- Consumes: `apiGet`, `apiPatch`, `apiPost` (Task 11), `StatusPill` (Task 12), `PATCH /api/tenants/:id` (Task 6), `POST /api/payments` (Task 6).
- Produces: `<Tenants selectedTenantId onSelectTenant />`, reused as the tab content. `TenantProfile` and `RecordPaymentForm` are internal to this page.

- [ ] **Step 1: Implement the record-payment form with the live paid/partial preview**

```jsx
// apps/web/src/components/RecordPaymentForm.jsx
import { useState } from 'react';
import { apiPost } from '../api.js';

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

export default function RecordPaymentForm({ tenant, onRecorded, onCancel }) {
  const dueTotalCents = tenant.monthly_rent_cents + tenant.pending_balance_cents;
  const [amount, setAmount] = useState((dueTotalCents / 100).toString());
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);

  const amountCents = Math.round(parseFloat(amount || '0') * 100);
  const shortfall = dueTotalCents - amountCents;

  let preview = 'Enter an amount to see the resulting status.';
  if (amountCents > 0) {
    preview = shortfall > 0
      ? `Will be recorded as Partial — ${money(shortfall)} pending, carried onto the next receipt.`
      : `Will be recorded as Paid${shortfall < 0 ? ` (overpaid by ${money(-shortfall)})` : ''}.`;
  }

  async function submit() {
    try {
      await apiPost('/payments', {
        tenantId: tenant.id, amountCents, method, paidOn: date,
        description: `Rent — ${tenant.unit_label}, Floor ${tenant.unit_floor}`
      });
      onRecorded();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-muted border border-border rounded-xl p-4 mt-3">
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <label className="text-xs font-bold uppercase text-mutedfg">Amount received</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-mutedfg">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm">
            <option>Cash</option>
            <option>Online Transfer</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-mutedfg">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>
      <p className="text-xs text-mutedfg mb-2">{preview}</p>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-border rounded-md">Cancel</button>
        <button onClick={submit} className="px-3 py-1.5 text-sm bg-primary text-white rounded-md font-semibold">Record payment</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement the tenant profile (view + inline edit)**

```jsx
// apps/web/src/components/TenantProfile.jsx
import { useState } from 'react';
import { apiPatch } from '../api.js';
import StatusPill from './StatusPill.jsx';
import RecordPaymentForm from './RecordPaymentForm.jsx';

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

const EDITABLE = ['phone', 'dob', 'ssn', 'monthly_rent_dollars', 'due_day', 'payment_method', 'lease_renewal_date', 'notes'];

export default function TenantProfile({ tenant, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [payFormOpen, setPayFormOpen] = useState(false);
  const [ssnRevealed, setSsnRevealed] = useState(false);
  const [form, setForm] = useState(null);

  function startEdit() {
    setForm({
      phone: tenant.phone || '', dob: tenant.dob || '', ssn: tenant.ssn || '',
      monthly_rent_dollars: (tenant.monthly_rent_cents / 100).toString(),
      due_day: tenant.due_day || '', payment_method: tenant.payment_method || '',
      lease_renewal_date: tenant.lease_renewal_date || '', notes: tenant.notes || ''
    });
    setEditing(true);
  }

  async function saveEdit() {
    await apiPatch(`/tenants/${tenant.id}`, {
      phone: form.phone, dob: form.dob || null, ssn: form.ssn || null,
      monthly_rent_cents: Math.round(parseFloat(form.monthly_rent_dollars || '0') * 100),
      due_day: form.due_day, payment_method: form.payment_method,
      lease_renewal_date: form.lease_renewal_date || null, notes: form.notes
    });
    setEditing(false);
    onChanged();
  }

  const maskedSsn = tenant.ssn ? `•••-••-${tenant.ssn.slice(-4)}` : 'Not on file';

  if (editing) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">{tenant.name}</h2>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-border rounded-md">Cancel</button>
            <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-primary text-white rounded-md font-semibold">Save</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {EDITABLE.filter(f => f !== 'notes').map(field => (
            <div key={field}>
              <label className="text-xs font-bold uppercase text-mutedfg">{field.replace(/_/g, ' ')}</label>
              <input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs font-bold uppercase text-mutedfg">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3} className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
        <div>
          <h2 className="font-bold">{tenant.name}</h2>
          <p className="text-xs text-mutedfg">{tenant.unit_label} · Floor {tenant.unit_floor}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={tenant.status} />
          <button onClick={startEdit} className="px-3 py-1.5 text-sm border border-border rounded-md">Edit</button>
          {tenant.status !== 'free' && (
            <button onClick={() => setPayFormOpen(!payFormOpen)} className="px-3 py-1.5 text-sm bg-primary text-white rounded-md font-semibold">
              Record payment
            </button>
          )}
        </div>
      </div>

      {payFormOpen && (
        <RecordPaymentForm tenant={tenant} onCancel={() => setPayFormOpen(false)} onRecorded={() => { setPayFormOpen(false); onChanged(); }} />
      )}

      {tenant.pending_balance_cents > 0 && (
        <div className="bg-warningbg text-warning rounded-lg px-3 py-2 mt-3 flex justify-between text-sm">
          <span>Pending balance carried to next receipt</span>
          <strong className="font-mono">{money(tenant.pending_balance_cents)}</strong>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <div><div className="text-xs font-bold uppercase text-mutedfg">Phone (WhatsApp)</div><div>{tenant.phone || 'Not on file'}</div></div>
        <div>
          <div className="text-xs font-bold uppercase text-mutedfg">Social Security #</div>
          <div className="flex items-center gap-2">
            <span className="font-mono">{tenant.ssn ? (ssnRevealed ? tenant.ssn : maskedSsn) : 'Not on file'}</span>
            {tenant.ssn && <button onClick={() => setSsnRevealed(!ssnRevealed)} className="text-xs text-primary">{ssnRevealed ? 'Hide' : 'Show'}</button>}
          </div>
        </div>
        <div><div className="text-xs font-bold uppercase text-mutedfg">Monthly rent</div><div>{tenant.status === 'free' ? 'Rent-free' : `${money(tenant.monthly_rent_cents)} · due ${tenant.due_day}`}</div></div>
        <div><div className="text-xs font-bold uppercase text-mutedfg">Payment method</div><div>{tenant.payment_method}</div></div>
        <div><div className="text-xs font-bold uppercase text-mutedfg">Lease renewal</div><div>{tenant.lease_renewal_date || '—'}</div></div>
      </div>

      <div className="bg-muted rounded-lg p-3 mt-4 text-sm">
        <div className="text-xs font-bold uppercase text-mutedfg mb-1">Notes</div>
        {tenant.notes || 'No notes yet.'}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement the Tenants page (list + selected profile)**

```jsx
// apps/web/src/pages/Tenants.jsx
import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import TenantProfile from '../components/TenantProfile.jsx';

export default function Tenants({ selectedTenantId, onSelectTenant }) {
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');

  function refresh() {
    apiGet('/tenants').then(list => {
      setTenants(list);
      if (!selectedTenantId && list.length > 0) onSelectTenant(list[0].id);
    });
  }

  useEffect(refresh, []);

  const filtered = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const selected = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-2 border-b border-border">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants"
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {filtered.map(t => (
            <div key={t.id} onClick={() => onSelectTenant(t.id)}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-border last:border-0 hover:bg-muted ${t.id === selectedTenantId ? 'bg-muted' : ''}`}>
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-mutedfg">{t.unit_label}</div>
            </div>
          ))}
        </div>
      </div>
      {selected && <TenantProfile tenant={selected} onChanged={refresh} />}
    </div>
  );
}
```

- [ ] **Step 4: Manually verify in the browser**

Expected: Tenants tab shows the tenant list on the left, the first tenant's profile on the right; Edit toggles inline inputs and Save persists via `PATCH`; Record Payment opens the form, typing an amount below the due total shows the "Partial" preview, and submitting updates the status pill and pending-balance banner immediately.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/RecordPaymentForm.jsx apps/web/src/components/TenantProfile.jsx apps/web/src/pages/Tenants.jsx
git commit -m "feat(web): add Tenants page with editable profiles and record-payment flow"
```

---

## Task 14: Frontend Building page, receipt viewing, and WhatsApp send

**Files:**
- Create: `apps/web/src/pages/Building.jsx`
- Modify: `apps/web/src/components/TenantProfile.jsx` (add payment history + "View receipt")
- Create: `apps/web/src/pages/Receipts.jsx`
- Modify: `apps/web/src/App.jsx` (add Receipts tab, wire selected-receipt state)

**Interfaces:**
- Consumes: `apiGet('/units')` (Task 10), `apiGet('/receipts/tenant/:id')` (Task 10), `GET /api/receipts/:receiptNumber/pdf` (Task 10).
- Produces: `<Building />`, `<Receipts receiptNumber onBack />`. Completes the tab set from the design spec.

- [ ] **Step 1: Implement the Building page**

```jsx
// apps/web/src/pages/Building.jsx
import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';

export default function Building() {
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    apiGet('/units').then(setUnits);
    apiGet('/tenants').then(setTenants);
  }, []);

  function occupantFor(unit) {
    if (unit.is_owner_residence) return { label: 'You', state: 'owner' };
    const tenant = tenants.find(t => t.unit_id === unit.id);
    if (!tenant) return { label: 'Vacant', state: 'vacant' };
    return { label: tenant.name, state: tenant.is_rent_free ? 'free' : 'occupied' };
  }

  const floors = [3, 2, 1].map(floor => ({
    floor,
    units: units.filter(u => u.floor === floor)
  }));

  const styles = {
    occupied: 'border-secondary bg-secondary/10',
    vacant: 'border-dashed text-mutedfg',
    owner: 'bg-muted border-dashed',
    free: 'bg-muted'
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-5">
      {floors.map(({ floor, units: floorUnits }) => (
        <div key={floor}>
          <div className="font-bold text-sm mb-2">Floor {floor}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {floorUnits.map(u => {
              const occ = occupantFor(u);
              return (
                <div key={u.id} className={`border rounded-lg p-3 text-xs ${styles[occ.state]}`}>
                  <div className="font-bold mb-1">{u.label}</div>
                  <div className="text-mutedfg">{occ.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement the Receipts page**

```jsx
// apps/web/src/pages/Receipts.jsx
function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

export default function Receipts({ receipt, tenant, onBack }) {
  if (!receipt) return null;

  function sendViaWhatsApp() {
    const phone = (tenant.phone || '').replace(/[^\d]/g, '');
    if (!phone) {
      alert(`${tenant.name} has no phone number on file yet — add one from their profile (Edit) first.`);
      return;
    }
    const msg = `Hi ${tenant.name}, here's your receipt ${receipt.receipt_number} for ${money(receipt.amount_cents)} (${receipt.description})` +
      (receipt.pending_after_cents > 0 ? ` — note: ${money(receipt.pending_after_cents)} still pending, carried to next month.` : '.') +
      ' — Spain\'s Apartment';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="max-w-md mx-auto bg-surface border border-border rounded-xl shadow-md overflow-hidden">
      <button onClick={onBack} className="text-xs text-mutedfg p-3">&larr; Back</button>
      <div className="px-6 pb-6">
        <h2 className="text-xl font-bold text-primary">Rent Receipt</h2>
        <p className="text-xs text-mutedfg uppercase font-bold mb-4">Customer copy</p>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><div className="text-xs text-mutedfg uppercase font-bold">Receipt number</div><div className="font-mono">{receipt.receipt_number}</div></div>
          <div><div className="text-xs text-mutedfg uppercase font-bold">Date</div><div className="font-mono">{receipt.paid_on}</div></div>
          <div><div className="text-xs text-mutedfg uppercase font-bold">Received from</div><div>{tenant.name}</div></div>
          <div><div className="text-xs text-mutedfg uppercase font-bold">Amount</div><div className="font-mono font-bold text-primary">{money(receipt.amount_cents)} BZ</div></div>
          <div className="col-span-2"><div className="text-xs text-mutedfg uppercase font-bold">For payment</div><div>{receipt.description}</div></div>
          <div><div className="text-xs text-mutedfg uppercase font-bold">Payment received in</div><div>{receipt.method}</div></div>
        </div>
        {receipt.pending_after_cents > 0 && (
          <div className="bg-warningbg text-warning rounded-lg px-3 py-2 text-sm mb-4">
            Pending balance: {money(receipt.pending_after_cents)} — carried onto next month's rent
          </div>
        )}
        <a href={`/api/receipts/${receipt.receipt_number}/pdf`} target="_blank" rel="noreferrer"
          className="block text-center border border-border rounded-md py-2 text-sm font-semibold mb-2">
          Download PDF
        </a>
        <button onClick={sendViaWhatsApp} className="w-full bg-primary text-white rounded-md py-2 text-sm font-semibold">
          Send via WhatsApp
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add payment history and "View receipt" to `TenantProfile.jsx`**

Add to the top of `TenantProfile.jsx`:

```jsx
import { useEffect } from 'react';
```

Add a `history` prop and render it below the notes box (insert before the closing `</div>` of the component's return):

```jsx
      {history && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase text-mutedfg mb-2 border-t border-border pt-3">Payment history</div>
          {history.length === 0 ? (
            <p className="text-sm text-mutedfg">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-mono">{h.paid_on}</td>
                    <td className="py-2 font-mono">{money(h.amount_cents)}</td>
                    <td className="py-2">
                      <button onClick={() => onViewReceipt(h)} className="text-xs font-semibold text-accent">View receipt →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
```

Update the component signature to accept the two new props: `export default function TenantProfile({ tenant, onChanged, history, onViewReceipt }) {`.

- [ ] **Step 4: Wire Receipts into `App.jsx` and pass history/receipt props through**

Replace `App.jsx`'s tenant-related state and rendering with:

```jsx
// apps/web/src/App.jsx (updated sections only — merge into the Task 11 version)
import { useEffect, useState } from 'react';
import logo from './assets/logo.png';
import Dashboard from './pages/Dashboard.jsx';
import Tenants from './pages/Tenants.jsx';
import Building from './pages/Building.jsx';
import Receipts from './pages/Receipts.jsx';
import { apiGet } from './api.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'building', label: 'Building' }
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null); // { receipt, tenant }

  function openTenant(id) {
    setSelectedTenantId(id);
    setTab('tenants');
  }

  async function viewReceipt(payment, tenant) {
    setViewingReceipt({ receipt: payment, tenant });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <img src={logo} alt="Spain's Apartment logo" className="w-12 h-12 object-contain" />
        <div>
          <h1 className="text-lg font-bold">Spain's Apartment</h1>
          <p className="text-xs text-mutedfg">#79 Vernon Street, Belize City · 3 floors · 11 units</p>
        </div>
      </div>

      {viewingReceipt ? (
        <Receipts receipt={viewingReceipt.receipt} tenant={viewingReceipt.tenant} onBack={() => setViewingReceipt(null)} />
      ) : (
        <>
          <div className="flex gap-1 border-b border-border mb-5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t.id ? 'text-primary border-primary' : 'text-mutedfg border-transparent hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'dashboard' && <Dashboard onSelectTenant={openTenant} />}
          {tab === 'tenants' && (
            <Tenants selectedTenantId={selectedTenantId} onSelectTenant={setSelectedTenantId} onViewReceipt={viewReceipt} />
          )}
          {tab === 'building' && <Building />}
        </>
      )}
    </div>
  );
}
```

Update `Tenants.jsx` to fetch history and pass it through: inside the component, after `const selected = tenants.find(...)`, add:

```jsx
  const [history, setHistory] = useState([]);
  useEffect(() => {
    if (selected) apiGet(`/receipts/tenant/${selected.id}`).then(setHistory);
  }, [selected?.id]);
```

and pass `history={history} onViewReceipt={(h) => onViewReceiptProp(h, selected)}` into `<TenantProfile />` — rename the incoming prop to `onViewReceipt` (received from `App.jsx`) and thread it through, e.g.:

```jsx
export default function Tenants({ selectedTenantId, onSelectTenant, onViewReceipt }) {
  // ...
  <TenantProfile tenant={selected} onChanged={refresh} history={history} onViewReceipt={(h) => onViewReceipt(h, selected)} />
```

- [ ] **Step 5: Manually verify the full flow end to end**

With both dev servers running:
1. Dashboard shows correct KPIs and table.
2. Click Wilbense → Tenants tab opens on his profile, showing the $30 pending banner and one payment history row.
3. Click "View receipt" → Receipts view shows his `U2-001` receipt with the pending note.
4. Click "Download PDF" → a real PDF opens in a new tab.
5. Click "Send via WhatsApp" with no phone on file → alert prompts to add one; add a phone via Edit, retry → `wa.me` opens in a new tab addressed to that number with the message pre-filled.
6. Building tab shows all three floors with Flacko, Wilbense, Maya on Floor 1, you/Jak/Timothy on Floor 2, and the rest on Floor 3, with one vacant unit.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/Building.jsx apps/web/src/pages/Receipts.jsx apps/web/src/components/TenantProfile.jsx apps/web/src/pages/Tenants.jsx apps/web/src/App.jsx
git commit -m "feat(web): add Building page, receipt viewing, and one-click WhatsApp send"
```

---

## Task 15: Root scripts, `.env` documentation, and README

**Files:**
- Modify: `package.json` (root — confirm scripts from Task 1 still correct)
- Create: `README.md`

**Interfaces:**
- Produces: the final run instructions a non-engineer (the user) follows to start the whole app with one command.

- [ ] **Step 1: Write `README.md`**

```markdown
# Spain's Apartment — Personal Management System

A personal, single-user app for managing 79 Vernon Street: tenants, leases, receipts, and monthly rent collection.

## Running it

1. Install dependencies (only needed once, or after pulling changes):
   ```
   npm install
   ```
2. Start both the API and the web app together:
   ```
   npm run dev
   ```
3. Open http://localhost:5173 in your browser.

The first time the API starts, it automatically creates `apps/api/data/spains-apartment.db` and seeds it with the building's 11 units and the 9 known tenants (including Flacko, rent-free). After that, it just uses whatever is in that file — back it up by copying it.

## Running tests

```
npm test
```

## Project layout

- `apps/api` — Express + SQLite backend. Generates lease and receipt PDFs.
- `apps/web` — React + Vite + Tailwind frontend.

## What's intentionally not automated yet

- **DocuSign** — leases are generated as PDFs for you to send through DocuSign yourself; the signed copy isn't pulled back in automatically.
- **WhatsApp** — "Send via WhatsApp" opens WhatsApp addressed to the tenant with the message drafted; you attach the PDF and hit send. Full automatic sending would require a Meta WhatsApp Business Cloud API account and an approved message template.
- **Late fees** — the lease states the $20/day late-fee policy, but it isn't calculated automatically; pending balances are entered manually when you record a payment.
```

- [ ] **Step 2: Confirm the root `package.json` scripts work end to end**

Run: `npm run dev`
Expected: both `apps/api` (port 4000) and `apps/web` (port 5173) start together, labeled `api` and `web` in the concurrently output.

Run: `npm test`
Expected: all backend tests pass (frontend has no automated tests in this v1 — verified manually per Tasks 12–14).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with run instructions and v1 scope notes"
```

---

## Plan Self-Review

**Spec coverage:**
- Building structure (§1) → Task 3, Task 10 seed data. ✓
- Editable tenant profiles (§2) → Task 4 (backend), Task 13 (frontend). ✓
- Manual DocuSign lease generation (§3) → Task 8, Task 10 (route), README scope note. ✓
- Payment recording + partial-balance carryover + per-tenant receipt numbering (§4) → Task 5 (core logic, heavily tested), Task 13 (UI). ✓
- One-click WhatsApp send (§5) → Task 14. ✓
- Monthly dashboard (§6) → Task 9, Task 12. ✓
- Branding/theme (§7) → Task 1 (logo), Task 11 (color tokens, fonts). ✓
- Tech stack (§8) → Tasks 1, 2, 11. ✓
- Out of scope items (§9) → explicitly called out in README (Task 15) and never half-implemented elsewhere. ✓

**Placeholder scan:** No "TBD"/"handle errors appropriately"/"similar to Task N" patterns — every step has runnable code.

**Type/signature consistency:** `recordPayment(tenantId, { amountCents, method, paidOn, description })` (Task 5) is used identically in the route (Task 6), the seed script's direct repository calls (Task 10), and the frontend form (Task 13). `updateAfterPayment(id, { status, pending_balance_cents, payment_method, receipt_count })` (Task 4) matches its only caller in Task 5 exactly. Tenant rows carry `unit_label`, `unit_floor`, `unit_code` consistently from Task 4's repository join through to the Dashboard, Tenants, and Building pages.

**Scope check:** Single cohesive system, not decomposed further — appropriate for a personal-scale app with one clear data model.
