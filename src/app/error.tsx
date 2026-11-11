'use client';

import { ErrorState } from '@/components/ErrorState';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <ErrorState error={error} reset={reset} homeHref="/" />
    </div>
  );
}
