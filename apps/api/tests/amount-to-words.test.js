import { describe, it, expect } from 'vitest';
import { amountToWords } from '../src/modules/receipts/amount-to-words.js';

describe('amountToWords', () => {
  it('matches the real lease sample: $500.00 -> "Five Hundred Dollars & Zero Cents"', () => {
    expect(amountToWords(50000)).toBe('Five Hundred Dollars & Zero Cents');
  });

  it('handles $400.00', () => {
    expect(amountToWords(40000)).toBe('Four Hundred Dollars & Zero Cents');
  });

  it('handles amounts with cents, e.g. $370.50', () => {
    expect(amountToWords(37050)).toBe('Three Hundred and Seventy Dollars & Fifty Cents');
  });

  it('uses singular "Dollar"/"Cent" for exactly 1', () => {
    expect(amountToWords(101)).toBe('One Dollar & One Cent');
  });
});
