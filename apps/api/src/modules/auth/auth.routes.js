// apps/api/src/modules/auth/auth.routes.js
import { Router } from 'express';
import { parseCookies, serializeCookie } from './cookies.js';
import { SESSION_COOKIE, SESSION_TTL_MS } from './auth.service.js';

export function createAuthRouter({ authService }) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { password } = req.body || {};
    if (!authService.checkPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    const token = authService.createSession();
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, token, { maxAgeMs: SESSION_TTL_MS }));
    res.json({ ok: true });
  });

  router.post('/logout', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    authService.destroySession(cookies[SESSION_COOKIE]);
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, '', { clear: true }));
    res.json({ ok: true });
  });

  router.get('/status', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    res.json({ authenticated: authService.isValidSession(cookies[SESSION_COOKIE]) });
  });

  return router;
}

/** Express middleware: 401s any request without a valid session cookie. */
export function requireAuth(authService) {
  return function (req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    if (!authService.isValidSession(cookies[SESSION_COOKIE])) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
  };
}
