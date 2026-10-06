const EDITABLE_FIELDS = [
  'name', 'phone', 'email', 'gender', 'ssn', 'dob', 'onboarded_date', 'lease_renewal_date',
  'monthly_rent_cents', 'due_day', 'payment_method', 'notes'
];

export function createTenantsRepository(db) {
  const SELECT = `
    SELECT t.*, u.label AS unit_label, u.floor AS unit_floor, u.unit_code AS unit_code
    FROM tenants t
    LEFT JOIN units u ON u.id = t.unit_id
  `;

  const repo = {
    all() {
      return db.prepare(`${SELECT} ORDER BY COALESCE(u.floor, 99), COALESCE(u.label, t.name)`).all();
    },
    findById(id) {
      return db.prepare(`${SELECT} WHERE t.id = ?`).get(id);
    },
    findActiveByUnitId(unitId) {
      return db.prepare(`${SELECT} WHERE t.unit_id = ? AND t.active = 1`).get(unitId);
    },
    insertSeed(tenant) {
      const stmt = db.prepare(`
        INSERT INTO tenants (unit_id, name, phone, email, gender, ssn, dob, onboarded_date, lease_renewal_date,
          monthly_rent_cents, due_day, payment_method, status, pending_balance_cents, notes,
          receipt_count, is_rent_free, active)
        VALUES (@unit_id, @name, @phone, @email, @gender, @ssn, @dob, @onboarded_date, @lease_renewal_date,
          @monthly_rent_cents, @due_day, @payment_method, @status, @pending_balance_cents, @notes,
          @receipt_count, @is_rent_free, @active)
      `);
      const info = stmt.run({ email: '', gender: '', active: 1, ...tenant });
      return repo.findById(info.lastInsertRowid);
    },
    insert(tenant) {
      return repo.insertSeed({
        phone: '',
        email: '',
        gender: '',
        ssn: null,
        dob: null,
        onboarded_date: null,
        lease_renewal_date: null,
        payment_method: 'Cash',
        status: 'pending',
        pending_balance_cents: 0,
        notes: '',
        receipt_count: 0,
        is_rent_free: 0,
        active: 1,
        ...tenant
      });
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
    },
    disable(id) {
      db.prepare(`UPDATE tenants SET active = 0, unit_id = NULL WHERE id = ?`).run(id);
      return repo.findById(id);
    }
  };
  return repo;
}

export { EDITABLE_FIELDS };
