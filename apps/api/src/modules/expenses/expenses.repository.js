// apps/api/src/modules/expenses/expenses.repository.js
export function createExpensesRepository(db) {
  const repo = {
    all() {
      return db.prepare('SELECT * FROM expenses ORDER BY bill_date DESC, id DESC').all();
    },
    findById(id) {
      return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    },
    /** Most recent entry for a category, used to pre-fill fixed-category amounts. */
    lastForCategory(category) {
      return db
        .prepare('SELECT * FROM expenses WHERE category = ? ORDER BY bill_date DESC, id DESC LIMIT 1')
        .get(category);
    },
    insert(expense) {
      const stmt = db.prepare(`
        INSERT INTO expenses (
          category, coverage, amount_cents, paid_amount_cents, bill_date, due_date,
          installment_cents, behind_cents, last_accrual_month
        )
        VALUES (
          @category, @coverage, @amount_cents, @paid_amount_cents, @bill_date, @due_date,
          @installment_cents, @behind_cents, @last_accrual_month
        )
      `);
      const info = stmt.run({
        coverage: null,
        due_date: null,
        paid_amount_cents: 0,
        installment_cents: 0,
        behind_cents: 0,
        last_accrual_month: null,
        ...expense
      });
      return repo.findById(info.lastInsertRowid);
    },
    update(id, fields) {
      const current = repo.findById(id);
      if (!current) return null;
      const merged = { ...current, ...fields };
      db.prepare(`
        UPDATE expenses
        SET category = @category, coverage = @coverage, amount_cents = @amount_cents,
            paid_amount_cents = @paid_amount_cents, bill_date = @bill_date, due_date = @due_date,
            installment_cents = @installment_cents, behind_cents = @behind_cents,
            last_accrual_month = @last_accrual_month
        WHERE id = @id
      `).run(merged);
      return repo.findById(id);
    },
    remove(id) {
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    }
  };
  return repo;
}
