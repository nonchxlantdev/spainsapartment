// apps/api/src/modules/auth/auth.service.js
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'sa_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Password-gate sessions, backed by SQLite so a logged-in session survives
 * the API's `node --watch` dev restarts (an in-memory session map would log
 * the user out every time a backend file is saved).
 */
export function createAuthService({ db, getPassword }) {
  const insertSession = db.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)');
  const findSession = db.prepare('SELECT expires_at FROM sessions WHERE token = ?');
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');
  const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at < ?');

  function hashOf(value) {
    return crypto.createHash('sha256').update(String(value)).digest();
  }

  function checkPassword(candidate) {
    const expected = hashOf(getPassword());
    const actual = hashOf(candidate ?? '');
    return crypto.timingSafeEqual(expected, actual);
  }

  function createSession() {
    deleteExpired.run(Date.now());
    const token = crypto.randomBytes(32).toString('hex');
    insertSession.run(token, Date.now() + SESSION_TTL_MS);
    return token;
  }

  function isValidSession(token) {
    if (!token) return false;
    const row = findSession.get(token);
    if (!row) return false;
    if (Date.now() > row.expires_at) {
      deleteSession.run(token);
      return false;
    }
    return true;
  }

  function destroySession(token) {
    if (token) deleteSession.run(token);
  }

  return { checkPassword, createSession, isValidSession, destroySession };
}
