'use client';

import { useState } from 'react';
import { CreditCard, QrCode, X } from 'lucide-react';
import { PaymentBlock } from '@/components/PaymentBlock';
import type { BillingSettings } from '@/lib/ips';

type PayableInvoice = { id: number; unit: string; amount: number; month: string; recipient_name: string | null };

/** Dugme koje otvara podatke za uplatu i IPS QR kod za jednu fakturu. */
export function PayInvoiceButton({ invoice, billing, variant = 'small' }: { invoice: PayableInvoice | null; billing: BillingSettings | null; variant?: 'small' | 'hero' }) {
  const [open, setOpen] = useState(false);
  const disabled = !invoice || !billing;

  return (
    <>
      {variant === 'hero' ? (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="btn btn-gold w-full disabled:opacity-60">
          <CreditCard size={16} />
          {invoice ? 'Plati odmah' : 'Nema neplaćenih faktura'}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="btn btn-outline !px-3 !py-1.5 !text-[12px] disabled:hidden">
          <QrCode size={13} /> Plati
        </button>
      )}
      {variant === 'hero' && invoice && !billing && <p className="text-[11px] text-white/60 mt-2">Uprava još nije unela podatke za uplatu.</p>}

      {open && invoice && billing && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5 text-left text-ink" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[560px] max-w-full max-h-[92dvh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Plaćanje · {invoice.month}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zatvori" className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center"><X size={15} /></button>
            </div>
            <p className="text-[12.5px] text-ink-soft">Otvorite m-banking aplikaciju, izaberite <b>IPS Skeniraj</b> i skenirajte kod. Svi podaci se popunjavaju sami.</p>
            <PaymentBlock billing={billing} unit={invoice.unit} invoiceId={invoice.id} amount={Number(invoice.amount)} payer={invoice.recipient_name ?? undefined} month={invoice.month} />
            <p className="text-[11px] text-ink-faint mt-3">Uplata se evidentira kada uprava potvrdi priliv na računu zgrade.</p>
          </div>
        </div>
      )}
    </>
  );
}
