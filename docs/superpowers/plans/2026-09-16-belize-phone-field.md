# Plan: Belize phone field

1. Add `apps/web/src/phone.js` helpers: extract local, format local, compose full, validate.
2. Update `TenantProfile` edit form: special-case phone with `+501` chip + local input; validate on save.
3. Smoke-check WhatsApp normalize still accepts stored format (already does).
