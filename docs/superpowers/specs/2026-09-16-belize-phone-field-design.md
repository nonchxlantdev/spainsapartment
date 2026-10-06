# Belize phone field (`+501` + `XXX-XXXX`)

**Date:** 2026-09-16  
**Status:** Approved

## Goal

Tenant phone numbers always use Belize country code `+501`. The landlord only types the 7-digit local number as `XXX-XXXX`.

## Behavior

- **Edit UI:** Fixed, non-editable `+501` prefix beside a local input.
- **Local input:** Digits only; auto-insert hyphen after the third digit; max 7 digits (`XXX-XXXX`).
- **Empty:** Leaving local blank stores an empty phone (optional).
- **Invalid:** Partial entry (1–6 digits) blocks save with a short hint.
- **Stored value:** `+501 XXX-XXXX` or `''`.
- **View:** Show stored value or “Not on file”.
- **WhatsApp:** Existing digit stripper already handles `+501 XXX-XXXX` and bare 7-digit locals.

## Out of scope

- Bulk-filling numbers for all tenants
- API-side schema change (string field unchanged)
- Non-Belize country codes
