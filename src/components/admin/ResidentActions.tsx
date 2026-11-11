'use client';

import { useState, useTransition } from 'react';
import { UserPlus, X, Check, KeyRound, Trash2, Pencil } from 'lucide-react';
import { addResident, deleteResident, changeResidentPassword, toggleResidentStatus, updateResident } from '@/app/actions/residents';
import type { Profile } from '@/lib/types';

export function StatusTag({ profileId, status }: { profileId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (isPending) return;
    startTransition(async () => {
      const result = await toggleResidentStatus(profileId, current);
      if (!('error' in result)) setCurrent((c) => (c === 'Plaćeno' ? 'Na čekanju' : 'Plaćeno'));
    });
  }

  return (
    <span onClick={toggle} className={`tag cursor-pointer ${current === 'Plaćeno' ? 'tag-sage' : 'tag-gold'}`}>
      {current}
    </span>
  );
}

export function AddResidentButton({ buildingId, buildings }: { buildingId?: string; buildings?: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await addResident(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button className="btn btn-navy" style={{ padding: '9px 16px', fontSize: 12.5 }} onClick={() => setOpen(true)}>
        <UserPlus size={15} />
        Dodaj stanara
      </button>

      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-lg p-6 w-[420px] max-w-full max-h-[88vh] overflow-y-auto shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Dodaj stanara</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <form action={handleSubmit}>
              {buildings && (
                <div className="mb-3">
                  <label className="field-label">Zgrada</label>
                  <select name="building_id" className="field-input" defaultValue={buildingId}>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="field-label">Ime i prezime</label>
                <input name="name" type="text" required className="field-input" placeholder="Ime Prezime" />
              </div>
              <div className="mb-3">
                <label className="field-label">Stan</label>
                <input name="unit" type="text" required className="field-input" placeholder="npr. 7C" />
              </div>
              <div className="mb-3">
                <label className="field-label">Početno stanje (RSD)</label>
                <input name="balance" type="number" className="field-input" placeholder="0" />
              </div>
              <p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mt-4 mb-2">Pristup za prijavu (opciono)</p>
              <div className="mb-3">
                <label className="field-label">Email</label>
                <input name="email" type="email" className="field-input" placeholder="ime@primer.rs" />
              </div>
              <div className="mb-4">
                <label className="field-label">Lozinka</label>
                <input name="password" type="text" className="field-input" placeholder="lozinka" />
              </div>
              {error && <p className="text-brick text-xs mb-3">{error}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-outline flex-1">Otkaži</button>
                <button type="submit" disabled={isPending} className="btn btn-navy flex-1 disabled:opacity-60">
                  <Check size={15} />
                  {isPending ? 'Čuva se…' : 'Sačuvaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ResidentRowActions({ resident, buildings }: { resident: Profile; buildings?: { id: string; name: string }[] }) {
  const profileId = resident.id;
  const [pwOpen, setPwOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [isPending, startTransition] = useTransition();

  function submitPassword() {
    setError('');
    startTransition(async () => {
      const result = await changeResidentPassword(profileId, pw);
      if (result?.error) setError(result.error);
      else {
        setPwOpen(false);
        setPw('');
      }
    });
  }

  function onDelete() {
    if (!confirm('Ukloniti ovog stanara sa liste?')) return;
    startTransition(async () => {
      await deleteResident(profileId);
      window.location.reload();
    });
  }

  function submitEdit(formData: FormData) {
    setEditError('');
    startTransition(async () => {
      const result = await updateResident(profileId, formData);
      if (result?.error) setEditError(result.error);
      else {
        setEditOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setEditOpen(true)}
        title="Uredi stanara"
        className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={() => setPwOpen(true)}
        title="Lozinka za prijavu"
        className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center"
      >
        <KeyRound size={13} />
      </button>
      <button
        onClick={onDelete}
        title="Ukloni stanara"
        className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center"
      >
        <Trash2 size={13} />
      </button>

      {editOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={() => setEditOpen(false)}>
          <div className="bg-cream rounded-lg p-6 w-[420px] max-w-full shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[18px] font-semibold text-navy-950">Uredi stanara</h3>
              <button onClick={() => setEditOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <form action={submitEdit}>
              {buildings && (
                <div className="mb-3">
                  <label className="field-label">Zgrada</label>
                  <select name="building_id" defaultValue={resident.building_id ?? ''} className="field-input">
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="field-label">Ime i prezime</label>
                <input name="name" defaultValue={resident.name} required className="field-input" />
              </div>
              <div className="mb-3">
                <label className="field-label">Stan</label>
                <input name="unit" defaultValue={resident.unit ?? ''} required className="field-input" />
              </div>
              <div className="mb-3">
                <label className="field-label">Stanje (RSD)</label>
                <input name="balance" type="number" step="0.01" defaultValue={resident.balance} className="field-input" />
              </div>
              <div className="mb-4">
                <label className="field-label">Status plaćanja</label>
                <select name="payment_status" defaultValue={resident.payment_status} className="field-input">
                  <option value="Na čekanju">Na čekanju</option>
                  <option value="Plaćeno">Plaćeno</option>
                </select>
              </div>
              {editError && <p className="text-brick text-xs mb-3">{editError}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setEditOpen(false)} className="btn btn-outline flex-1">Otkaži</button>
                <button type="submit" disabled={isPending} className="btn btn-navy flex-1 disabled:opacity-60">
                  <Check size={15} />
                  {isPending ? 'Čuva se…' : 'Sačuvaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pwOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={() => setPwOpen(false)}>
          <div className="bg-cream rounded-lg p-6 w-[380px] max-w-full shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[18px] font-semibold text-navy-950">Promeni lozinku</h3>
              <button onClick={() => setPwOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <p className="text-[12px] text-ink-soft mb-3.5">
              Ako stanar ima nalog za prijavu, ovo menja njegovu lozinku (nalog se ne briše). Ako nema nalog, ova opcija neće raditi — prvo ga dodajte preko &quot;Dodaj stanara&quot; sa email/lozinkom.
            </p>
            <div className="mb-3">
              <label className="field-label">Nova lozinka</label>
              <input value={pw} onChange={(e) => setPw(e.target.value)} type="text" className="field-input" placeholder="unesite novu lozinku" />
            </div>
            {error && <p className="text-brick text-xs mb-3">{error}</p>}
            <div className="flex gap-2.5">
              <button onClick={() => setPwOpen(false)} className="btn btn-outline flex-1">Otkaži</button>
              <button onClick={submitPassword} disabled={isPending} className="btn btn-navy flex-1 disabled:opacity-60">
                <Check size={15} />
                {isPending ? 'Čuva se…' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
