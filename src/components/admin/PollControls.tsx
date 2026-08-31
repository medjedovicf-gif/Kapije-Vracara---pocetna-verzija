'use client';

import { useState, useTransition } from 'react';
import { Plus, X, Check, Lock, Trash2 } from 'lucide-react';
import { createPoll, closePoll, deletePoll } from '@/app/actions/admin-polls';

export function NewPollButton({ buildingId, buildings }: { buildingId?: string; buildings?: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setOptions(['', '']);
    setError('');
    setOpen(true);
  }

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await createPoll(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button className="btn btn-navy" style={{ padding: '9px 16px', fontSize: 12.5 }} onClick={openModal}>
        <Plus size={15} />
        Zakaži anketu
      </button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-lg p-6 w-[420px] max-w-full max-h-[88vh] overflow-y-auto shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Zakaži anketu</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <form action={handleSubmit}>
              {buildings && (
                <div className="mb-3">
                  <label className="field-label">Zgrada</label>
                  <select name="building_id" className="field-input" defaultValue={buildingId}>
                    <option value="">Cela platforma</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="field-label">Naslov</label>
                <input name="title" type="text" required className="field-input" placeholder="npr. Nova klupa u dvorištu" />
              </div>
              <div className="mb-3">
                <label className="field-label">Opis</label>
                <textarea name="description" rows={2} className="field-input" placeholder="Kratak opis o čemu se glasa" />
              </div>
              <label className="field-label">Opcije za glasanje</label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    name="options"
                    value={opt}
                    onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                    type="text"
                    className="field-input flex-1"
                    placeholder={`Opcija ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))} className="w-[38px] rounded-[10px] border border-line bg-white">
                      <X size={14} className="mx-auto" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setOptions((prev) => [...prev, ''])} className="btn btn-outline mb-4" style={{ padding: '8px 14px', fontSize: 12 }}>
                <Plus size={14} />
                Dodaj opciju
              </button>
              {error && <p className="text-brick text-xs mb-3">{error}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-outline flex-1">Otkaži</button>
                <button type="submit" disabled={isPending} className="btn btn-navy flex-1 disabled:opacity-60">
                  <Check size={15} />
                  {isPending ? 'Objavljuje se…' : 'Objavi anketu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function PollCardActions({ pollId, status }: { pollId: number; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {status === 'active' && (
        <button
          onClick={() => startTransition(async () => { await closePoll(pollId); window.location.reload(); })}
          disabled={isPending}
          title="Zatvori anketu"
          className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center"
        >
          <Lock size={13} />
        </button>
      )}
      <button
        onClick={() => { if (confirm('Obrisati ovu anketu?')) startTransition(async () => { await deletePoll(pollId); window.location.reload(); }); }}
        disabled={isPending}
        title="Obriši anketu"
        className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
