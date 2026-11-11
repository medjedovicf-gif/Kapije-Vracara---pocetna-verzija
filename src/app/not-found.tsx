import Link from 'next/link';
import { GateMark } from '@/components/GateMark';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center py-10 px-6">
        <div className="w-14 h-14 rounded-2xl bg-navy-950 flex items-center justify-center mx-auto mb-4">
          <GateMark className="w-8 h-8" />
        </div>
        <p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mb-1">Greška 404</p>
        <h1 className="font-display text-xl font-semibold text-navy-950 mb-1.5">Stranica ne postoji</h1>
        <p className="text-sm text-ink-soft mb-6">Link je možda zastareo ili je stranica premeštena.</p>
        <Link href="/" className="btn btn-gold">Nazad na početnu</Link>
      </div>
    </div>
  );
}
