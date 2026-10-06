// apps/api/src/modules/auth/auth.config.js
//
// The single shared password that unlocks Building Control. Change it any
// time by editing DEFAULT_PASSWORD below and restarting the API server —
// or set an AUTH_PASSWORD environment variable, which always takes
// priority over the default here.
const DEFAULT_PASSWORD = 'VernonStreet79';

export function getAuthPassword() {
  return process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;
}
