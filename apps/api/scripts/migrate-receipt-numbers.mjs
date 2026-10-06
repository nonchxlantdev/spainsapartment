import { getDb } from '../src/db/index.js';

const map = {
  'U2-001': 'WNSP00001', // Wilbense Noel
  'U5-001': 'JHSP00001', // Jak Hussain
  'U6-001': 'TMSP00001', // Timothy Mena
  'U7-001': 'KBSP00001', // Kwame Bennett
  '11000001': 'KFSP00001' // Keyon Flowers
};

const db = getDb();
for (const [from, to] of Object.entries(map)) {
  const info = db.prepare('UPDATE payments SET receipt_number = ? WHERE receipt_number = ?').run(to, from);
  console.log(from, '->', to, 'changes', info.changes);
}
const rows = db.prepare('SELECT receipt_number, description FROM payments ORDER BY id').all();
console.log(rows);
