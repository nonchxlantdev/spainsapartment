CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY,
  floor INTEGER NOT NULL,
  label TEXT NOT NULL,
  unit_code TEXT NOT NULL UNIQUE,
  is_owner_residence INTEGER NOT NULL DEFAULT 0,
  default_rent_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tenants (
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

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,
  paid_on TEXT NOT NULL,
  description TEXT NOT NULL,
  receipt_note TEXT NOT NULL DEFAULT '',
  pending_after_cents INTEGER NOT NULL DEFAULT 0,
  receipt_number TEXT NOT NULL UNIQUE,
  rent_status TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Login sessions for the password gate. Kept in SQLite (not memory) so a
-- logged-in session survives the API's `node --watch` dev restarts.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Building expense bills (utilities, property tax, etc). `coverage` names a
-- reusable coverage-group label (see expenses.config.js) for Electricity,
-- Water, and Butane; it's NULL for whole-building categories. Payments can
-- come in partially (paid_amount_cents < amount_cents) — the balance and
-- paid/partial/due/overdue status are always computed from these two
-- columns, never stored. Property Tax is an installment account: amount_cents
-- is the overall remaining, installment_cents is the monthly payment, and
-- behind_cents is how far the monthly plan has fallen behind.
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  coverage TEXT,
  amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  bill_date TEXT NOT NULL,
  due_date TEXT,
  installment_cents INTEGER NOT NULL DEFAULT 0,
  behind_cents INTEGER NOT NULL DEFAULT 0,
  last_accrual_month TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
