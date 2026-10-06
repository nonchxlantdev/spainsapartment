// apps/api/src/modules/receipts/amount-to-words.js
const ONES = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');
  return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
}

export function amountToWords(cents) {
  const dollars = Math.floor(cents / 100);
  const remCents = cents % 100;
  const dollarWords = numberToWords(dollars);
  const centWords = remCents === 0 ? 'Zero' : numberToWords(remCents);
  return `${dollarWords} Dollar${dollars === 1 ? '' : 's'} & ${centWords} Cent${remCents === 1 ? '' : 's'}`;
}
