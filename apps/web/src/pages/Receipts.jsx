// apps/web/src/pages/Receipts.jsx
import { useState } from 'react';
import logo from '../assets/logo.png';
import { IconWhatsApp } from '../icons.jsx';
import { btnPrimary, btnSecondary, cardClass } from '../ui.js';
import { isoToDisplay } from '../dates.js';
import { nextDueDateDisplay, usesExactNextDue } from '../nextDue.js';
import { whatsAppGreeting } from '../name.js';

const CONTACT = {
  phone: '+501 638-7406',
  address: '#79 Vernon Street, Belize City',
  email: 'glenrickspain@hotmail.com'
};

function money(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function forPaymentLine(description) {
  return String(description || '').replace(/\.\s*due\s+.+$/i, '').trim();
}

function normalizeWhatsAppPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = digits.slice(1);
  // Handle local Belize 7-digit numbers by adding country code.
  if (digits.length === 7) digits = `501${digits}`;
  return digits;
}

export default function Receipts({ receipt, tenant, onBack }) {
  const [hint, setHint] = useState(
    'Generated the moment a payment is marked. Opens WhatsApp addressed to the tenant with the receipt ready to attach.'
  );

  if (!receipt) return null;

  async function downloadPdf() {
    if (!receipt.receipt_number) {
      setHint('This receipt has no number yet. Try refreshing the tenant profile.');
      return;
    }
    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(receipt.receipt_number)}/pdf`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      if (!blob.type.includes('pdf') && blob.size < 100) {
        throw new Error('Server did not return a PDF');
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${receipt.receipt_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setHint(`Downloaded ${receipt.receipt_number}.pdf. Attach it in WhatsApp if you are sending the receipt.`);
    } catch (err) {
      setHint(err.message || 'Could not download the PDF.');
    }
  }

  function sendViaWhatsApp() {
    const phone = normalizeWhatsAppPhone(tenant.phone);
    if (!phone) {
      setHint(`${tenant.name} has no phone number on file yet. Add one from their profile (Edit) first.`);
      return;
    }
    if (!tenant.gender) {
      setHint(`Add gender on ${tenant.name}'s profile (Edit) so the message can say Mr. or Ms.`);
      return;
    }
    const msg =
      `${whatsAppGreeting(tenant)}\n\n` +
      `This is an automated message from Spain's Apartment. Kindly see your receipt attached for your reference. ` +
      `Thank you for being a valued tenant. We appreciate you!`;
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    // Always a new tab — never navigate this app away.
    const popup = window.open(url, '_blank');
    if (!popup) {
      setHint('Popup blocked. Allow popups for this site so WhatsApp can open in a new tab.');
      return;
    }
    setHint(`Opened WhatsApp in a new tab for ${tenant.name}. Attach the PDF and hit send.`);
  }

  return (
    <div>
      <div className="flex justify-center py-6">
        <div className={`w-full max-w-[600px] ${cardClass} shadow-card overflow-hidden`}>
          <div className="px-[26px] pt-6 pb-[18px] flex justify-between items-start gap-3.5 flex-wrap">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-primary m-0">Rent Receipt</h2>
              <p className="text-[11px] font-bold tracking-wider text-mutedfg uppercase mt-1 mb-0">Customer copy</p>
            </div>
            <img src={logo} alt="" className="w-16 h-16 object-contain shrink-0" />
          </div>

          <div className="px-[26px] pb-[18px] grid grid-cols-1 sm:grid-cols-2 gap-x-[18px] gap-y-3.5">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Receipt number</div>
              <div className="text-[14.5px] font-mono border-b border-border pb-1 mt-[3px]">{receipt.receipt_number}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Date</div>
              <div className="text-[14.5px] font-mono border-b border-border pb-1 mt-[3px]">{isoToDisplay(receipt.paid_on)}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Received from</div>
              <div className="text-[14.5px] border-b border-border pb-1 mt-[3px]">{tenant.name}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Amount</div>
              <div className="text-[19px] font-bold font-mono text-primary border-b border-border pb-1 mt-[3px]">
                {money(receipt.amount_cents)} BZ
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">For payment</div>
              <div className="text-[14.5px] border-b border-border pb-1 mt-[3px]">{forPaymentLine(receipt.description)}</div>
            </div>
            {receipt.receipt_note ? (
              <div className="sm:col-span-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Note</div>
                <div className="text-[14.5px] border-b border-border pb-1 mt-[3px] italic">{receipt.receipt_note}</div>
              </div>
            ) : null}
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Payment received in</div>
              <div className="text-[14.5px] border-b border-border pb-1 mt-[3px]">{receipt.method}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Received by</div>
              <div className="text-[14.5px] border-b border-border pb-1 mt-[3px]">Glenrick Spain</div>
            </div>
          </div>

          {receipt.pending_after_cents > 0 && (
            <div className="mx-[26px] mb-5 px-[13px] py-[11px] rounded-[9px] bg-warningbg text-warning text-[12.5px] font-semibold space-y-1">
              <div>
                Balance due: {money(receipt.pending_after_cents)}, carried into next rent.
              </div>
              <div className="font-medium">
                {(() => {
                  const exact = usesExactNextDue(receipt.paid_on)
                    ? nextDueDateDisplay(receipt.paid_on, tenant.due_day)
                    : null;
                  const dueBit = exact
                    ? ` ${exact}`
                    : (tenant.due_day && tenant.due_day !== '—' && tenant.due_day !== '-'
                      ? ` on the ${tenant.due_day}`
                      : '');
                  return (
                    <>
                      Next due{dueBit}:{' '}
                      {money((tenant.monthly_rent_cents || 0) + receipt.pending_after_cents)}{' '}
                      ({money(tenant.monthly_rent_cents || 0)} rent + {money(receipt.pending_after_cents)} balance).
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          {receipt.pending_after_cents === 0 && usesExactNextDue(receipt.paid_on) && nextDueDateDisplay(receipt.paid_on, tenant.due_day) && (
            <div className="mx-[26px] mb-5 px-[13px] py-[11px] rounded-[9px] bg-muted text-[12.5px] font-semibold text-foreground">
              Next due: {nextDueDateDisplay(receipt.paid_on, tenant.due_day)}
              {tenant.monthly_rent_cents > 0 ? <> · {money(tenant.monthly_rent_cents)}</> : null}
            </div>
          )}
          {receipt.pending_after_cents === 0 && /prior balance/i.test(receipt.description || '') && (
            <div className="mx-[26px] mb-5 px-[13px] py-[11px] rounded-[9px] bg-successbg text-success text-[12.5px] font-semibold">
              Prior balance cleared with this payment.
              {usesExactNextDue(receipt.paid_on) && nextDueDateDisplay(receipt.paid_on, tenant.due_day) ? (
                <> Next rent due {nextDueDateDisplay(receipt.paid_on, tenant.due_day)}: {money(tenant.monthly_rent_cents || 0)}.</>
              ) : (
                tenant.due_day && tenant.due_day !== '—' && tenant.due_day !== '-' && (
                  <> Next rent due on the {tenant.due_day}: {money(tenant.monthly_rent_cents || 0)}.</>
                )
              )}
            </div>
          )}

          <div className="px-[26px] pb-[22px] flex justify-end">
            <div className="text-right">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-mutedfg">Signature</div>
              <div className="font-mono text-[15px] italic mt-1">Glenrick Spain</div>
            </div>
          </div>

          <div className="bg-primary text-white px-[26px] py-3 flex justify-between text-[11.5px] flex-wrap gap-1.5">
            <span>{CONTACT.phone}</span>
            <span>{CONTACT.address}</span>
            <span>{CONTACT.email}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={downloadPdf} className={btnSecondary}>
          Download PDF
        </button>
        <button type="button" onClick={sendViaWhatsApp} className={btnPrimary}>
          <IconWhatsApp className="w-3.5 h-3.5" />
          Send via WhatsApp
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-3.5 py-2 text-[13px] font-semibold text-mutedfg hover:text-foreground active:scale-[0.98] transition-all duration-150"
          >
            Close preview
          </button>
        )}
      </div>
      <p className="text-center text-[11.5px] text-mutedfg mt-3">{hint}</p>
    </div>
  );
}
