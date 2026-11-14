'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { IpsQrCode } from './IpsQrCode';
import { buildIpsPayload, formatAccount, formatReference, invoiceReference, normalizeAccount, type BillingSettings } from '@/lib/ips';

/** Podaci za uplatu + IPS QR kod. Koristi se na fakturi kod upravnika i kod stanara. */
export function PaymentBlock({ billing, unit, invoiceId, amount, payer, month, paid }: {
  billing: BillingSettings;
  unit: string;
  invoiceId?: number;
  amount: number;
  payer?: string;
  month?: string;
  paid?: boolean;
}) {
  const reference = invoiceId ? invoiceReference(unit, invoiceId) : undefined;
  const purpose = month ? `${billing.purpose} ${month}`.slice(0, 35) : billing.purpose;
  const payload = buildIpsPayload({ settings: billing, amount, payer: payer ? `${payer}, stan ${unit}` : `Stan ${unit}`, purpose, reference });
  const account = normalizeAccount(billing.bank_account);

  return (
    <div className="mt-6 rounded-md border border-line p-4">
      <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint mb-3">Podaci za uplatu</div>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <dl className="flex-1 min-w-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          <dt className="text-ink-soft">Primalac</dt><dd className="font-semibold">{billing.payee_name}{billing.payee_address ? `, ${billing.payee_address}` : ''}</dd>
          <dt className="text-ink-soft">Račun</dt><dd><Copyable value={account ? formatAccount(account) : billing.bank_account} /></dd>
          <dt className="text-ink-soft">Iznos</dt><dd className="font-mono font-bold">{amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD</dd>
          <dt className="text-ink-soft">Šifra plaćanja</dt><dd className="font-mono">{billing.payment_code}</dd>
          <dt className="text-ink-soft">Svrha</dt><dd>{purpose}</dd>
          <dt className="text-ink-soft">Poziv na broj</dt><dd>{reference ? <Copyable value={formatReference(reference)} copyValue={reference} /> : <span className="text-ink-faint">dodeljuje se pri izdavanju</span>}</dd>
        </dl>
        {payload && !paid && <IpsQrCode payload={payload} size={150} />}
        {paid && <span className="tag tag-sage self-center">Plaćeno</span>}
      </div>
    </div>
  );
}

function Copyable({ value, copyValue }: { value: string; copyValue?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title="Kopiraj" onClick={() => { navigator.clipboard?.writeText(copyValue ?? value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}
      className="inline-flex items-center gap-1.5 font-mono hover:text-gold-dark">
      {value}{done ? <Check size={12} className="text-sage" /> : <Copy size={12} className="text-ink-faint" />}
    </button>
  );
}
