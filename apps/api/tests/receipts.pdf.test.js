import { describe, it, expect } from 'vitest';
import { renderReceiptPdf, pendingBalanceLines, forPaymentLine } from '../src/modules/receipts/receipts.pdf.js';

describe('forPaymentLine', () => {
  it('drops a trailing due date and keeps rent for unit and floor', () => {
    expect(forPaymentLine('Rent for Unit 2, Floor 1. due 5th')).toBe('Rent for Unit 2, Floor 1');
    expect(forPaymentLine('Rent for Unit 7, Floor 2. includes $30.00 prior balance. due 1st'))
      .toBe('Rent for Unit 7, Floor 2. includes $30.00 prior balance');
    expect(forPaymentLine('Rent for Unit 2, Floor 1')).toBe('Rent for Unit 2, Floor 1');
  });
});

describe('pendingBalanceLines', () => {
  it('explains carry-over with next due day and combined amount (pre-Sep 2026 style)', () => {
    const lines = pendingBalanceLines(
      { pending_after_cents: 3000, paid_on: '2026-08-05' },
      { monthly_rent_cents: 40000, due_day: '5th' }
    );
    expect(lines[0]).toMatch(/BALANCE DUE: \$30\.00/);
    expect(lines[1]).toMatch(/Next due on the 5th: \$430\.00/);
    expect(lines[1]).toMatch(/\$400\.00 rent \+ \$30\.00 balance/);
  });

  it('uses exact MM/DD/YYYY next due for Sep 2026+ receipts', () => {
    const lines = pendingBalanceLines(
      { pending_after_cents: 3000, paid_on: '2026-09-05' },
      { monthly_rent_cents: 40000, due_day: '5th' }
    );
    expect(lines[1]).toMatch(/Next due 10\/05\/2026: \$430\.00/);
  });

  it('returns no lines when balance is cleared', () => {
    expect(pendingBalanceLines({ pending_after_cents: 0, paid_on: '2026-09-05' }, { monthly_rent_cents: 40000, due_day: '5th' })).toEqual([]);
  });
});

describe('renderReceiptPdf', () => {
  it('produces a valid, non-trivial PDF buffer', async () => {
    const buffer = await renderReceiptPdf({
      payment: {
        receipt_number: 'WN0920260001', paid_on: '2026-09-05', amount_cents: 37000,
        description: 'September 2026 Rent — Unit 2, Floor 1', method: 'Cash', pending_after_cents: 3000
      },
      tenant: { name: 'Wilbense Noel', monthly_rent_cents: 40000, due_day: '5th' },
      logoPath: null
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('does not throw when logoPath points to a missing file', async () => {
    const buffer = await renderReceiptPdf({
      payment: { receipt_number: 'JH0920260001', paid_on: '2026-09-03', amount_cents: 50000, description: 'Sept', method: 'Cash', pending_after_cents: 0 },
      tenant: { name: 'Jak Hussain' },
      logoPath: '/nonexistent/logo.png'
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
