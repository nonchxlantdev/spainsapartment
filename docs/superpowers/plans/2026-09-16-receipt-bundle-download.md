# Receipt Bundle Download — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download a zip of individual receipt PDFs for a tenant for a from/to month range (min 2026-01).

**Architecture:** New `GET /api/receipts/tenant/:id/bundle.zip` reuses `renderReceiptPdf`, filters via repository date range, zips with `archiver`. UI on TenantProfile Payment history header.

**Tech Stack:** Express, better-sqlite3, pdfkit, archiver, React, Vitest/supertest

---

### Task 1: Repository + API zip endpoint

**Files:**
- Modify: `apps/api/src/modules/payments/payments.repository.js`
- Modify: `apps/api/src/modules/receipts/receipts.routes.js`
- Modify: `apps/api/package.json` (add `archiver`)
- Create: `apps/api/tests/receipts.bundle.test.js`

- [ ] Add `forTenantInPaidOnRange(tenantId, fromDate, toDate)`
- [ ] Add month validation helpers + `GET /tenant/:tenantId/bundle.zip`
- [ ] Tests for range, empty, validation
- [ ] `npm test -w apps/api`

### Task 2: TenantProfile UI

**Files:**
- Modify: `apps/web/src/components/TenantProfile.jsx`

- [ ] From/To month inputs + Download receipts button
- [ ] Blob download + error message

### Task 3: Verify

- [ ] API tests + web build
