// apps/api/src/modules/receipts/receipts.routes.js
import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import { renderReceiptPdf } from './receipts.pdf.js';
import { tenantInitials } from '../payments/payments.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', '..', '..', 'assets');
const LOGO_PATH = path.join(ASSETS, 'receipt-logo.png');
const SIGNATURE_PATH = path.join(ASSETS, 'signature.png');

/** Parse YYYY-MM → { fromDate, toDate } inclusive calendar bounds, or null. */
export function monthRangeBounds(fromMonth, toMonth) {
  const monthRe = /^\d{4}-\d{2}$/;
  if (!monthRe.test(fromMonth || '') || !monthRe.test(toMonth || '')) return null;
  if (toMonth < fromMonth) return null;

  const [ty, tm] = toMonth.split('-').map(Number);
  if (tm < 1 || tm > 12) return null;
  const fromMonthNum = Number(fromMonth.slice(5));
  if (fromMonthNum < 1 || fromMonthNum > 12) return null;

  const fromDate = `${fromMonth}-01`;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const toDate = `${toMonth}-${String(lastDay).padStart(2, '0')}`;
  return { fromDate, toDate, fromMonth, toMonth };
}

function zipPdfBuffers(entries) {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive();
    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    for (const { name, buffer } of entries) {
      archive.append(buffer, { name });
    }
    archive.finalize().catch(reject);
  });
}

async function sendReceiptZip(res, { tenant, payments, label }) {
  if (!payments.length) {
    return res.status(404).json({ error: 'No receipts in that period' });
  }
  const entries = [];
  for (const payment of payments) {
    const buffer = await renderReceiptPdf({
      payment,
      tenant,
      logoPath: LOGO_PATH,
      signaturePath: SIGNATURE_PATH
    });
    entries.push({ name: `${payment.receipt_number}.pdf`, buffer });
  }
  const zip = await zipPdfBuffers(entries);
  const initials = tenantInitials(tenant.name);
  const filename = `${initials}-receipts-${label}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', zip.length);
  res.setHeader('Cache-Control', 'no-store');
  res.end(zip);
}

export function createReceiptsRouter({ paymentsRepository, tenantsService }) {
  const router = Router();

  router.get('/tenant/:tenantId', (req, res) => {
    res.json(paymentsRepository.forTenant(Number(req.params.tenantId)));
  });

  router.get('/tenant/:tenantId/bundle.zip', async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    const tenant = tenantsService.get(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    try {
      // Download every receipt on file for this tenant
      if (req.query.all === '1' || req.query.all === 'true') {
        const payments = [...paymentsRepository.forTenant(tenantId)].reverse();
        return await sendReceiptZip(res, { tenant, payments, label: 'all' });
      }

      const bounds = monthRangeBounds(req.query.from, req.query.to);
      if (!bounds) {
        return res.status(400).json({
          error: 'Invalid range. Use from/to as YYYY-MM with to >= from, or all=1 for every receipt.'
        });
      }

      const payments = paymentsRepository.forTenantInPaidOnRange(
        tenantId,
        bounds.fromDate,
        bounds.toDate
      );
      return await sendReceiptZip(res, {
        tenant,
        payments,
        label: `${bounds.fromMonth}-to-${bounds.toMonth}`
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to build receipt bundle' });
    }
  });

  router.get('/:receiptNumber/pdf', async (req, res) => {
    const payment = paymentsRepository.findByReceiptNumber(req.params.receiptNumber);
    if (!payment) return res.status(404).json({ error: 'Receipt not found' });
    const tenant = tenantsService.get(payment.tenant_id);
    const buffer = await renderReceiptPdf({
      payment,
      tenant,
      logoPath: LOGO_PATH,
      signaturePath: SIGNATURE_PATH
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${payment.receipt_number}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buffer);
  });

  return router;
}
