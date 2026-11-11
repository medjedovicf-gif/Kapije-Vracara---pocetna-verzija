import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';
import { UserDirectory } from '@/components/admin/UserDirectory';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient(); const user = await getSessionUser(); if (!user) redirect('/login');
  const me = await getMyProfile(); if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const { data: users } = await supabase.from('profiles').select('*').eq('building_id', me.building_id).order('name').returns<Profile[]>();
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Korisnici</h2><p className="text-ink-soft text-sm mt-1">Korisnici vaše zgrade i njihovi osnovni podaci.</p></div><UserDirectory users={users ?? []} /></div>;
}
