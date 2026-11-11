'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-[380px] bg-white rounded-lg shadow-soft p-9 text-center">
        <GateMark />
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-gold-dark mb-2">
          Kapije Vračara
        </p>
        <h1 className="font-display text-[22px] font-semibold text-navy-950 mb-1.5">
          Prijava
        </h1>
        <p className="text-[12.5px] text-ink-soft mb-6">
          Unesite email i lozinku da nastavite.
        </p>

        <form action={handleSubmit} className="text-left">
          <div className="mb-3">
            <label className="field-label">Email</label>
            <input name="email" type="email" required className="field-input" placeholder="ime@primer.rs" />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <label className="field-label">Lozinka</label>
              <Link href="/forgot-password" className="text-[11.5px] font-semibold text-gold-dark hover:underline mb-1.5">Zaboravili ste lozinku?</Link>
            </div>
            <input name="password" type="password" required autoComplete="current-password" className="field-input" placeholder="••••••" />
          </div>
          {error && <p className="text-brick text-xs mb-3">{error}</p>}
          <button type="submit" disabled={isPending} className="btn btn-gold w-full disabled:opacity-60">
            {isPending ? 'Prijavljivanje…' : 'Prijavi se'}
          </button>
        </form>

        <p className="text-[11px] text-ink-faint mt-5 leading-relaxed">
          Nemate pristup? Obratite se administratoru zgrade.
        </p>
      </div>
    </div>
  );
}

function GateMark() {
  return (
    <svg viewBox="0 0 64 64" className="w-11 h-11 mx-auto mb-3.5">
      <path
        d="M12 54 L12 26 Q12 12 32 12 Q52 12 52 26 L52 54"
        fill="none"
        stroke="#10152A"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d="M12 54 L52 54" fill="none" stroke="#10152A" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="27" y="34" width="10" height="20" rx="2" fill="#E4B23C" />
    </svg>
  );
}
