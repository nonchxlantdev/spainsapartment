// apps/api/src/db/schema.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

function migrateTenants(db) {
  const cols = db.prepare(`PRAGMA table_info(tenants)`).all();
  if (cols.length === 0) return;

  const byName = Object.fromEntries(cols.map(c => [c.name, c]));
  const needsActive = !byName.active;
  const needsNullableUnit = byName.unit_id && byName.unit_id.notnull === 1;
  const needsEmail = !byName.email;
  const needsGender = !byName.gender;

  if (!needsActive && !needsNullableUnit && !needsEmail && !needsGender) return;

  if (!needsActive && !needsNullableUnit) {
    if (needsEmail) db.exec(`ALTER TABLE tenants ADD COLUMN email TEXT NOT NULL DEFAULT ''`);
    if (needsGender) db.exec(`ALTER TABLE tenants ADD COLUMN gender TEXT NOT NULL DEFAULT ''`);
    return;
  }

  db.exec('PRAGMA foreign_keys = OFF');
  const tx = db.transaction(() => {
    db.exec(`
      CREATE TABLE tenants_mig (
        id INTEGER PRIMARY KEY,
        unit_id INTEGER REFERENCES units(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
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
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const activeExpr = needsActive ? '1' : 'active';
    const emailExpr = needsEmail ? `''` : 'email';
    const genderExpr = needsGender ? `''` : 'gender';
    db.exec(`
      INSERT INTO tenants_mig (
        id, unit_id, name, phone, email, gender, ssn, dob, onboarded_date, lease_renewal_date,
        monthly_rent_cents, due_day, payment_method, status, pending_balance_cents,
        notes, receipt_count, is_rent_free, active, created_at
      )
      SELECT
        id, unit_id, name, phone, ${emailExpr}, ${genderExpr}, ssn, dob, onboarded_date, lease_renewal_date,
        monthly_rent_cents, due_day, payment_method, status, pending_balance_cents,
        notes, receipt_count, is_rent_free, ${activeExpr}, created_at
      FROM tenants
    `);

    db.exec('DROP TABLE tenants');
    db.exec('ALTER TABLE tenants_mig RENAME TO tenants');
  });
  tx();
  db.exec('PRAGMA foreign_keys = ON');
}

function migratePayments(db) {
  const names = columnNames(db, 'payments');
  if (names.length === 0) return;
  if (!names.includes('receipt_note')) {
    db.exec(`ALTER TABLE payments ADD COLUMN receipt_note TEXT NOT NULL DEFAULT ''`);
  }
  if (!names.includes('rent_status')) {
    db.exec(`ALTER TABLE payments ADD COLUMN rent_status TEXT NOT NULL DEFAULT ''`);
    db.exec(`
      UPDATE payments
      SET rent_status = CASE WHEN pending_after_cents > 0 THEN 'partial' ELSE 'paid' END
      WHERE rent_status = ''
    `);
  }
}

function migrateExpenses(db) {
  const names = columnNames(db, 'expenses');
  if (names.length === 0) return;
  if (!names.includes('installment_cents')) {
    db.exec('ALTER TABLE expenses ADD COLUMN installment_cents INTEGER NOT NULL DEFAULT 0');
  }
  if (!names.includes('behind_cents')) {
    db.exec('ALTER TABLE expenses ADD COLUMN behind_cents INTEGER NOT NULL DEFAULT 0');
  }
  if (!names.includes('last_accrual_month')) {
    db.exec('ALTER TABLE expenses ADD COLUMN last_accrual_month TEXT');
  }
}

export function initSchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
  migrateTenants(db);
  migratePayments(db);
  migrateExpenses(db);
}
