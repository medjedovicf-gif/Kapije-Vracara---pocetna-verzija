import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Link iz emaila (promena lozinke, pozivnica) dolazi ovde. Podržava oba formata:
// ?code=... (PKCE, podrazumevani Supabase šablon) i ?token_hash=...&type=... (prilagođeni šablon).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const nextParam = url.searchParams.get('next') ?? '/';
  // Samo putanje unutar aplikacije, da link ne može da preusmeri na tuđi sajt.
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error('[auth/callback] code exchange failed', error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error('[auth/callback] otp verify failed', error.message);
  }

  const target = url.clone();
  target.search = '';
  if (ok) {
    target.pathname = next;
  } else {
    target.pathname = '/forgot-password';
    target.searchParams.set('error', 'link');
  }
  return NextResponse.redirect(target);
}
