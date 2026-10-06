// apps/api/src/modules/leases/leases.pdf.js
import PDFDocument from 'pdfkit';
import { amountToWords } from '../receipts/amount-to-words.js';

function formatLongDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ''));
  if (!m) return isoDate || '';
  return `${m[2]}/${m[3]}/${m[1]}`;
}

export function renderLeasePdf({ tenant, unit, termMonths, startDate, firstDueDate, bankAccount }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const rentWords = amountToWords(tenant.monthly_rent_cents);
    const rentDollars = (tenant.monthly_rent_cents / 100).toFixed(2);
    const startLong = formatLongDate(startDate);
    const firstDueLong = formatLongDate(firstDueDate);

    const heading = (text) => doc.moveDown(1).fontSize(12).fillColor('#0F172A').font('Helvetica-Bold').text(text);
    const body = (text) => doc.fontSize(11).font('Helvetica').fillColor('#0F172A').text(text, { align: 'justify' });

    doc.fontSize(14).font('Helvetica-Bold').text('B E L I Z E', { align: 'center' });
    doc.moveDown(1);
    body(
      `THIS LEASE made the ${startLong} between Glenrick M. Spain of Belize City, Belize, ` +
      `(hereinafter called "the Landlord") of the One Part and ${tenant.name} of Belize City, Belize ` +
      `(hereinafter called "the Tenant") of the Other Part WITNESSES as follows:`
    );

    heading('1. Definitions and Interpretation');
    body('In this lease, unless the context otherwise requires,');
    body('1.1 "The premises" means the building and land situated at #79 Vernon Street, Belize City, Belize.');
    body('1.2 "The tenancy" means the tenancy created by these presents.');

    heading('2. Demise');
    body(
      `The Landlord demises to the Tenant the Premises TO HOLD the Premises to the Tenant for the ` +
      `purpose solely of private dwelling (no business is to be conducted on the Premises) for a term ` +
      `of ${termMonths} months commencing on ${startLong} subject to the performance and observance of the ` +
      `covenants on the part of the Tenant YIELDING AND PAYING to the Landlord rent in the amount of ` +
      `${rentWords} ($${rentDollars}) per month payable to the Landlord's Atlantic Bank Account: ${bankAccount} ` +
      `advance without demand on the first of each month, the first of such payments becoming due and owing ` +
      `on the ${firstDueLong} every 1st of the month thereafter.`
    );

    heading("3. Tenant's Covenants");
    body(
      '3.1 Rent — To pay the reserved rent at the times and in the manner specified in paragraph 2. Failure ' +
      'to pay the rent within three (3) business days of the time specified shall result in a charge of $20.00 BZ ' +
      'for each day the rent is not paid. Failure to pay rent beyond 15 days will automatically trigger the last ' +
      "month's payment to be applied, and the tenant should vacate the premises by the 17th of the month."
    );
    body('3.2 Security Deposit — No security deposit is collected; only first and last month\'s rent, the last month\'s rent held as a security measure upon termination by either party (30-day notice required).');
    body('3.3 Utilities — Electricity and water are covered by the Landlord.');
    body('3.4 Garbage disposal — Pick-up days are Tuesdays and Fridays.');
    body('3.5 Alterations — No structural alterations without the Landlord\'s prior written consent.');
    body('3.6 Repairs — Tenant covers minor maintenance/wear and tear; Landlord may enter with 24 hours notice for inspection/repairs.');
    body('3.7 Assignment/Subletting — Not permitted without the Landlord\'s written approval.');
    body('3.8 Indemnity — Tenant indemnifies the Landlord against damage caused by the Tenant, their agents, licensees, or visitors.');

    heading("4. Landlord's Covenants");
    body('4.1 Property Taxes — Landlord pays all property taxes and similar assessments.');
    body('4.2 Quiet Enjoyment — Tenant may peaceably hold and enjoy the premises without interruption, provided covenants are observed.');
    body('4.3 Repairs — Landlord pays for and effects all repairs necessary to keep the premises tenantable.');

    heading('5. Further Covenants and Provisos');
    body('5.1 If fire, riot, civil commotion, or act of God renders the premises wholly unfit for use, the tenancy ceases.');
    body(
      `5.2 Option to Renew — The Tenant may continue the tenancy for a further term of ${termMonths} months at a ` +
      'rental to be agreed, with notice of renewal given at least two months prior to expiration.'
    );
    body('5.3 Forfeiture — Rent unpaid for 30 days, or breach of covenant, entitles the Landlord to re-enter and end the tenancy. Abandonment beyond 14 days (no communication beyond 8 days) is treated as a breach.');
    body('5.4 Option to Determine — Either party may end the tenancy with not less than one month\'s written notice.');
    body('5.5 Jurisdiction — This Agreement is governed by the laws of Belize; the courts of Belize have jurisdiction.');

    doc.moveDown(2);
    doc.fontSize(11).font('Helvetica-Bold').text('Signed by:');
    doc.font('Helvetica').text('Landlord: _____________________________');
    doc.moveDown(1);
    doc.text(`I ${tenant.name.toUpperCase()} hereby agree to the terms above and this shall supersede any other agreements.`);
    doc.moveDown(1);
    doc.text('Signed by (Tenant): __________________');
    doc.text(`Tel: ${tenant.phone || '_________________'}`);
    doc.text(`Social Security #: ${tenant.ssn || '_________________'}`);
    doc.moveDown(1);
    doc.text('Witness Name & Signature: _________________________');

    doc.end();
  });
}
