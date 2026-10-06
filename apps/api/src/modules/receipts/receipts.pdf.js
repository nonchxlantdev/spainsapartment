// apps/api/src/modules/receipts/receipts.pdf.js
// Layout matched to "Rent Receipt.pdf" (Legal landscape 1008×612)
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextDuePhrase, usesExactNextDue, nextDueDateDisplay } from './next-due.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', '..', '..', 'assets');
const DEFAULT_LOGO = path.join(ASSETS, 'receipt-logo.png');
const DEFAULT_SIGNATURE = path.join(ASSETS, 'signature.png');

const PAGE_W = 1008;
const PAGE_H = 612;

const BLUE_TITLE = '#5B9BD5';
const FOOTER_FILL = '#4472C4';
const FOOTER_STROKE = '#2F528F';
const INK = '#000000';
const WARNING = '#B45309';

/** PDF bottom-left Y → PDFKit top-left Y for a rect/image of given height. */
function kitY(pdfBottom, height = 0) {
  return PAGE_H - pdfBottom - height;
}

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatReceiptDate(isoOrSlash) {
  if (!isoOrSlash) return '';
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(isoOrSlash);
  if (slash) {
    return `${slash[1].padStart(2, '0')}/${slash[2].padStart(2, '0')}/${slash[3]}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOrSlash);
  if (!m) return isoOrSlash;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function formatAmount(cents) {
  return `${(cents / 100).toFixed(2)} bz`;
}

/** For Payment line: rent for unit/floor only — drop a trailing "due {date}". */
export function forPaymentLine(description) {
  return String(description || '').replace(/\.\s*due\s+.+$/i, '').trim();
}

/** Clear balance note for receipts that leave a carry-over. */
export function pendingBalanceLines(payment, tenant) {
  const pending = payment?.pending_after_cents || 0;
  if (pending <= 0) return [];

  const rent = tenant?.monthly_rent_cents || 0;
  const nextTotal = rent + pending;
  const due = nextDuePhrase(payment?.paid_on, tenant?.due_day);
  const exact = usesExactNextDue(payment?.paid_on) && nextDueDateDisplay(payment?.paid_on, tenant?.due_day);

  return [
    `BALANCE DUE: ${money(pending)} — carried into next rent.`,
    exact
      ? `Next due ${due}: ${money(nextTotal)} (${money(rent)} rent + ${money(pending)} balance).`
      : `Next due on the ${due}: ${money(nextTotal)} (${money(rent)} rent + ${money(pending)} balance).`
  ];
}

/** Draw text so its baseline matches the sample PDF's bottom-left coordinates. */
function textAt(doc, str, x, pdfBaselineY, size, { font = 'Times-Roman', color = INK, width } = {}) {
  doc.font(font).fontSize(size).fillColor(color);
  const asc = (doc._font.ascender / 1000) * size;
  const opts = { lineBreak: false };
  if (width) {
    doc.text(String(str), x, PAGE_H - pdfBaselineY - asc, { width, lineBreak: true });
    return;
  }
  doc.text(String(str), x, PAGE_H - pdfBaselineY - asc, opts);
}

function underline(doc, x, pdfBottomY, width) {
  doc.save();
  doc.rect(x, kitY(pdfBottomY, 0.96), width, 0.96).fill(INK);
  doc.restore();
}

export function renderReceiptPdf({ payment, tenant, logoPath, signaturePath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      autoFirstPage: true
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Logo — sample box x=711.6, y=385.81, w=280.45, h=210.24
    const logo = [logoPath, DEFAULT_LOGO].find(p => p && fs.existsSync(p));
    if (logo) {
      try {
        doc.image(logo, 711.6, kitY(385.81, 210.24), { width: 280.45, height: 210.24 });
      } catch {
        // decorative
      }
    }

    textAt(doc, 'RENT RECEIPT', 72, 495.18, 48, { font: 'Helvetica-Bold', color: BLUE_TITLE });
    textAt(doc, 'CUSTOMER COPY', 72, 460.56, 26, { font: 'Helvetica-Bold', color: BLUE_TITLE });

    // Row: Receipt Number + Date
    textAt(doc, 'Receipt Number:', 72, 403.98, 20);
    underline(doc, 214.2, 400.86, 217.8);
    textAt(doc, payment.receipt_number, 216.2, 408.3, 20);

    textAt(doc, 'Date:', 468, 403.98, 20);
    underline(doc, 516.3, 400.86, 203.7);
    textAt(doc, formatReceiptDate(payment.paid_on), 518.2, 408.9, 20);

    // Row: Received From + amount
    textAt(doc, 'Received From:', 72, 358.02, 20);
    underline(doc, 205.26, 354.9, 334.74);
    textAt(doc, tenant?.name || '', 207.2, 363, 20);

    textAt(doc, 'the amount of $', 576, 358.02, 20);
    underline(doc, 707.1, 354.9, 228.9);
    textAt(doc, formatAmount(payment.amount_cents), 709, 363, 20);

    // For Payment
    textAt(doc, 'For Payment:', 72, 312, 20);
    underline(doc, 185.34, 308.88, 750.66);
    textAt(doc, forPaymentLine(payment.description), 187.3, 316.9, 20);

    // Payment method
    textAt(doc, 'Payment Received In:', 72, 265.98, 20);
    underline(doc, 253.62, 262.86, 286.38);
    textAt(doc, payment.method || '', 255.6, 270.8, 20);

    // Received By
    textAt(doc, 'Received By:', 540, 220.02, 20);
    underline(doc, 653.28, 216.9, 282.72);
    textAt(doc, 'Glenrick Spain', 655.3, 225, 20);

    // Signature — sit the ink on the Signature underline (y ≈ 170.88)
    textAt(doc, 'Signature:', 540, 174, 20);
    underline(doc, 627.24, 170.88, 308.76);

    const signature = [signaturePath, DEFAULT_SIGNATURE].find(p => p && fs.existsSync(p));
    if (signature) {
      try {
        const sigW = 200;
        const sigH = 38;
        // Bottom of image rests on/just through the underline so the stroke sits on the line
        doc.image(signature, 648, kitY(173, sigH), { width: sigW, height: sigH });
      } catch {
        textAt(doc, 'Glenrick Spain', 660, 174, 18, { font: 'Times-Italic', color: INK });
      }
    } else {
      textAt(doc, 'Glenrick Spain', 660, 174, 18, { font: 'Times-Italic', color: INK });
    }

    const pendingLines = pendingBalanceLines(payment, tenant);
    const note = String(payment?.receipt_note || '').trim();
    let noteY = 128;
    if (note) {
      textAt(doc, `Note: ${note}`, 72.7, noteY, 13, { font: 'Times-Italic', color: INK, width: 860 });
      noteY -= 22;
    }
    if (pendingLines.length) {
      textAt(doc, pendingLines[0], 72.7, noteY, 13, { font: 'Times-Bold', color: WARNING });
      if (pendingLines[1]) {
        textAt(doc, pendingLines[1], 72.7, noteY - 16, 12, { font: 'Times-Roman', color: WARNING });
      }
      noteY -= pendingLines[1] ? 36 : 20;
    } else if (usesExactNextDue(payment?.paid_on)) {
      const exact = nextDueDateDisplay(payment?.paid_on, tenant?.due_day);
      if (exact) {
        textAt(doc, `Next due: ${exact}`, 72.7, noteY, 13, { font: 'Times-Roman', color: INK });
        noteY -= 20;
      }
    }

    // Footer bar
    doc.save();
    doc.lineWidth(1);
    doc.fillColor(FOOTER_FILL).strokeColor(FOOTER_STROKE);
    doc.rect(39.75, kitY(23.929, 75.7), 934.1, 75.7).fillAndStroke();
    doc.restore();

    textAt(doc, '+501 638-7406', 58.14, 58.86, 22, { color: '#FFFFFF' });
    textAt(doc, '# 79 Vernon Street, Belize City', 346.2, 58.86, 22, { color: '#FFFFFF' });
    textAt(doc, 'glenrickspain@hotmail.com', 706.2, 58.86, 22, { color: '#FFFFFF' });

    doc.end();
  });
}
