'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Prijateljska poruka kad nešto pukne. Detalje šaljemo u konzolu (Vercel logovi).
export function ErrorState({ error, reset, homeHref = '/' }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string }) {
  useEffect(() => {
    console.error('[app-error]', error?.digest ?? '', error);
  }, [error]);

  return (
    <div className="card max-w-md mx-auto text-center py-10 px-6 mt-6">
      <div className="w-12 h-12 rounded-2xl bg-brick-soft flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={22} className="text-brick" />
      </div>
      <h2 className="font-display text-xl font-semibold text-navy-950 mb-1.5">Nešto nije u redu</h2>
      <p className="text-sm text-ink-soft mb-6">
        Stranica trenutno ne može da se učita. Pokušaj ponovo, a ako se problem ponavlja, javi administratoru.
      </p>
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
        <button onClick={reset} className="btn btn-gold"><RotateCcw size={15} />Pokušaj ponovo</button>
        <Link href={homeHref} className="btn btn-outline">Nazad na početnu</Link>
      </div>
      {error?.digest && <p className="text-[10.5px] text-ink-faint font-mono mt-5">Kod greške: {error.digest}</p>}
    </div>
  );
}
