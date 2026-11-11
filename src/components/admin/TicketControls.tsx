'use client';


import { useRouter } from 'next/navigation';import { useState, useTransition } from 'react';
import { Eye, X, Plus, Check } from 'lucide-react';
import { updateTicketStatus, createTicketByStaff } from '@/app/actions/admin-tickets';
import type { Ticket } from '@/lib/types';

const STATUSES = ['Novo', 'Zakazano', 'U toku', 'Rešeno'];
const CATEGORIES = ['Održavanje', 'Vodoinstalacije', 'Elektrika', 'Klima', 'Čišćenje', 'Ostalo'];

export function TicketStatusSelect({ ticketId, status }: { ticketId: number; status: string }) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(() => { void updateTicketStatus(ticketId, next); });
  }

  return (
    <select value={current} onChange={onChange} disabled={isPending} className="font-sans text-xs font-semibold border border-line rounded-full px-3 py-1.5 bg-cream">
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export function TicketDetailsButton({ ticket, photoUrls }: { ticket: Ticket; photoUrls: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} title="Detalji" className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center">
        <Eye size={13} />
      </button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[420px] max-w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-[18px] font-semibold text-navy-950">{ticket.title}</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center shrink-0">
                <X size={15} />
              </button>
            </div>
            <div className="text-xs text-ink-soft mb-3">
              Stan {ticket.unit} · {ticket.category} · #{ticket.id}
            </div>
            <p className="text-[13px] text-ink mb-4">{ticket.description || 'Bez dodatnog opisa.'}</p>
            {photoUrls.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {photoUrls.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-xl overflow-hidden border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-faint">Nema priloženih fotografija.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function NewTicketButton({ units, buildingId, buildings }: { units: string[]; buildingId?: string; buildings?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await createTicketByStaff(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button className="btn btn-navy" style={{ padding: '9px 16px', fontSize: 12.5 }} onClick={() => setOpen(true)}>
        <Plus size={15} />
        Dodaj zahtev
      </button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[400px] max-w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Novi zahtev</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <form action={handleSubmit}>
              {buildings && (
                <div className="mb-3">
                  <label className="field-label">Zgrada</label>
                  <select name="building_id" className="field-input" defaultValue={buildingId}>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="field-label">Stan</label>
                <input name="unit" list="units-list" type="text" required className="field-input" placeholder="npr. 12B" />
                <datalist id="units-list">
                  {units.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
              <div className="mb-3">
                <label className="field-label">Naslov zahteva</label>
                <input name="title" type="text" required className="field-input" placeholder="npr. Ne radi bojler" />
              </div>
              <div className="mb-4">
                <label className="field-label">Kategorija</label>
                <select name="category" className="field-input">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
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
