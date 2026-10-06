import fs from 'fs';
import http from 'http';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderReceiptPdf } from '../src/modules/receipts/receipts.pdf.js';

const buf = await renderReceiptPdf({
  payment: {
    receipt_number: 'WNSP00001',
    paid_on: '2026-09-05',
    amount_cents: 37000,
    description: 'September 2026 Rent — Unit 2, Floor 1',
    method: 'Cash',
    pending_after_cents: 3000
  },
  tenant: { name: 'Wilbense Noel', monthly_rent_cents: 40000, due_day: '5th' }
});

fs.mkdirSync('design-reference', { recursive: true });
fs.writeFileSync('design-reference/WNSP00001-balance.pdf', buf);

const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
const page = await doc.getPage(1);
const text = (await page.getTextContent()).items.map(i => i.str).join(' ');
console.log(text);
console.log('bytes', buf.length);

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve({ status: res.statusCode, buf: Buffer.concat(c) }));
    }).on('error', reject);
  });
}

try {
  const live = await get('http://localhost:4000/api/receipts/WNSP00001/pdf');
  console.log('live status', live.status, 'bytes', live.buf.length);
} catch (err) {
  console.log('live check skipped', err.message);
}
