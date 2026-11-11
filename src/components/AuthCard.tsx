import type { ReactNode } from 'react';

// Zajednički okvir za login, zaboravljenu lozinku i novu lozinku.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-cream px-4 sm:px-6 py-8">
      <div className="w-full max-w-[380px] bg-white rounded-lg shadow-soft p-7 sm:p-9 text-center">
        <svg viewBox="0 0 64 64" className="w-11 h-11 mx-auto mb-3.5" aria-hidden="true">
          <path d="M12 54 L12 26 Q12 12 32 12 Q52 12 52 26 L52 54" fill="none" stroke="#10152A" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M12 54 L52 54" fill="none" stroke="#10152A" strokeWidth="3.4" strokeLinecap="round" />
          <rect x="27" y="34" width="10" height="20" rx="2" fill="#E4B23C" />
        </svg>
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-gold-dark mb-2">Kapije Vračara</p>
        <h1 className="font-display text-[22px] font-semibold text-navy-950 mb-1.5">{title}</h1>
        {subtitle && <p className="text-[12.5px] text-ink-soft mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
