// apps/web/src/name.js
export function splitName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { first: '', middle: '', last: '' };
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1]
  };
}

export function composeName({ first, middle, last }) {
  return [first, middle, last]
    .map(s => String(s || '').trim())
    .filter(Boolean)
    .join(' ');
}

const HONORIFICS = new Set(['MS', 'MR', 'MRS', 'MISS']);

/** Last name for greetings (skips leading Ms/Mr). */
export function lastNameForGreeting(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(p => !HONORIFICS.has(p.replace(/[^A-Za-z]/g, '').toUpperCase()));
  if (parts.length === 0) return '';
  return parts[parts.length - 1];
}

export function whatsAppGreeting(tenant) {
  const last = lastNameForGreeting(tenant?.name);
  const g = String(tenant?.gender || '').toLowerCase();
  const title = g === 'female' ? 'Ms.' : g === 'male' ? 'Mr.' : null;
  if (title && last) return `Hi ${title} ${last}.`;
  if (last) return `Hi ${last}.`;
  return 'Hi.';
}

