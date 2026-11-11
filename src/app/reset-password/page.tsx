'use client';

import { useState, useTransition } from 'react';
import { updatePassword } from '@/app/actions/auth';
import { AuthCard } from '@/components/AuthCard';

export default function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <AuthCard title="Nova lozinka" subtitle="Izaberite novu lozinku za svoj nalog.">
      <form action={handleSubmit} className="text-left">
        <div className="mb-3">
          <label className="field-label" htmlFor="password">Nova lozinka</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field-input" placeholder="Najmanje 8 karaktera" />
        </div>
        <div className="mb-3">
          <label className="field-label" htmlFor="confirm">Ponovite lozinku</label>
          <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field-input" />
        </div>
        {error && <p className="text-brick text-xs mb-3">{error}</p>}
        <button type="submit" disabled={isPending} className="btn btn-gold w-full disabled:opacity-60">
          {isPending ? 'Čuvam…' : 'Sačuvaj lozinku'}
        </button>
      </form>
    </AuthCard>
  );
}
