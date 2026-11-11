'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { BottomNav, type DashboardRole } from '@/components/BottomNav';

type Props = {
  role: DashboardRole;
  sidebar: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

// Zajednički okvir za sva tri dashboarda.
// Desktop (md+): sidebar stoji levo kao i ranije.
// Telefon: donji meni sa glavnim stranicama; "Meni" otvara ceo sidebar kao drawer.
export function DashboardShell({ role, sidebar, title, subtitle, actions, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Zatvori drawer pri promeni stranice.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Esc zatvara drawer, a pozadina se ne skroluje dok je otvoren.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block shrink-0">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true" aria-label="Meni">
          <button aria-label="Zatvori meni" className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <div
            className="relative h-full w-fit max-w-[85vw] shadow-soft"
            onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}
          >
            {sidebar}
            <button
              aria-label="Zatvori meni"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-8 md:py-5 border-b border-line bg-cream sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="font-display font-semibold text-lg md:text-[22px] text-navy-950 truncate">{title}</h1>
              {subtitle && <div className="text-[11px] md:text-xs text-ink-soft font-mono capitalize truncate">{subtitle}</div>}
            </div>
          </div>
          {actions}
        </header>
        <main className="w-full px-4 py-5 pb-[calc(84px+env(safe-area-inset-bottom))] md:px-8 md:py-7 md:pb-16 max-w-[1180px]">{children}</main>
      </div>

      <BottomNav role={role} menuOpen={open} onMenu={() => setOpen(true)} />
    </div>
  );
}
