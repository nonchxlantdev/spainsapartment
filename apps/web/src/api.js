const BASE = '/api';

async function handle(res) {
  if (res.status === 401) {
    // Session missing or expired — bounce back to the login screen. Login
    // itself talks to /api/auth/login directly so a wrong-password attempt
    // never triggers this.
    window.location.reload();
    return new Promise(() => {});
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function apiGet(path) {
  return fetch(`${BASE}${path}`, { credentials: 'same-origin' }).then(handle);
}

export function apiDelete(path) {
  return fetch(`${BASE}${path}`, { method: 'DELETE', credentials: 'same-origin' }).then(handle);
}

export function apiPatch(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(handle);
}

export function apiPost(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(handle);
}
