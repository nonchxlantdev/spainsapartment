export function createPaymentsRepository(db) {
  const repo = {
    insert(payment) {
      const stmt = db.prepare(`
        INSERT INTO payments (
          tenant_id, amount_cents, method, paid_on, description, receipt_note,
          pending_after_cents, receipt_number, rent_status
        )
        VALUES (
          @tenant_id, @amount_cents, @method, @paid_on, @description, @receipt_note,
          @pending_after_cents, @receipt_number, @rent_status
        )
      `);
      const info = stmt.run({ receipt_note: '', rent_status: '', ...payment });
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
    },
    forTenantInPaidOnRange(tenantId, fromDate, toDate) {
      return db.prepare(`
        SELECT * FROM payments
        WHERE tenant_id = ?
          AND paid_on >= ?
          AND paid_on <= ?
        ORDER BY paid_on ASC, id ASC
      `).all(tenantId, fromDate, toDate);
    },
    countForTenantMonth(tenantId, yearMonth) {
      return db.prepare(`
        SELECT COUNT(*) AS n FROM payments
        WHERE tenant_id = ? AND paid_on LIKE ?
      `).get(tenantId, `${yearMonth}-%`).n;
    },
    updateReceiptNumber(id, receiptNumber) {
      db.prepare('UPDATE payments SET receipt_number = ? WHERE id = ?').run(receiptNumber, id);
      return repo.findById(id);
    },
    updatePaidOn(id, { paid_on, receipt_number }) {
      db.prepare('UPDATE payments SET paid_on = ?, receipt_number = ? WHERE id = ?').run(paid_on, receipt_number, id);
      return repo.findById(id);
    },
    allOrdered() {
      return db.prepare('SELECT * FROM payments ORDER BY tenant_id ASC, paid_on ASC, id ASC').all();
    },
    recentWithTenant(limit = 4) {
      return db.prepare(`
        SELECT
          p.*,
          t.name AS tenant_name,
          COALESCE(u.label, '—') AS unit_label
        FROM payments p
        JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN units u ON u.id = t.unit_id
        ORDER BY datetime(p.created_at) DESC, p.id DESC
        LIMIT ?
      `).all(limit);
    }
  };
  return repo;
}
