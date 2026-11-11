import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { Profile, Ticket, TicketComment } from '@/lib/types';
import { NewTicketButton } from '@/components/admin/TicketControls';
import { ProblemManager } from '@/components/admin/ProblemManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminTicketsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const openTicketId = Number(one(sp.ticket)) || null;
  const initial = { status: one(sp.status) || 'all', priority: one(sp.priority) || 'all', filter: one(sp.filter) };
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const [{ data: tickets }, { data: people }, { data: comments }] = await Promise.all([
    supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at', { ascending: false }).returns<Ticket[]>(),
    supabase.from('profiles').select('*').eq('building_id', me.building_id).order('name').returns<Profile[]>(),
    supabase.from('ticket_comments').select('*').returns<TicketComment[]>(),
  ]);
  const units = (people ?? []).filter((p) => p.role === 'resident').map((p) => p.unit).filter((u): u is string => !!u);
  return <div><div className="flex flex-wrap gap-3 justify-between items-center mb-5"><div><h2 className="font-display text-2xl font-semibold text-navy-950">Problemi</h2><p className="text-ink-soft text-sm mt-1">Upravljanje problemima, rokovima, prioritetima, dodelama i komentarima.</p></div><NewTicketButton units={units} /></div><ProblemManager key={`${openTicketId ?? ''}|${initial.status}|${initial.priority}|${initial.filter}`} tickets={tickets ?? []} residents={people ?? []} comments={comments ?? []} openTicketId={openTicketId} initial={initial} /></div>;
}
