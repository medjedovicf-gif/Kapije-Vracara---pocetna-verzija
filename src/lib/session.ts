import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

// Jedan poziv po zahtevu: layout i stranica dele isti rezultat umesto da
// svaki posebno ide do Supabase-a (svaki odlazak je mrežni round-trip).

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  return data ?? null;
});
