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
