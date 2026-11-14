import { Database } from 'lucide-react';

/** Prikazuje se dok supabase/admin-finance-migration.sql nije pokrenut nad bazom. */
export function MissingMigration({ what }: { what: string }) {
  return (
    <div className="card max-w-xl">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-cream-2 flex items-center justify-center shrink-0"><Database size={16} className="text-gold-dark" /></div>
        <div>
          <h2 className="font-display text-lg font-semibold">{what} još nisu aktivirani</h2>
          <p className="text-[13px] text-ink-soft mt-1">
            Baza još nema tabele za ovaj modul. Pokrenite <code className="font-mono text-[12px] bg-cream-2 px-1.5 py-0.5 rounded">supabase/admin-finance-migration.sql</code> u Supabase SQL Editoru, pa osvežite stranicu.
          </p>
        </div>
      </div>
    </div>
  );
}
