import { headers } from 'next/headers';

// Adresa sajta za linkove u emailovima (promena lozinke, pozivnice).
// NEXT_PUBLIC_SITE_URL ima prednost; inače se čita iz zahteva.
export async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// Link iz emaila sme da vodi samo na stranicu unutar aplikacije.
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
}
