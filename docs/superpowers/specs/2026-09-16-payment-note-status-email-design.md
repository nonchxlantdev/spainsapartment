# Manual payment status, receipt notes, tenant email

**Date:** 2026-09-16  
**Status:** Approved

## Record payment

- Amount remains editable.
- Landlord chooses status: Paid / Partial / Pending (not auto from amount).
- When Partial: optional pending balance cents (default = due − amount if positive, else editable).
- Optional receipt **note** stored on the payment and printed on the PDF.
- Every recorded payment still gets a receipt number and PDF.

## Tenant email

- Add `email` TEXT on tenants (default '').
- Editable on profile Edit and Add Tenant.
- Display on profile view.
