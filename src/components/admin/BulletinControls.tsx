'use client';

import { useState, useTransition } from 'react';
import { Plus, X, Check, Trash2 } from 'lucide-react';
import { createBulletinPost, deleteBulletinPost } from '@/app/actions/bulletin';

export function NewBulletinButton({ buildingId, buildings }: { buildingId?: string; buildings?: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await createBulletinPost(formData);
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
        <Plus size={15} />
        Objavi obaveštenje
      </button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={() => setOpen(false)}>
          <div className="bg-cream rounded-lg p-6 w-[420px] max-w-full shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Novo obaveštenje</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <form action={handleSubmit}>
              {buildings && (
                <div className="mb-3">
                  <label className="field-label">Domet</label>
                  <select name="building_id" className="field-input" defaultValue={buildingId}>
                    <option value="">Cela platforma (sve zgrade)</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="field-label">Naslov</label>
                <input name="title" type="text" required className="field-input" placeholder="npr. Zakazani radovi na liftu" />
              </div>
              <div className="mb-4">
                <label className="field-label">Tekst obaveštenja</label>
                <textarea name="body" rows={4} required className="field-input" placeholder="Detalji obaveštenja..." />
              </div>
              {error && <p className="text-brick text-xs mb-3">{error}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-outline flex-1">Otkaži</button>
                <button type="submit" disabled={isPending} className="btn btn-navy flex-1 disabled:opacity-60">
                  <Check size={15} />
                  {isPending ? 'Objavljuje se…' : 'Objavi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteBulletinButton({ postId }: { postId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => { if (confirm('Obrisati ovo obaveštenje?')) startTransition(async () => { await deleteBulletinPost(postId); window.location.reload(); }); }}
      disabled={isPending}
      title="Obriši"
      className="w-[30px] h-[30px] rounded-full border border-line bg-white flex items-center justify-center"
    >
      <Trash2 size={13} />
    </button>
  );
}
