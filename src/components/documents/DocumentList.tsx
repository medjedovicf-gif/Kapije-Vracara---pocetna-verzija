import { Download, Eye, EyeOff, FileImage, FileSpreadsheet, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { DOCUMENT_CATEGORIES, type BuildingDocument } from '@/lib/types';

export function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocIcon({ mime }: { mime: string | null }) {
  const cls = 'text-navy-950';
  if (mime?.startsWith('image/')) return <FileImage size={16} className={cls} />;
  if (mime?.includes('sheet') || mime?.includes('excel') || mime === 'text/csv') return <FileSpreadsheet size={16} className={cls} />;
  return <FileText size={16} className={cls} />;
}

// Lista dokumenata grupisana po kategoriji. `actions` dodaje admin dugmad po redu.
export function DocumentList({
  documents,
  showVisibility = false,
  actions,
}: {
  documents: BuildingDocument[];
  showVisibility?: boolean;
  actions?: (doc: BuildingDocument) => ReactNode;
}) {
  const groups = DOCUMENT_CATEGORIES.map((category) => ({ category, docs: documents.filter((d) => d.category === category) })).filter((g) => g.docs.length);

  if (!documents.length) {
    return (
      <div className="card text-center py-10">
        <FileText size={22} className="mx-auto text-ink-faint mb-2" />
        <p className="text-sm text-ink-soft">Još nema dokumenata.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.category} className="card !p-0 overflow-hidden">
          <h2 className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-wide text-ink-faint border-b border-line bg-cream/60">
            {g.category} · {g.docs.length}
          </h2>
          {g.docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-line last:border-0">
              <a href={`/api/documents/${doc.id}?view=1`} target="_blank" rel="noopener" className="row-link flex flex-1 min-w-0 items-center gap-3 -my-3 py-3 -ml-2 pl-2 rounded-lg">
                <div className="w-9 h-9 shrink-0 rounded-[10px] bg-cream-2 flex items-center justify-center"><DocIcon mime={doc.mime_type} /></div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-navy-950 truncate">{doc.title}</div>
                  <div className="text-[11px] text-ink-soft truncate">
                    {new Date(doc.created_at).toLocaleDateString('sr-Latn-RS')}
                    {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ''}
                    {showVisibility && (doc.visible_to_residents
                      ? <span className="inline-flex items-center gap-1 ml-1.5 text-sage-dark"><Eye size={11} />stanari vide</span>
                      : <span className="inline-flex items-center gap-1 ml-1.5 text-gold-dark"><EyeOff size={11} />samo uprava</span>)}
                  </div>
                </div>
              </a>
              <a href={`/api/documents/${doc.id}`} aria-label={`Preuzmi ${doc.title}`} title="Preuzmi" className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-ink-soft hover:text-navy-950 hover:bg-cream-2">
                <Download size={16} />
              </a>
              {actions?.(doc)}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
