'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, X } from 'lucide-react';
import { adminCancelBooking, createSpace, decideBooking, setSpaceActive } from '@/app/actions/reservations';

export function BookingDecision({ id, mode }: { id: number; mode: 'decide' | 'cancel' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>) =>
    start(async () => {
      const r = await fn();
      if ('error' in r && r.error) setError(r.error);
      else router.refresh();
    });

  if (mode === 'cancel') {
    return (
      <button
        disabled={pending}
        onClick={() => { if (confirm('Otkazati ovu rezervaciju? Stanar će dobiti obaveštenje.')) run(() => adminCancelBooking(id)); }}
        className="btn btn-outline !px-3 !py-1.5 !text-[11px] disabled:opacity-50"
      >
        Otkaži
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button disabled={pending} onClick={() => run(() => decideBooking(id, 'Odbijeno'))} className="btn btn-outline !px-3 !py-1.5 !text-[11px] disabled:opacity-50"><X size={13} />Odbij</button>
      <button disabled={pending} onClick={() => run(() => decideBooking(id, 'Potvrđeno'))} className="btn btn-gold !px-3 !py-1.5 !text-[11px] disabled:opacity-50"><Check size={13} />Potvrdi</button>
      {error && <span className="text-brick text-[11px] basis-full">{error}</span>}
    </div>
  );
}

export function SpaceToggle({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Isključi prostor' : 'Uključi prostor'}
      disabled={pending}
      onClick={() => start(async () => { await setSpaceActive(id, !active); router.refresh(); })}
      className={`relative w-10 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-sage' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${active ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

export function NewSpaceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError('');
    start(async () => {
      const r = await createSpace(formData);
      if ('error' in r && r.error) setError(r.error);
      else { setOpen(false); router.refresh(); }
    });
  }

  return (
    <>
      <button className="btn btn-navy w-full sm:w-auto" onClick={() => setOpen(true)}><Plus size={15} />Dodaj prostor</button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[420px] max-w-full max-h-[92dvh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Novi prostor</h3>
              <button onClick={() => setOpen(false)} aria-label="Zatvori" className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center"><X size={15} /></button>
            </div>
            <form action={submit}>
              <label className="block mb-3"><span className="field-label">Naziv</span><input name="name" required className="field-input" placeholder="npr. Zajednička prostorija" /></label>
              <label className="block mb-3"><span className="field-label">Opis (opciono)</span><textarea name="description" rows={2} className="field-input" placeholder="Kapacitet, pravila korišćenja…" /></label>
              <label className="block mb-3"><span className="field-label">Najduže trajanje (sati)</span><input name="max_hours" type="number" min={1} max={24} defaultValue={4} className="field-input" /></label>
              <label className="flex items-center gap-2.5 mb-4 text-sm cursor-pointer">
                <input type="checkbox" name="requires_approval" defaultChecked className="w-4 h-4 accent-[#10152A]" />
                Rezervacija traži odobrenje uprave
              </label>
              {error && <p className="text-brick text-xs mb-3">{error}</p>}
              <button disabled={pending} className="btn btn-navy w-full disabled:opacity-60">{pending ? 'Čuvam…' : 'Sačuvaj prostor'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
