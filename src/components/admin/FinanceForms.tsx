'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CalendarPlus, FileUp, Plus, Trash2 } from 'lucide-react';
import { createExpense, createPlannedWork, deleteExpense, deletePlannedWork, setExpenseStatus, setPlannedWorkStatus } from '@/app/actions/admin-finance';
import { EXPENSE_CATEGORIES, EXPENSE_FILE_ACCEPT, MAX_EXPENSE_FILE, PLANNED_WORK_STATUSES } from '@/lib/finance';
import type { ExpenseStatus } from '@/lib/types';
import { AdminModal, Field } from './AdminModal';

const today = () => new Date().toISOString().slice(0, 10);

export function NewExpenseButton({ plannedWorks = [], compact }: { plannedWorks?: { id: number; title: string }[]; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [paid, setPaid] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError('');
    const file = fd.get('file');
    if (file instanceof File && file.size > MAX_EXPENSE_FILE) {
      setError('Fajl je veći od 4 MB. Smanjite ga ili sačuvajte kao manji PDF.');
      return;
    }
    start(async () => {
      const res = await createExpense(fd);
      if (res.error) return setError(res.error);
      setOpen(false);
      setFileName('');
      setPaid(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-navy ${compact ? '!px-3.5 !py-2 !text-[12.5px]' : ''}`}>
        <Plus size={15} /> Nova faktura
      </button>
      {open && (
        <AdminModal title="Nova faktura dobavljača" onClose={() => setOpen(false)}>
          <form action={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Dobavljač *"><input name="supplier" required placeholder="npr. EPS, Lift servis d.o.o." className="field-input" /></Field>
            <Field label="Broj fakture"><input name="invoice_number" placeholder="npr. 2026-0142" className="field-input" /></Field>
            <Field label="Kategorija">
              <select name="category" defaultValue="Održavanje" className="field-input">
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Iznos (RSD) *"><input name="amount" type="number" min="0.01" step="0.01" required inputMode="decimal" className="field-input" /></Field>
            <Field label="Datum fakture"><input name="issue_date" type="date" defaultValue={today()} className="field-input" /></Field>
            <Field label="Rok plaćanja"><input name="due_date" type="date" className="field-input" /></Field>
            {plannedWorks.length > 0 && (
              <Field label="Vezano za planirani rad" className="sm:col-span-2">
                <select name="planned_work_id" defaultValue="" className="field-input">
                  <option value="">— nije vezano —</option>
                  {plannedWorks.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                </select>
              </Field>
            )}
            <Field label="Opis" className="sm:col-span-2"><textarea name="description" rows={2} className="field-input resize-none" placeholder="Šta je urađeno ili plaćeno" /></Field>

            <label className="sm:col-span-2 flex items-center gap-3 rounded-[10px] border border-dashed border-ink-faint/60 bg-white px-4 py-3 cursor-pointer hover:border-navy-950">
              <FileUp size={18} className="text-ink-soft shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold truncate">{fileName || 'Učitaj fakturu (PDF ili slika)'}</span>
                <span className="block text-[11px] text-ink-faint">Najviše 4 MB. Može i fotografija sa telefona.</span>
              </span>
              <input name="file" type="file" accept={EXPENSE_FILE_ACCEPT} className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
            </label>

            <label className="sm:col-span-2 flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="status" value="Plaćeno" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 accent-navy-950" />
              Faktura je već plaćena
            </label>
            {paid && <Field label="Datum plaćanja"><input name="paid_at" type="date" defaultValue={today()} className="field-input" /></Field>}

            {error && <p className="sm:col-span-2 text-[12.5px] text-brick font-semibold">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Otkaži</button>
              <button type="submit" disabled={pending} className="btn btn-navy disabled:opacity-60">{pending ? 'Čuvam…' : 'Sačuvaj fakturu'}</button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  );
}

export function NewPlannedWorkButton({ compact, outline }: { compact?: boolean; outline?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError('');
    start(async () => {
      const res = await createPlannedWork(fd);
      if (res.error) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn ${outline ? 'btn-outline' : 'btn-navy'} ${compact ? '!px-3.5 !py-2 !text-[12.5px]' : ''}`}>
        <CalendarPlus size={15} /> Planiraj rad
      </button>
      {open && (
        <AdminModal title="Novi planirani rad" onClose={() => setOpen(false)}>
          <form action={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Naziv rada *" className="sm:col-span-2"><input name="title" required placeholder="npr. Krečenje stepeništa" className="field-input" /></Field>
            <Field label="Kategorija">
              <select name="category" defaultValue="Održavanje" className="field-input">
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Planirani datum"><input name="planned_date" type="date" className="field-input" /></Field>
            <Field label="Procena troška (RSD)"><input name="estimated_cost" type="number" min="0" step="1" inputMode="numeric" className="field-input" /></Field>
            <Field label="Izvođač"><input name="contractor" placeholder="Firma ili majstor" className="field-input" /></Field>
            <Field label="Opis" className="sm:col-span-2"><textarea name="description" rows={3} className="field-input resize-none" /></Field>
            {error && <p className="sm:col-span-2 text-[12.5px] text-brick font-semibold">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Otkaži</button>
              <button type="submit" disabled={pending} className="btn btn-navy disabled:opacity-60">{pending ? 'Čuvam…' : 'Sačuvaj'}</button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  );
}

export function ExpenseRowActions({ id, status, label }: { id: number; status: ExpenseStatus; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => {
    const res = await fn();
    if (res.error) alert(res.error);
    router.refresh();
  });
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" disabled={pending} onClick={() => run(() => setExpenseStatus(id, status === 'Plaćeno' ? 'Neplaćeno' : 'Plaćeno'))}
        className="btn btn-outline !px-3 !py-1.5 !text-[11.5px] disabled:opacity-50">
        {status === 'Plaćeno' ? 'Vrati na neplaćeno' : 'Označi plaćeno'}
      </button>
      <button type="button" disabled={pending} aria-label="Obriši fakturu"
        onClick={() => { if (confirm(`Obrisati fakturu „${label}“? Učitani fajl se briše zajedno sa njom.`)) run(() => deleteExpense(id)); }}
        className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center text-ink-soft hover:text-brick hover:border-brick disabled:opacity-50">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function PlannedWorkActions({ id, status, title }: { id: number; status: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1.5">
      <select value={status} disabled={pending} aria-label="Status rada"
        onChange={(e) => { const next = e.target.value; start(async () => { const r = await setPlannedWorkStatus(id, next); if (r.error) alert(r.error); router.refresh(); }); }}
        className="field-input !w-auto !py-1.5 !px-2.5 !text-[12px]">
        {PLANNED_WORK_STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <button type="button" disabled={pending} aria-label="Obriši rad"
        onClick={() => { if (confirm(`Obrisati planirani rad „${title}“?`)) start(async () => { const r = await deletePlannedWork(id); if (r.error) alert(r.error); router.refresh(); }); }}
        className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center text-ink-soft hover:text-brick hover:border-brick disabled:opacity-50">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
