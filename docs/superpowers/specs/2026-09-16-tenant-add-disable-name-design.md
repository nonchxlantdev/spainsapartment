# Tenant name parts, Add tenant, Disable (soft)

**Date:** 2026-09-16  
**Status:** Approved

## Name

- Edit/Add use First, Middle (optional), Last.
- Stored as single `name` string: `First Middle Last` (omit empty middle).
- Display and receipts continue to use `name`.

## Disable

- `active` INTEGER NOT NULL DEFAULT 1.
- Disable: `active=0`, `unit_id=NULL` (column becomes nullable), status unchanged for history context; block new payments.
- Unit becomes vacant for Add tenant.
- Dashboard list defaults to active tenants; “Show former” toggle includes inactive.

## Add tenant

- Dashboard “Add tenant” opens form: name parts, vacant unit select, rent, due day, optional fields.
- Creates active tenant on chosen unit. Owner residence units excluded.
- Vacant = no active tenant on that unit.
