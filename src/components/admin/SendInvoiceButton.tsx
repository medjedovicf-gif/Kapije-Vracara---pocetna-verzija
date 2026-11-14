'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { Check, Eye, FileText, Pencil, Plus, ReceiptText, Send, Trash2, X } from 'lucide-react';
import { addBankStatement, createInvoice, recordManualInvoicePayment, updateInvoice } from '@/app/actions/invoices';
import type { Invoice, InvoiceLineItem, Profile } from '@/lib/types';
import { formatDate } from '@/lib/format';

type Draft = {
  from_email: string;
  recipient_name: string;
  recipient_email: string;
  month: string;
  description: string;
  due_date: string;
  items: { label: string; amount: string }[];
};

const sumItems = (items: Draft['items']) => items.reduce((a, x) => a + (Number(x.amount.replace(',', '.')) || 0), 0);
const rsd = (n: number) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} RSD`;

function draftFromInvoice(inv: Invoice): Draft {
  const items: InvoiceLineItem[] = inv.line_items?.length ? inv.line_items : [{ label: inv.description || 'Mesečno održavanje zgrade', amount: Number(inv.amount) }];
  return {
    from_email: inv.from_email ?? 'uprava@kapijevracara.rs',
    recipient_name: inv.recipient_name ?? '',
    recipient_email: inv.recipient_email ?? '',
    month: inv.month,
    description: inv.line_items?.length ? inv.description ?? '' : '',
    due_date: inv.due_date ?? '',
    items: items.map((x) => ({ label: x.label, amount: String(x.amount) })),
  };
}

/** Dugmad u redu stanara: nova faktura, pregled i izmena poslednje izdate fakture. */
export function SendInvoiceButton({ resident, latestInvoice }: { resident: Profile; latestInvoice?: Invoice }) {
  const [mode, setMode] = useState<null | 'new' | 'edit' | 'view'>(null);
  const [sent, setSent] = useState(false);
  const paid = latestInvoice?.status === 'Plaćena';
  const small = { padding: '7px 12px', fontSize: 12 } as const;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button onClick={() => setMode('new')} className="btn btn-outline" style={small}>
        <Send size={13} />
        {sent ? 'Poslato!' : 'Faktura'}
      </button>
      {latestInvoice && (
        <>
          <button onClick={() => setMode('view')} className="btn btn-outline" style={small} title={`Pregled fakture: ${latestInvoice.month}`}>
            <Eye size={13} /> Pregled
          </button>
          <button onClick={() => setMode('edit')} disabled={paid} className="btn btn-outline disabled:opacity-40 disabled:pointer-events-none" style={small}
            title={paid ? 'Plaćena faktura ne može da se menja' : `Izmeni fakturu: ${latestInvoice.month}`}>
            <Pencil size={13} /> Izmeni
          </button>
        </>
      )}

      {mode === 'view' && latestInvoice && (
        <Modal title={`Faktura za stan ${resident.unit} · ${latestInvoice.month}`} onClose={() => setMode(null)} width="sm:w-[640px]">
          <InvoicePreview unit={resident.unit ?? ''} data={draftFromInvoice(latestInvoice)} status={latestInvoice.status} />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setMode(null)} className="btn btn-outline">Zatvori</button>
            {!paid && <button onClick={() => setMode('edit')} className="btn btn-navy"><Pencil size={14} /> Izmeni</button>}
          </div>
        </Modal>
      )}

      {mode === 'edit' && latestInvoice && (
        <Modal title={`Izmena fakture · stan ${resident.unit}`} onClose={() => setMode(null)}>
          <InvoiceEditor
            resident={resident}
            initial={draftFromInvoice(latestInvoice)}
            submitLabel="Sačuvaj izmene"
            onSubmit={(fd) => updateInvoice(latestInvoice.id, fd)}
            onDone={() => setMode(null)}
          />
        </Modal>
      )}

      {mode === 'new' && (
        <Modal title={`Faktura za stan ${resident.unit}`} onClose={() => setMode(null)}>
          <InvoiceEditor
            resident={resident}
            initial={{
              from_email: 'uprava@kapijevracara.rs',
              recipient_name: resident.name,
              recipient_email: '',
              month: new Date().toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' }),
              description: '',
              due_date: '',
              items: [{ label: 'Mesečno održavanje zgrade', amount: String(Math.max(0, resident.balance || 0)) }],
            }}
            submitLabel="Pošalji fakturu"
            onSubmit={createInvoice}
            onDone={() => { setMode(null); setSent(true); setTimeout(() => setSent(false), 2500); }}
            extra={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <QuickPayment resident={resident} latestInvoice={latestInvoice} />
                <BankStatement buildingId={resident.building_id ?? ''} latestInvoice={latestInvoice} />
              </div>
            }
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, width = 'sm:w-[1000px]' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5 text-left" onClick={onClose}>
      <div className={`bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full ${width} max-w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-[19px] font-semibold text-navy-950">{title}</h3>
          <button onClick={onClose} aria-label="Zatvori" className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InvoiceEditor({ resident, initial, submitLabel, onSubmit, onDone, extra }: {
  resident: Profile;
  initial: Draft;
  submitLabel: string;
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean } | undefined>;
  onDone: () => void;
  extra?: ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const total = sumItems(draft.items);
  const set = (k: keyof Omit<Draft, 'items'>) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setItem = (i: number, patch: Partial<Draft['items'][number]>) => setDraft((d) => ({ ...d, items: d.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  function submit() {
    setError('');
    const items = draft.items.filter((x) => x.label.trim() && Number(x.amount.replace(',', '.')));
    if (!items.length || total <= 0) return setError('Dodajte bar jednu stavku sa iznosom.');
    const fd = new FormData();
    fd.set('unit', resident.unit ?? '');
    fd.set('building_id', resident.building_id ?? '');
    (['from_email', 'recipient_name', 'recipient_email', 'month', 'description', 'due_date'] as const).forEach((k) => fd.set(k, draft[k]));
    fd.set('line_items', JSON.stringify(items.map((x) => ({ label: x.label.trim(), amount: Number(x.amount.replace(',', '.')) }))));
    fd.set('amount', String(total));
    start(async () => {
      const res = await onSubmit(fd);
      if (res?.error) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email pošiljaoca"><input type="email" required value={draft.from_email} onChange={set('from_email')} className="field-input" /></Field>
          <Field label="Mesec"><input value={draft.month} onChange={set('month')} className="field-input" /></Field>
          <Field label="Primalac"><input value={draft.recipient_name} onChange={set('recipient_name')} className="field-input" /></Field>
          <Field label="Email primaoca"><input type="email" value={draft.recipient_email} onChange={set('recipient_email')} className="field-input" /></Field>
          <Field label="Rok plaćanja"><input type="date" value={draft.due_date} onChange={set('due_date')} className="field-input" /></Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="field-label !mb-0">Stavke</span>
            <span className="text-[11px] text-ink-faint">Popust ili umanjenje unesite sa minusom</span>
          </div>
          <div className="space-y-2">
            {draft.items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <input value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} placeholder="npr. Popravka interfona" aria-label={`Naziv stavke ${i + 1}`} className="field-input flex-1 min-w-0" />
                <input value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} type="number" step="0.01" inputMode="decimal" placeholder="Iznos" aria-label={`Iznos stavke ${i + 1}`} className="field-input !w-[120px] text-right" />
                <button type="button" onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))} disabled={draft.items.length === 1}
                  aria-label="Ukloni stavku" className="w-10 shrink-0 rounded-[10px] border border-line bg-white flex items-center justify-center text-ink-soft hover:text-brick disabled:opacity-30">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { label: '', amount: '' }] }))}
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gold-dark hover:text-navy-950">
            <Plus size={14} /> Dodaj stavku
          </button>
          <div className="flex justify-between items-center border-t border-line mt-3 pt-3 text-sm">
            <span className="font-semibold">Ukupno</span>
            <span className="font-mono font-bold">{rsd(total)}</span>
          </div>
        </div>

        <div className="mt-3 mb-4">
          <label className="field-label">Napomena na fakturi</label>
          <textarea rows={2} value={draft.description} onChange={set('description')} placeholder="npr. poziv na broj, instrukcije za plaćanje" className="field-input resize-none" />
        </div>
        {error && <p className="text-brick text-xs font-semibold mb-3">{error}</p>}
        <button type="button" onClick={submit} disabled={pending} className="btn btn-navy w-full justify-center disabled:opacity-60">
          {submitLabel === 'Pošalji fakturu' ? <Send size={15} /> : <Check size={15} />}
          {pending ? 'Čuva se…' : submitLabel}
        </button>
        {extra}
      </div>

      <InvoicePreview unit={resident.unit ?? ''} data={draft} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}

