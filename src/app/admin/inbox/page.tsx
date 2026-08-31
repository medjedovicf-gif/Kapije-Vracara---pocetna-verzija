import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AppNotification, Profile, Ticket } from '@/lib/types';
import { AdminInbox } from '@/components/admin/AdminInbox';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(); if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const [{ data: notifications }, { data: tickets }] = await Promise.all([supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100).returns<AppNotification[]>(), supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at', { ascending: false }).returns<Ticket[]>()]);
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Admin Inbox</h2><p className="text-ink-soft text-sm mt-1">Centralno mesto za događaje koji zahtevaju pažnju.</p></div><AdminInbox notifications={notifications ?? []} tickets={tickets ?? []} /></div>;
}
