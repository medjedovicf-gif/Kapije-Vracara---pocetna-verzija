'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deleteDocument, prepareDocumentUpload, saveDocument, toggleDocumentVisibility } from '@/app/actions/documents';
import { DOCUMENT_CATEGORIES, type BuildingDocument } from '@/lib/types';

export function UploadDocumentButton({ buildings }: { buildings?: { id: string; name: string }[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  async function submit(formData: FormData) {
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Izaberite fajl.'); return; }
    setBusy(true);
    try {
      const prep = await prepareDocumentUpload({
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        buildingId: String(formData.get('building_id') || '') || undefined,
      });
      if ('error' in prep) { setError(prep.error ?? 'Greška.'); return; }
      // Fajl ide direktno u storage (bez prolaska kroz server akciju).
      const { error: upErr } = await supabase.storage.from('building-documents').uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type || 'application/octet-stream' });
      if (upErr) { setError('Upload nije uspeo. Proverite vezu i pokušajte ponovo.'); return; }
      const saved = await saveDocument({
        path: prep.path,
        buildingId: prep.buildingId,
        title: String(formData.get('title') || '') || file.name.replace(/\.[^.]+$/, ''),
        category: String(formData.get('category') || 'Ostalo'),
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        visibleToResidents: formData.get('visible') === 'on',
      });
      if ('error' in saved) { setError(saved.error ?? 'Greška.'); return; }
      setOpen(false);
      setFileName('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-navy w-full sm:w-auto" onClick={() => { setError(''); setOpen(true); }}>
        <Upload size={15} />Dodaj dokument
      </button>
      {open && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5" onClick={() => !busy && setOpen(false)}>
          <div className="bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:w-[440px] max-w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-[19px] font-semibold text-navy-950">Dodaj dokument</h3>
              <button onClick={() => setOpen(false)} disabled={busy} aria-label="Zatvori" className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center"><X size={15} /></button>
            </div>
            <form action={submit}>
              {buildings && (
                <div className="mb-3">
                  <label className="field-label">Zgrada</label>
                  <select name="building_id" className="field-input">{buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                </div>
              )}
              <div className="mb-3">
                <span className="field-label">Fajl (PDF, slika, Word, Excel · do 25 MB)</span>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-navy-950/25 bg-white py-3 text-sm font-semibold text-navy-950 active:scale-[0.99]">
                  <Upload size={15} />{fileName || 'Izaberi fajl'}
                </button>
              </div>
              <div className="mb-3">
                <label className="field-label">Naziv</label>
                <input name="title" className="field-input" placeholder="npr. Zapisnik sa skupštine, oktobar 2026" />
              </div>
              <div className="mb-3">
                <label className="field-label">Kategorija</label>
                <select name="category" className="field-input" defaultValue="Zapisnik">{DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <label className="flex items-center gap-2.5 mb-4 text-sm cursor-pointer">
                <input type="checkbox" name="visible" defaultChecked className="w-4 h-4 accent-[#10152A]" />
                Vidljivo stanarima
              </label>
              {error && <p className="text-brick text-xs mb-3">{error}</p>}
              <button disabled={busy} className="btn btn-navy w-full disabled:opacity-60">{busy ? 'Otpremam…' : 'Sačuvaj dokument'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DocumentRowActions({ doc }: { doc: BuildingDocument }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center">
      <button
        title={doc.visible_to_residents ? 'Sakrij od stanara' : 'Prikaži stanarima'}
        aria-label={doc.visible_to_residents ? 'Sakrij od stanara' : 'Prikaži stanarima'}
        disabled={pending}
        onClick={() => start(async () => { await toggleDocumentVisibility(doc.id, !doc.visible_to_residents); router.refresh(); })}
        className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:text-navy-950 hover:bg-cream-2 disabled:opacity-40"
      >
        {doc.visible_to_residents ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button
        title="Obriši"
        aria-label={`Obriši ${doc.title}`}
        disabled={pending}
        onClick={() => {
          if (!confirm(`Obrisati dokument „${doc.title}“? Ovo se ne može poništiti.`)) return;
          start(async () => { await deleteDocument(doc.id); router.refresh(); });
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-ink-faint hover:text-brick hover:bg-brick-soft disabled:opacity-40"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
