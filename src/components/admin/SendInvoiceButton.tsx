'use client';


import { useRouter } from 'next/navigation';import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { Check, FileText, ReceiptText, Send, X } from 'lucide-react';
import { addBankStatement, createInvoice, recordManualInvoicePayment } from '@/app/actions/invoices';
import type { Invoice, Profile } from '@/lib/types';

export function SendInvoiceButton({ resident, latestInvoice }: { resident: Profile; latestInvoice?: Invoice }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const defaultMonth = new Date().toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' });
  const [preview, setPreview] = useState({
    from_email: 'uprava@kapijevracara.rs',
    recipient_name: resident.name,
    recipient_email: '',
    month: defaultMonth,
    description: 'Mesečno održavanje zgrade',
    amount: String(Math.max(0, resident.balance || 0)),
    due_date: '',
  });

  function submitInvoice(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await createInvoice(formData);
      if (result?.error) setError(result.error);
      if (!result?.error) {
        setSent(true);
        setOpen(false);
        setTimeout(() => setSent(false), 2500);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={isPending} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: 12 }}>
        <Send size={13} />
        {sent ? 'Poslato!' : 'Faktura'}
      </button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[980px] max-w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Faktura za stan {resident.unit}</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-[1fr,1fr] gap-5">
              <div>
                <form action={submitInvoice} onChange={(e) => {
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  setPreview({
                    from_email: String(data.get('from_email') || ''),
                    recipient_name: String(data.get('recipient_name') || ''),
                    recipient_email: String(data.get('recipient_email') || ''),
                    month: String(data.get('month') || ''),
                    description: String(data.get('description') || ''),
                    amount: String(data.get('amount') || ''),
                    due_date: String(data.get('due_date') || ''),
                  });
                }}>
                  <input type="hidden" name="unit" value={resident.unit ?? ''} />
                  <input type="hidden" name="building_id" value={resident.building_id ?? ''} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email pošiljaoca"><input name="from_email" type="email" required defaultValue={preview.from_email} className="field-input" /></Field>
                    <Field label="Mesec"><input name="month" defaultValue={preview.month} className="field-input" /></Field>
                    <Field label="Primalac"><input name="recipient_name" defaultValue={preview.recipient_name} className="field-input" /></Field>
                    <Field label="Email primaoca"><input name="recipient_email" type="email" defaultValue={preview.recipient_email} className="field-input" /></Field>
                    <Field label="Iznos"><input name="amount" type="number" step="0.01" required defaultValue={preview.amount} className="field-input" /></Field>
                    <Field label="Rok plaćanja"><input name="due_date" type="date" className="field-input" /></Field>
                  </div>
                  <div className="mt-3 mb-4">
                    <label className="field-label">Opis stavke</label>
                    <textarea name="description" rows={3} defaultValue={preview.description} className="field-input" />
                  </div>
                  {error && <p className="text-brick text-xs mb-3">{error}</p>}
                  <button disabled={isPending} className="btn btn-navy w-full justify-center">
                    <Send size={15} />
                    {isPending ? 'Čuva se…' : 'Pošalji fakturu'}
                  </button>
                </form>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <QuickPayment resident={resident} latestInvoice={latestInvoice} />
                  <BankStatement buildingId={resident.building_id ?? ''} latestInvoice={latestInvoice} />
                </div>
              </div>

              <InvoicePreview unit={resident.unit ?? ''} data={preview} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}

