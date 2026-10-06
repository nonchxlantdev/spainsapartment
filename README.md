# Spain's Apartment — Personal Management System

A personal, single-user app for managing 79 Vernon Street: tenants, leases, receipts, and monthly rent collection.

## Running it

1. Install dependencies (only needed once, or after pulling changes):
   ```
   npm install
   ```
2. Start both the API and the web app together:
   ```
   npm run dev
   ```
3. Open http://localhost:5173 in your browser.

The first time the API starts, it automatically creates `apps/api/data/spains-apartment.db` and seeds it with the building's 11 units and the 9 known tenants (including Flacko, rent-free). After that, it just uses whatever is in that file — back it up by copying it.

## Running tests

```
npm test
```

## Project layout

- `apps/api` — Express + SQLite backend. Generates lease and receipt PDFs.
- `apps/web` — React + Vite + Tailwind frontend.

## What's intentionally not automated yet

- **DocuSign** — leases are generated as PDFs for you to send through DocuSign yourself; the signed copy isn't pulled back in automatically.
- **WhatsApp** — "Send via WhatsApp" opens WhatsApp addressed to the tenant with the message drafted; you attach the PDF and hit send. Full automatic sending would require a Meta WhatsApp Business Cloud API account and an approved message template.
- **Late fees** — the lease states the $20/day late-fee policy, but it isn't calculated automatically; pending balances are entered manually when you record a payment.
