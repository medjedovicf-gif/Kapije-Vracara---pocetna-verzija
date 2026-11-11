'use client';

import { useState, useRef, useTransition } from 'react';
import { Camera, X, Check, Siren } from 'lucide-react';
import { createTicket } from '@/app/actions/tickets';

const CATEGORIES = ['Održavanje', 'Vodoinstalacije', 'Elektrika', 'Klima', 'Čišćenje', 'Ostalo'];

export function ReportIssueButton({ presetCategory }: { presetCategory?: string }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function openModal() {
    setPhotos([]);
    setPreviews([]);
    setError('');
    setOpen(true);
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const room = 5 - photos.length;
    const accepted = files.slice(0, room);
    setPhotos((prev) => [...prev, ...accepted]);
    accepted.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((prev) => [...prev, url]);
    });
    if (fileInput.current) fileInput.current.value = '';
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(formData: FormData) {
    setError('');
    photos.forEach((f) => formData.append('photos', f));
    startTransition(async () => {
      const result = await createTicket(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button className="btn btn-gold w-full sm:w-auto" onClick={openModal}>
        <Camera size={15} />
        Prijavi kvar
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[420px] max-w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Prijavi kvar</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form action={handleSubmit}>
              <div className="mb-3">
                <label className="field-label">Kategorija</label>
                <select name="category" defaultValue={presetCategory ?? CATEGORIES[0]} className="field-input">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="field-label">Lokacija problema (opciono)</label>
                <input name="location" className="field-input" placeholder="npr. kupatilo, hodnik, garaža" />
              </div>
              <div className="mb-3">
                <label className="field-label">Prioritet</label>
                <select name="priority" defaultValue="Medium" className="field-input"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select>
              </div>
              <div className="mb-3">
                <label className="field-label">Naslov</label>
                <input name="title" type="text" required className="field-input" placeholder="npr. Ne radi bojler" />
              </div>
              <div className="mb-3">
                <label className="field-label">Opis (opciono)</label>
                <textarea name="description" rows={3} className="field-input" placeholder="Opišite kvar detaljnije..." />
              </div>
              <div className="mb-4">
                <span className="field-label">Fotografije (do 5, 8MB po fajlu)</span>
                <input ref={fileInput} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={photos.length >= 5}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-navy-950/25 bg-white py-3 text-sm font-semibold text-navy-950 active:scale-[0.99] disabled:opacity-50"
                >
                  <Camera size={16} />
                  {photos.length ? `Dodaj još (${photos.length}/5)` : 'Dodaj fotografije'}
                </button>
                {previews.length > 0 && (
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    {previews.map((src, i) => (
                      <div key={src} className="relative w-16 h-16 rounded-[10px] overflow-hidden border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-navy-950/75 text-white flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-start gap-3 mb-4 p-3 rounded-xl border border-brick/30 bg-brick/5 text-xs cursor-pointer">
                <input name="emergency" type="checkbox" className="mt-0.5 w-4 h-4 shrink-0 accent-[#B96A4A]" />
                <span className="min-w-0">
                  <span className="font-bold text-brick flex items-center gap-1 mb-0.5"><Siren size={13} /> Prijavi hitan problem</span>
                  <span className="block text-ink-soft leading-snug">Koristi samo za ozbiljno curenje vode, lift, struju, požar ili bezbednosni problem.</span>
                </span>
              </label>

              {error && <p className="text-brick text-xs mb-3">{error}</p>}

              <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:-mb-6 px-5 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 bg-cream border-t border-line flex gap-2.5">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-outline flex-1">
                  Otkaži
                </button>
                <button type="submit" disabled={isPending} className="btn btn-gold flex-1 disabled:opacity-60">
                  <Check size={15} />
                  {isPending ? 'Šalje se…' : 'Pošalji prijavu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