function InvoicePreview({ unit, data }: { unit: string; data: { from_email: string; recipient_name: string; recipient_email: string; month: string; description: string; amount: string; due_date: string } }) {
  const amount = Number(data.amount || 0);
  return (
    <div className="bg-white border border-line rounded-md p-6 shadow-card min-h-[520px]">
      <div className="flex justify-between items-start border-b border-line pb-5 mb-5">
        <div>
          <div className="font-display text-2xl font-semibold text-navy-950">FAKTURA</div>
          <div className="text-xs text-ink-soft mt-1">{data.month || 'Mesec'}</div>
        </div>
        <FileText size={28} className="text-gold-dark" />
      </div>
      <div className="grid grid-cols-2 gap-4 text-[12.5px] mb-6">
        <div><div className="field-label">Od</div><div className="font-semibold">Uprava zgrade</div><div className="text-ink-soft">{data.from_email || 'email pošiljaoca'}</div></div>
        <div><div className="field-label">Za</div><div className="font-semibold">{data.recipient_name || 'Stanar'}</div><div className="text-ink-soft">Stan {unit}{data.recipient_email ? ` · ${data.recipient_email}` : ''}</div></div>
      </div>
      <div className="border border-line rounded-md overflow-hidden mb-5">
        <div className="grid grid-cols-[1fr,120px] bg-cream-2 text-[11px] font-mono uppercase text-ink-faint">
          <div className="p-3">Stavka</div><div className="p-3 text-right">Iznos</div>
        </div>
        <div className="grid grid-cols-[1fr,120px] text-sm">
          <div className="p-3">{data.description || 'Opis stavke'}</div><div className="p-3 text-right font-mono font-bold">{amount.toLocaleString('de-DE')} RSD</div>
        </div>
      </div>
      <div className="flex justify-between text-sm mb-2"><span>Ukupno</span><span className="font-mono font-bold">{amount.toLocaleString('de-DE')} RSD</span></div>
      <div className="flex justify-between text-[12.5px] text-ink-soft"><span>Rok plaćanja</span><span>{data.due_date || 'Nije unet'}</span></div>
      <div className="mt-8 rounded-md bg-cream-2 p-4 text-[12px] text-ink-soft">
        Poziv na broj i instrukcije za plaćanje dodajte u opis stavke ili poruku uz fakturu.
      </div>
    </div>
  );
}

function QuickPayment({ resident, latestInvoice }: { resident: Profile; latestInvoice?: Invoice }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  return (
    <form action={(formData) => {
      setMsg('');
      start(async () => {
        const result = await recordManualInvoicePayment(formData);
        setMsg(result?.error ?? 'Proknjiženo.');
        if (!result?.error) router.refresh();
      });
    }} className="border border-line rounded-md bg-white p-3">
      <div className="flex items-center gap-2 font-semibold text-[12.5px] mb-3"><ReceiptText size={14} />Ručno knjiženje</div>
      <input type="hidden" name="unit" value={resident.unit ?? ''} />
      <input type="hidden" name="building_id" value={resident.building_id ?? ''} />
      <input type="hidden" name="invoice_id" value={latestInvoice?.id ?? ''} />
      <input name="amount" type="number" step="0.01" required placeholder="Iznos" className="field-input mb-2" />
      <input name="payment_date" type="date" className="field-input mb-2" />
      <input name="reference" placeholder="Poziv na broj" className="field-input mb-2" />
      <button disabled={pending} className="btn btn-outline w-full justify-center"><Check size={14} />Proknjiži</button>
      {msg && <p className="text-[11px] text-ink-soft mt-2">{msg}</p>}
    </form>
  );
}

function BankStatement({ buildingId, latestInvoice }: { buildingId: string; latestInvoice?: Invoice }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  return (
    <form action={(formData) => {
      setMsg('');
      start(async () => {
        const result = await addBankStatement(formData);
        setMsg(result?.error ?? 'Izvod dodat.');
        if (!result?.error) router.refresh();
      });
    }} className="border border-line rounded-md bg-white p-3">
      <div className="flex items-center gap-2 font-semibold text-[12.5px] mb-3"><FileText size={14} />Izvod banke</div>
      <input type="hidden" name="building_id" value={buildingId} />
      <input type="hidden" name="matched_invoice_id" value={latestInvoice?.id ?? ''} />
      <input name="amount" type="number" step="0.01" required placeholder="Iznos" className="field-input mb-2" />
      <input name="statement_date" type="date" className="field-input mb-2" />
      <input name="payer" placeholder="Uplatilac" className="field-input mb-2" />
      <input name="reference" placeholder="Referenca" className="field-input mb-2" />
      <button disabled={pending} className="btn btn-outline w-full justify-center"><Check size={14} />Dodaj izvod</button>
      {msg && <p className="text-[11px] text-ink-soft mt-2">{msg}</p>}
    </form>
  );
}
