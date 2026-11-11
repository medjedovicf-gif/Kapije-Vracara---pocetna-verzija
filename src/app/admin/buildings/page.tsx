import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Building2, AlertTriangle, Wrench } from 'lucide-react';
import type { Building, Profile, Ticket } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient(); const user = await getSessionUser(); if (!user) redirect('/login');
  const me = await getMyProfile(); if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const [{ data: building }, { data: users }, { data: tickets }] = await Promise.all([supabase.from('buildings').select('*').eq('id', me.building_id).single<Building>(), supabase.from('profiles').select('*').eq('building_id', me.building_id).returns<Profile[]>(), supabase.from('tickets').select('*').eq('building_id', me.building_id).returns<Ticket[]>()]);
  const active = (tickets ?? []).filter((t) => t.status !== 'Rešeno'); const critical = active.filter((t) => t.priority === 'Critical'); const overdue = active.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now());
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Zgrada</h2><p className="text-ink-soft text-sm mt-1">Pregled korisnika i problema za {building?.name ?? 'vašu zgradu'}.</p></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5"><Stat icon={Building2} value={building?.name ?? '—'} label="Objekat" /><Stat icon={Wrench} value={String(active.length)} label="Aktivni problemi" /><Stat icon={AlertTriangle} value={`${critical.length} critical · ${overdue.length} overdue`} label={`${users?.length ?? 0} korisnika`} /></div><div className="card"><h2 className="font-display text-lg font-semibold mb-3">Problemi po objektu</h2>{(tickets ?? []).slice(0, 12).map((t) => <div key={t.id} className="flex gap-3 py-2 border-b border-line last:border-0"><span className="font-mono text-xs text-ink-faint">#{t.id}</span><span className="font-semibold text-sm flex-1">{t.title}</span><span className="tag tag-gold">{t.status}</span></div>)}</div></div>;
}
function Stat({ icon: Icon, value, label }: { icon: typeof Building2; value: string; label: string }) { return <div className="card"><Icon size={17} className="text-gold-dark mb-2" /><div className="font-display text-xl font-semibold truncate">{value}</div><div className="text-xs text-ink-soft">{label}</div></div>; }
