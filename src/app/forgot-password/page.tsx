'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';
import { AuthCard } from '@/components/AuthCard';

function ForgotPasswordForm() {
  const params = useSearchParams();
  const linkError = params.get('error') === 'link';
  const [error, setError] = useState(linkError ? 'Link je istekao ili je već iskorišćen. Zatražite novi.' : '');
  const [sentTo, setSentTo] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    const email = String(formData.get('email') || '').trim();
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result?.error) setError(result.error);
      else setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <AuthCard title="Proverite email">
        <div className="w-12 h-12 rounded-2xl bg-sage-soft flex items-center justify-center mx-auto mb-4">
          <MailCheck size={22} className="text-sage-dark" />
        </div>
        <p className="text-[13px] text-ink-soft mb-2">
          Ako nalog sa adresom <strong className="text-navy-950">{sentTo}</strong> postoji, poslali smo link za novu lozinku.
        </p>
        <p className="text-[12px] text-ink-faint mb-6">Link otvorite na ovom uređaju. Ako ne stigne za par minuta, proverite spam.</p>
        <Link href="/login" className="btn btn-outline w-full">Nazad na prijavu</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Zaboravljena lozinka" subtitle="Unesite email naloga i poslaćemo vam link za novu lozinku.">
      <form action={handleSubmit} className="text-left">
        <div className="mb-3">
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field-input" placeholder="ime@primer.rs" />
        </div>
        {error && <p className="text-brick text-xs mb-3">{error}</p>}
        <button type="submit" disabled={isPending} className="btn btn-gold w-full disabled:opacity-60">
          {isPending ? 'Šaljem…' : 'Pošalji link'}
        </button>
      </form>
      <Link href="/login" className="inline-block text-[12px] text-ink-soft hover:text-navy-950 mt-5">← Nazad na prijavu</Link>
    </AuthCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
