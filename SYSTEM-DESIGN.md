# Spain's Apartment — Personal Management System

**Design spec — v1**
Location: `D:\Entrepreneur\Vision Forge Ltd\Spain's Apartment\personal-management`
Status: Approved design, ready for implementation planning.

This is a standalone, single-user system for managing 79 Vernon Street, Belize City — fully separate from the `property-management-system` project in the sibling folder. It is not multi-tenant SaaS software; it's a personal tool for one landlord (Nonchalant) to run locally.

## 1. Building structure

79 Vernon Street, Belize City — 3 floors, 11 units total (10 rentable + 1 owner residence):

- **Floor 1** (4 units): Flacko (landlord's uncle, rent-free), Wilbense Noel, Maya King, 1 vacant unit
- **Floor 2** (3 units): owner's residence (not a rental), Jak Hussain, Timothy Mena
- **Floor 3** (4 units): Kwame Bennett, Catalina Banner, Keyon Flowers, Samson Jacobs

Units are modeled as real records (floor, label, monthly rent, occupancy status) so vacancies and future move-ins are tracked properly, not hardcoded.

## 2. Tenant profiles (editable)

Each tenant has a full profile, fully editable in the UI (not just at creation):

- Legal name
- Phone number (used for WhatsApp) — many are blank today; explicitly meant to be filled in and updated over time
- Social Security number — masked by default in the UI, with a reveal toggle
- Date of birth (age is computed automatically, not stored redundantly)
- Assigned unit
- Onboarding / move-in date
- Lease start date and renewal date
- Monthly rent and due day
- Preferred/last-used payment method (Cash, Online Transfer)
- Running pending balance (see §4)
- Free-text notes (late payments, special requests, anything else worth flagging)

Flacko is a special case: a rent-free occupant. His profile exists like any tenant's (for occupancy tracking, notes, etc.) but he is excluded from all collection totals and never appears in the "needs to pay" list.

## 3. Lease generation (manual DocuSign)

- A lease template modeled on the real Kwame Bennett agreement — same Belize legal boilerplate and clauses (rent, grace period and late fee, last-month-rent-in-lieu-of-deposit, renewal option, forfeiture terms, etc.) — with variable fields filled in from the tenant's profile: name, unit/premises, rent (numeral + words), term length, start date, due date, bank account.
- Flow: click "Generate Lease" on a tenant → download the filled PDF → send it out for signature via DocuSign yourself → upload the signed copy back onto the tenant's profile, which marks the lease Active with recorded start/end dates.
- No DocuSign API integration in v1 — this is a deliberate scope decision to avoid the API setup/approval overhead for a personal-scale tool.

## 4. Payment recording & receipts

- "Record payment" on a tenant's profile: enter amount received, method, and date. As you type the amount, the UI shows live whether it will be recorded as **Paid** or **Partial** (with the exact pending amount) before you confirm — the action is always "record what came in," never a binary "mark paid" click.
- **Partial payments carry forward.** If a tenant pays less than what's due, the shortfall becomes their pending balance, shown on their profile (balance banner), on the dashboard (inline next to their amount), and on their next receipt as a note — e.g. Wilbense pays $370 of $400, and the receipt notes the $30 pending, carried onto the following month's total due.
- **Receipt numbering**: unique per tenant, pattern `<Initials>SP<5-digit-sequence>` (e.g. `WNSP00001` for Wilbense Noel) — never reused.
- Receipts are rendered as a real PDF matching the existing branded template (logo, business info footer, signature line) and every receipt ever issued stays attached to that tenant's payment history, viewable/downloadable at any time.

## 5. WhatsApp delivery (v1: one-click, not fully automatic)

- Outgoing WhatsApp number: **5016157575** (the business/sending number).
- Each tenant has their own editable phone field (recipient number).
- A **"Send via WhatsApp"** action on a receipt opens WhatsApp already addressed to that tenant with a drafted message referencing the receipt (amount, description, and pending-balance note if any); you attach the generated PDF and hit send yourself.
- Fully automatic sending (zero-click, triggered the instant a payment is recorded) was explicitly considered and declined for v1 — it requires a Meta WhatsApp Business Cloud API account tied to 5016157575 plus an approved message template, real setup overhead with no guarantee of approval timing. This can be revisited later as an upgrade to the same "Send via WhatsApp" action without changing anything else about how receipts are generated.

## 6. Monthly collections dashboard

- Starting September 1, 2026. Shows: total expected this month (paying tenants only — Flacko excluded), total collected so far, total outstanding (including any pending balances), and occupancy (paying + rent-free vs. vacant).
- A per-tenant status table: unit, due date, amount (with pending call-outs), method, and status (Paid / Partial / Pending / No rent). Clicking a row opens that tenant's full profile.
- Month is navigable (prev/next), so past months remain visible once the app has been used for a while.

## 7. Branding & visual design

- Primary logo: the "Spain's Apartment — In Loving Memory / Family • Legacy • Home" gold-wreath logo, used as the main mark in the top bar and on generated receipts.
- Color theme: bright, professional — blue primary (`#2563EB`) on a near-white background (`#F8FAFC`), green accent (`#059669`) for confirmations, white cards, full light/dark support. (Chosen over an initial muted teal draft per feedback for something brighter.)
- Typography: Fira Sans for UI text, Fira Code for numbers/amounts/receipt numbers (tabular figures line up cleanly in tables and totals).
- A working mockup of this design (dashboard, tenant profiles with inline editing, building layout, and receipt generation/WhatsApp send) was built and iterated on directly with Nonchalant before this spec was written.

## 8. Tech stack

- **Frontend**: React + Vite + Tailwind CSS.
- **Backend**: small local Node/Express server.
- **Database**: SQLite, single local file — easy to back up by copying one file, no separate database server to install.
- **PDF generation**: server-side (pdfkit or similar), matching the existing receipt/lease branding.
- One `npm install` + one command starts both frontend and backend together. Everything lives entirely inside `personal-management/`, fully independent of `property-management-system`.

## 9. Explicitly out of scope for v1

- DocuSign API automation (manual round-trip instead)
- Fully automatic WhatsApp sending (one-click assisted send instead)
- Automatic $20/day late-fee calculation (the lease document still states the policy; pending balances are entered manually as needed)
- Multi-user accounts / login — single-user, local-only tool

These are all natural, additive upgrades later without reworking the core data model.
