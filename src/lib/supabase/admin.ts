import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

// UPOZORENJE: koristi service_role kljuc koji zaobilazi SVA RLS pravila.
// Ovaj fajl se SME uvoziti samo u Server Actions / Route Handlers, NIKAD u
// klijentske ('use client') komponente — inace bi tajni kljuc otisao u browser.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