function InvoicePreview({ unit, data, status }: { unit: string; data: Draft; status?: string }) {
  const items = data.items.filter((x) => x.label.trim() || Number(x.amount));
  const total = sumItems(items);
  return (
    <div className="bg-white border border-line rounded-md p-6 shadow-card lg:min-h-[520px]">
      <div className="flex justify-between items-start border-b border-line pb-5 mb-5">
        <div>
          <div className="font-display text-2xl font-semibold text-navy-950">FAKTURA</div>
          <div className="text-xs text-ink-soft mt-1">{data.month || 'Mesec'}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <FileText size={28} className="text-gold-dark" />
          {status && <span className={`tag ${status === 'Plaćena' ? 'tag-sage' : 'tag-gold'}`}>{status}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-[12.5px] mb-6">
        <div><div className="field-label">Od</div><div className="font-semibold">Uprava zgrade</div><div className="text-ink-soft break-all">{data.from_email || 'email pošiljaoca'}</div></div>
        <div><div className="field-label">Za</div><div className="font-semibold">{data.recipient_name || 'Stanar'}</div><div className="text-ink-soft break-all">Stan {unit}{data.recipient_email ? ` · ${data.recipient_email}` : ''}</div></div>
      </div>
      <div className="border border-line rounded-md overflow-hidden mb-5">
        <div className="grid grid-cols-[1fr,130px] bg-cream-2 text-[11px] font-mono uppercase text-ink-faint">
          <div className="p-3">Stavka</div><div className="p-3 text-right">Iznos</div>
        </div>
        {items.map((x, i) => (
          <div key={i} className="grid grid-cols-[1fr,130px] text-sm border-t border-line first:border-t-0">
            <div className="p-3">{x.label || 'Stavka'}</div>
            <div className={`p-3 text-right font-mono font-bold ${Number(x.amount) < 0 ? 'text-sage-dark' : ''}`}>{rsd(Number(x.amount.replace(',', '.')) || 0)}</div>
          </div>
        ))}
        {!items.length && <div className="p-3 text-sm text-ink-faint">Nema stavki.</div>}
      </div>
      <div className="flex justify-between text-sm mb-2"><span className="font-semibold">Ukupno za uplatu</span><span className="font-mono font-bold">{rsd(total)}</span></div>
      <div className="flex justify-between text-[12.5px] text-ink-soft"><span>Rok plaćanja</span><span>{data.due_date ? formatDate(data.due_date) : 'Nije unet'}</span></div>
      {data.description && <div className="mt-6 rounded-md bg-cream-2 p-4 text-[12.5px] text-ink whitespace-pre-line">{data.description}</div>}
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
