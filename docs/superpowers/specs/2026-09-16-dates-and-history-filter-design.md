# Dates as MM/DD/YYYY + current-month receipt history

**Date:** 2026-09-16  
**Status:** Approved

## Dates

- Store ISO `YYYY-MM-DD` in the database.
- Display and edit as `MM/DD/YYYY` across the web UI (DOB, onboarded, lease renewal, payment dates, receipt screen).
- Receipt PDFs use zero-padded `MM/DD/YYYY`.
- Edit: typed fields with auto-slashes; empty allowed; invalid blocks save.
- Month range pickers (From/To) remain `type="month"`.

## Payment history

- Tenant profile history defaults to the **current calendar month**.
- From/To filter the visible list; changing the range shows other months.
- Opening a profile resets From/To to the current month.
- Download range uses From/To; Download all still downloads every receipt on file.
