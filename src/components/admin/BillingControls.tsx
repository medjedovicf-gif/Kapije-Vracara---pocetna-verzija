'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { CalendarRange, Settings2 } from 'lucide-react';
import { createMonthlyCharges, saveBillingSettings } from '@/app/actions/billing';
import { formatAccount, normalizeAccount, periodLabel, type BillingSettings } from '@/lib/ips';
import { AdminModal, Field } from './AdminModal';

const rsd = (n: number) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} RSD`;

export function BillingSettingsButton({ settings, highlight }: { settings: BillingSettings | null; highlight?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState(settings?.bank_account ? formatAccount(settings.bank_account) : '');
  const [pending, start] = useTransition();
  const accountOk = !account || !!normalizeAccount(account);

  function submit(fd: FormData) {
    setError('');
    start(async () => {
      const res = await saveBillingSettings(fd);
      if (res.error) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn ${highlight ? 'btn-gold' : 'btn-outline'} !px-3.5 !py-2 !text-[12.5px]`}>
        <Settings2 size={15} /> Podešavanja uplate
      </button>
      {open && (
        <AdminModal title="Podešavanja uplate" onClose={() => setOpen(false)}>
          <p className="text-[12.5px] text-ink-soft mb-4">Ovi podaci idu na svaku uplatnicu i u IPS QR kod. Stanar skenira kod u m-banking aplikaciji i plaća bez prepisivanja.</p>
          <form action={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Primalac (naziv) *" className="sm:col-span-2"><input name="payee_name" required maxLength={70} defaultValue={settings?.payee_name ?? ''} placeholder="npr. Stambena zajednica Sazonova 75" className="field-input" /></Field>
            <Field label="Adresa primaoca" className="sm:col-span-2"><input name="payee_address" maxLength={70} defaultValue={settings?.payee_address ?? ''} placeholder="npr. Sazonova 75, Beograd" className="field-input" /></Field>
            <Field label="Tekući račun zgrade *" className="sm:col-span-2">
              <input name="bank_account" required value={account} onChange={(e) => setAccount(e.target.value)} placeholder="npr. 160-5100000000-04" className={`field-input font-mono ${accountOk ? '' : '!border-brick'}`} />
              {!accountOk && <span className="block text-[11px] text-brick mt-1">Broj računa ili kontrolni broj nije ispravan.</span>}
            </Field>
            <Field label="Šifra plaćanja"><input name="payment_code" maxLength={3} inputMode="numeric" defaultValue={settings?.payment_code ?? '289'} className="field-input font-mono" /></Field>
            <Field label="Svrha uplate"><input name="purpose" maxLength={35} defaultValue={settings?.purpose ?? 'Održavanje zgrade'} className="field-input" /></Field>
            <Field label="Mesečni iznos po stanu (RSD)"><input name="default_amount" type="number" min="0" step="0.01" defaultValue={settings?.default_amount ?? ''} className="field-input" /></Field>
            <Field label="Rok plaćanja (dan u mesecu)"><input name="due_day" type="number" min="1" max="28" defaultValue={settings?.due_day ?? 15} className="field-input" /></Field>
            {error && <p className="sm:col-span-2 text-[12.5px] text-brick font-semibold">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Otkaži</button>
              <button type="submit" disabled={pending || !accountOk} className="btn btn-navy disabled:opacity-60">{pending ? 'Čuvam…' : 'Sačuvaj'}</button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  );
}

type UnitRow = { unit: string; name: string; lastAmount: number | null };

export function MonthlyChargeButton({ units, settings, chargedByPeriod, defaultPeriod }: {
  units: UnitRow[];
  settings: BillingSettings | null;
  chargedByPeriod: Record<string, string[]>;
  defaultPeriod: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod);
  const dueFor = (p: string) => `${p}-${String(settings?.due_day ?? 15).padStart(2, '0')}`;
  const [dueDate, setDueDate] = useState(dueFor(defaultPeriod));
  const [label, setLabel] = useState(settings?.purpose || 'Održavanje zgrade');
  const initialRows = () => units.map((u) => ({ ...u, amount: String(u.lastAmount ?? settings?.default_amount ?? ''), on: true }));
  const [rows, setRows] = useState(initialRows);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [pending, start] = useTransition();

  const charged = useMemo(() => new Set(chargedByPeriod[period] ?? []), [chargedByPeriod, period]);
  const selected = rows.filter((r) => r.on && !charged.has(r.unit) && Number(r.amount) > 0);
  const total = selected.reduce((a, r) => a + Number(r.amount), 0);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await createMonthlyCharges({ period, dueDate, label, rows: selected.map((r) => ({ unit: r.unit, amount: Number(r.amount), recipient: r.name })) });
      if (res.error) return setMsg({ tone: 'err', text: res.error });
      setMsg({ tone: 'ok', text: `Izdato ${res.created} uplatnica za ${periodLabel(period)}.${res.skipped?.length ? ` Preskočeno (već zaduženo): ${res.skipped.join(', ')}.` : ''}` });
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg(null); setRows(initialRows()); }} className="btn btn-navy !px-3.5 !py-2 !text-[12.5px]">
        <CalendarRange size={15} /> Mesečno zaduženje
      </button>
      {open && (
        <AdminModal title="Mesečno zaduženje" onClose={() => setOpen(false)} width="sm:w-[760px]">
          {!settings?.bank_account && (
            <p className="text-[12.5px] bg-[#FBEFD3] text-gold-dark rounded-[10px] px-3 py-2 mb-3 font-semibold">Podešavanja uplate nisu uneta, pa uplatnice neće imati IPS QR kod. Unesite ih preko dugmeta „Podešavanja uplate“.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Field label="Obračunski mesec"><input type="month" value={period} onChange={(e) => { setPeriod(e.target.value); setDueDate(dueFor(e.target.value)); }} className="field-input" /></Field>
            <Field label="Rok plaćanja"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field-input" /></Field>
            <Field label="Stavka"><input value={label} onChange={(e) => setLabel(e.target.value)} className="field-input" /></Field>
          </div>

          <div className="border border-line rounded-md bg-white overflow-hidden">
            <div className="grid grid-cols-[36px_70px_1fr_140px] items-center px-3 py-2 bg-cream/60 text-[10.5px] font-mono uppercase tracking-wide text-ink-faint border-b border-line">
              <input type="checkbox" aria-label="Izaberi sve" checked={rows.every((r) => r.on)} onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, on: e.target.checked })))} className="w-4 h-4 accent-navy-950" />
              <span>Stan</span><span>Stanar</span><span className="text-right">Iznos (RSD)</span>
            </div>
            <div className="max-h-[42vh] overflow-y-auto">
              {rows.map((r, i) => {
                const done = charged.has(r.unit);
                return (
                  <div key={r.unit} className={`grid grid-cols-[36px_70px_1fr_140px] items-center px-3 py-1.5 border-b border-line last:border-0 ${done ? 'opacity-50' : ''}`}>
                    <input type="checkbox" aria-label={`Stan ${r.unit}`} disabled={done} checked={r.on && !done} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} className="w-4 h-4 accent-navy-950" />
                    <span className="font-bold text-[13px]">{r.unit}</span>
                    <span className="text-[12.5px] truncate">{r.name}{done && <span className="tag tag-sage ml-2">već zaduženo</span>}</span>
                    <input type="number" min="0" step="0.01" disabled={done || !r.on} value={r.amount} aria-label={`Iznos za stan ${r.unit}`}
                      onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                      className="field-input !py-1.5 text-right font-mono disabled:bg-cream-2/50" />
                  </div>
                );
              })}
              {!rows.length && <p className="px-3 py-4 text-[12.5px] text-ink-faint">Nema stanova sa stanarima.</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="text-[13px]"><span className="text-ink-soft">{selected.length} stanova · ukupno </span><span className="font-mono font-bold">{rsd(total)}</span></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Zatvori</button>
              <button type="button" onClick={submit} disabled={pending || !selected.length} className="btn btn-navy disabled:opacity-50">{pending ? 'Izdajem…' : `Izdaj ${selected.length} uplatnica`}</button>
            </div>
          </div>
          {msg && <p className={`mt-3 text-[12.5px] font-semibold ${msg.tone === 'ok' ? 'text-sage-dark' : 'text-brick'}`}>{msg.text}</p>}
        </AdminModal>
      )}
    </>
  );
}
