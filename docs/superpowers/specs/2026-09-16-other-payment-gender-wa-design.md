# Other payments, gender, WhatsApp greeting

**Date:** 2026-09-16  
**Status:** Approved

## Other status

- Fourth mark-status option: **Other**.
- Always creates a receipt.
- Does **not** change tenant `status` or `pending_balance_cents`.
- Updates `receipt_count` and payment method only.

## Gender

- `gender` on tenants: `male` | `female` | `''`.
- Editable on profile and Add Tenant.
- WhatsApp: `Hi Mr. {Last}.` / `Hi Ms. {Last}.` (last name from full name).

## WhatsApp

- Message copy as specified (attached for reference / appreciate you!).
- Open with a fixed window name to reuse the same tab when possible.
- Cannot force-reuse an already-open web.whatsapp.com tab opened outside this app.
