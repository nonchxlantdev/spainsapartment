# Receipt Bundle Download (Per Tenant)

**Date:** 2026-09-16  
**Status:** Approved (pending final user review of this spec)  
**App:** Spain's Apartment personal-management

## Problem

Tenants sometimes request copies of their rent receipts for a period (a single month or a range of months). Today the app only downloads one receipt at a time via “View receipt” / PDF download. There is no way to export a set of receipts for a date range.

## Goal

On each tenant’s profile, allow downloading a **zip of the same individual receipt PDFs** already generated today, for a selectable **from month / to month** range (never before January 2026).

## Non-goals

- Do not change single-receipt PDF layout, numbering, WhatsApp send, or payment recording.
- Do not build a separate “statement” summary PDF (that was rejected in favor of a zip of individual receipts).
- Do not allow date ranges before `2026-01`.
- Do not invent fake receipts; only include payments that already exist in the database.

## User experience

### Placement

On `TenantProfile`, in the **Payment history** section header area:

- **From** control: year-month (`YYYY-MM`)
- **To** control: year-month (`YYYY-MM`)
- Primary action button: **Download receipts**

### Defaults and constraints

| Rule | Value |
|------|--------|
| Earliest From | `2026-01` |
| Default From | `2026-01` |
| Default To | Current calendar month |
| Validation | To ≥ From; both ≥ `2026-01`; To not in the future beyond current month (optional soft clamp) |

### Behavior

| Selection | Result |
|-----------|--------|
| Same month (e.g. `2026-03`–`2026-03`) | Zip containing that month’s receipt PDFs only |
| Range (e.g. `2026-01`–`2026-09`) | Zip containing all receipts with `paid_on` in that inclusive range |
| No payments in range | No zip; show clear UI message: “No receipts in that period” |

### Zip contents

- Each entry is one PDF produced by existing `renderReceiptPdf` (same branding, signature, receipt number).
- File names inside the zip: `{receipt_number}.pdf` (e.g. `WNSP00001.pdf`).
- Zip download name: `{Initials}-receipts-{from}-to-{to}.zip` (e.g. `WN-receipts-2026-01-to-2026-09.zip`). Use tenant initials from the existing initials helper pattern.

### Empty / error states

- Missing tenant → `404`
- Invalid `from`/`to` (malformed, before 2026-01, to &lt; from) → `400` with JSON `{ error: "..." }`
- Zero payments in range → `404` with JSON `{ error: "No receipts in that period" }` (UI shows the message; do not download an empty zip)

## API

### Endpoint

`GET /api/receipts/tenant/:tenantId/bundle.zip?from=YYYY-MM&to=YYYY-MM`

Must be registered **before** any conflicting parameterized routes if needed so Express matches correctly (place next to existing `GET /tenant/:tenantId`).

### Server steps

1. Resolve tenant by id; 404 if missing.
2. Parse and validate `from` / `to` as `YYYY-MM`; enforce min `2026-01` and `to >= from`.
3. Query payments for that tenant where `paid_on` is within the inclusive calendar range:
   - Start: first day of `from` month (`YYYY-MM-01`)
   - End: last day of `to` month
4. If none → 404 JSON as above.
5. For each payment (oldest-first for stable zip order): call existing `renderReceiptPdf({ payment, tenant, logoPath, signaturePath })`.
6. Stream or buffer a zip (`archiver` or equivalent lightweight dependency) with each PDF as `{receipt_number}.pdf`.
7. Response headers:
   - `Content-Type: application/zip`
   - `Content-Disposition: attachment; filename="{zipName}"`

### Repository

Add something like:

`forTenantInPaidOnRange(tenantId, fromDate, toDate)`  
→ payments for tenant with `paid_on` between inclusive date strings, ordered by `paid_on ASC, id ASC`.

Do not change `forTenant` used by payment history UI.

## Frontend

### Files (expected)

- `apps/web/src/components/TenantProfile.jsx` — From/To inputs + Download button + hint/error text
- Optional tiny helper for building the download URL / triggering blob download (same pattern as receipt PDF download in `Receipts.jsx`)

### Interaction

1. User sets From / To.
2. Click **Download receipts**.
3. `fetch` the bundle URL.
4. If not OK, parse JSON error and show under the controls.
5. If OK, create object URL from blob and trigger download; revoke URL after.

No WhatsApp integration for the zip in this version (manual attach later if needed).

## Dependencies

- Add one zip library to `apps/api` only (prefer `archiver` for streaming, or `jszip` if simpler). Justify in implementation plan; no frontend zip dependency.

## Testing

- Unit/route test: payments outside range excluded; inclusive month boundaries correct.
- Route test: valid range returns zip magic bytes (`PK`); empty range returns 404 JSON.
- Validation: before `2026-01` rejected; `to < from` rejected.
- Existing receipt PDF and payment history tests remain green.

## Preservation

- Single receipt: `GET /api/receipts/:receiptNumber/pdf` unchanged.
- Payment recording, dashboard, WhatsApp text open, UI shell: unchanged.

## Success criteria

- From a tenant profile, download a zip for one month or a multi-month range starting no earlier than Jan 2026.
- PDFs inside match existing individual receipts.
- Empty ranges and bad params fail clearly without empty zip files.
