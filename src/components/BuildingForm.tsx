'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Building2, Pencil, Plus } from 'lucide-react';
import { saveBuilding } from '@/app/actions/buildings';
import { HEATING_TYPES, MANAGEMENT_TYPES, fullAddress } from '@/lib/buildings';
import { formatAccount, normalizeAccount } from '@/lib/ips';
import { formatDate } from '@/lib/format';
import type { Building } from '@/lib/types';
import { AdminModal, Field } from '@/components/admin/AdminModal';

/** Dugme + forma za novu zgradu (building = null) ili izmenu postojeće. */
export function BuildingFormButton({ building, label, variant = 'navy' }: { building: Building | null; label?: string; variant?: 'navy' | 'outline' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState(building?.bank_account ? formatAccount(building.bank_account) : '');
  const [pending, start] = useTransition();
  const accountOk = !account.trim() || !!normalizeAccount(account);
  const b = building ?? ({} as Partial<Building>);

  function submit(fd: FormData) {
    setError('');
    start(async () => {
      const res = await saveBuilding(building?.id ?? null, fd);
      if (res.error) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn ${variant === 'navy' ? 'btn-navy' : 'btn-outline'} !px-3.5 !py-2 !text-[12.5px]`}>
        {building ? <Pencil size={14} /> : <Plus size={15} />} {label ?? (building ? 'Izmeni podatke' : 'Dodaj stambenu zajednicu')}
      </button>
      {open && (
        <AdminModal title={building ? `Podaci zgrade · ${building.name}` : 'Nova stambena zajednica'} onClose={() => setOpen(false)} width="sm:w-[820px]">
          <form action={submit} className="space-y-5">
            <Section title="Osnovno">
              <Field label="Naziv *" className="sm:col-span-2"><input name="name" required defaultValue={b.name ?? ''} placeholder="npr. Zgrada B – Sazonova 75" className="field-input" /></Field>
              <Field label="Kod stambene zajednice"><input name="code" defaultValue={b.code ?? ''} placeholder="npr. SZ-VR-075" className="field-input font-mono" /></Field>
              <Field label="Email zgrade"><input name="email" type="email" defaultValue={b.email ?? ''} placeholder="npr. sazonova75@…" className="field-input" /></Field>
            </Section>

            <Section title="Adresa">
              <Field label="Adresa" className="sm:col-span-2"><input name="address" defaultValue={b.address ?? ''} placeholder="Ulica i broj" className="field-input" /></Field>
              <Field label="Grad"><input name="city" defaultValue={b.city ?? 'Beograd'} className="field-input" /></Field>
              <Field label="Opština"><input name="municipality" defaultValue={b.municipality ?? ''} placeholder="npr. Vračar" className="field-input" /></Field>
              <Field label="Poštanski broj"><input name="postal_code" inputMode="numeric" maxLength={5} defaultValue={b.postal_code ?? ''} placeholder="11000" className="field-input font-mono" /></Field>
            </Section>

            <Section title="Zgrada">
              <Field label="Godina izgradnje"><input name="year_built" type="number" min="1800" max="2100" defaultValue={b.year_built ?? ''} className="field-input" /></Field>
              <Field label="Spratnost"><input name="floors" defaultValue={b.floors ?? ''} placeholder="npr. Po+P+6+Pk" className="field-input" /></Field>
              <Field label="Lift (broj liftova, 0 = nema)"><input name="elevator_count" type="number" min="0" max="20" defaultValue={b.elevator_count ?? ''} className="field-input" /></Field>
              <Field label="Tip grejanja">
                <select name="heating_type" defaultValue={b.heating_type ?? ''} className="field-input">
                  <option value="">— izaberite —</option>
                  {HEATING_TYPES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Vrsta uprave">
                <select name="management_type" defaultValue={b.management_type ?? ''} className="field-input">
                  <option value="">— izaberite —</option>
                  {MANAGEMENT_TYPES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
            </Section>

            <Section title="Finansije i registracija">
              <Field label="Tekući račun" className="sm:col-span-2">
                <input name="bank_account" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="npr. 160-5100000000-04" className={`field-input font-mono ${accountOk ? '' : '!border-brick'}`} />
                <span className={`block text-[11px] mt-1 ${accountOk ? 'text-ink-faint' : 'text-brick'}`}>{accountOk ? 'Koristi se i za uplatnice i IPS QR kod.' : 'Broj računa ili kontrolni broj nije ispravan.'}</span>
              </Field>
              <Field label="PIB"><input name="tax_id" inputMode="numeric" maxLength={9} defaultValue={b.tax_id ?? ''} className="field-input font-mono" /></Field>
              <Field label="Matični broj"><input name="registration_number" inputMode="numeric" maxLength={8} defaultValue={b.registration_number ?? ''} className="field-input font-mono" /></Field>
              <Field label="Početno stanje računa (RSD)"><input name="opening_balance" type="number" step="0.01" defaultValue={b.opening_balance ?? ''} className="field-input" /></Field>
              <Field label="Stanje na dan"><input name="opening_balance_date" type="date" defaultValue={b.opening_balance_date ?? ''} className="field-input" /></Field>
            </Section>

            <Field label="Komentar"><textarea name="comment" rows={3} defaultValue={b.comment ?? ''} className="field-input resize-none" /></Field>

            {error && <p className="text-[12.5px] text-brick font-semibold">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Otkaži</button>
              <button type="submit" disabled={pending || !accountOk} className="btn btn-navy disabled:opacity-60">{pending ? 'Čuvam…' : building ? 'Sačuvaj izmene' : 'Dodaj zgradu'}</button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint mb-2">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </fieldset>
  );
}

/** Kartica sa svim podacima zgrade (samo prikaz). */
export function BuildingDetails({ building }: { building: Building }) {
  const rows: [string, string | null | undefined][] = [
    ['Kod', building.code],
    ['Adresa', fullAddress(building) || null],
    ['Email', building.email],
    ['Tekući račun', building.bank_account ? formatAccount(building.bank_account) : null],
    ['PIB', building.tax_id],
    ['Matični broj', building.registration_number],
    ['Godina izgradnje', building.year_built ? String(building.year_built) : null],
    ['Spratnost', building.floors],
    ['Lift', building.elevator_count === null || building.elevator_count === undefined ? null : building.elevator_count === 0 ? 'Nema' : `${building.elevator_count}`],
    ['Grejanje', building.heating_type],
    ['Vrsta uprave', building.management_type],
    ['Početno stanje', building.opening_balance === null || building.opening_balance === undefined ? null : `${Number(building.opening_balance).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD${building.opening_balance_date ? ` (na dan ${formatDate(building.opening_balance_date)})` : ''}`],
  ];
  const filled = rows.filter(([, v]) => v);
  return (
    <div>
      {filled.length ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
          {filled.map(([k, v]) => (
            <div key={k} className="flex gap-3 border-b border-line/70 pb-1.5">
              <dt className="w-[120px] shrink-0 text-ink-soft">{k}</dt>
              <dd className="font-semibold break-words min-w-0">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[12.5px] text-ink-faint flex items-center gap-2"><Building2 size={14} /> Podaci o zgradi još nisu uneti.</p>
      )}
      {building.comment && <p className="mt-3 text-[12.5px] text-ink-soft whitespace-pre-line bg-cream-2/60 rounded-[10px] px-3 py-2">{building.comment}</p>}
    </div>
  );
}
