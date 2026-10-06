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
