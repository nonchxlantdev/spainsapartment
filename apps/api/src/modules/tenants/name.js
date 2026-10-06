// apps/api/src/modules/tenants/name.js
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
