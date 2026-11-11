'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Profile } from '@/lib/types';

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Unesite email i lozinku.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: 'Pogrešan email ili lozinka.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single<Pick<Profile, 'role'>>();

  const home =
    profile?.role === 'admin' ? '/admin' : profile?.role === 'superadmin' ? '/super-admin' : '/';

  redirect(home);
}

async function siteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// Šalje email sa linkom za novu lozinku. Uvek vraća isti odgovor, da se ne
// otkriva da li nalog sa tim emailom postoji.
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return { error: 'Unesite ispravnu email adresu.' };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) {
    console.error('[auth] reset email failed', error.message);
    if (error.status === 429) return { error: 'Previše pokušaja. Sačekajte nekoliko minuta pa pokušajte ponovo.' };
  }
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  if (password.length < 8) return { error: 'Lozinka mora imati najmanje 8 karaktera.' };
  if (password !== confirm) return { error: 'Lozinke se ne poklapaju.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Link je istekao. Zatražite novi link za promenu lozinke.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes('different') ? 'Nova lozinka mora biti drugačija od stare.' : 'Lozinka nije promenjena. Pokušajte ponovo.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single<Pick<Profile, 'role'>>();
  redirect(profile?.role === 'admin' ? '/admin' : profile?.role === 'superadmin' ? '/super-admin' : '/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
