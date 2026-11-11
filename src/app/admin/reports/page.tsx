import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import type { Profile, Ticket } from '@/lib/types';
import { priorityLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient(); const user = await getSessionUser(); if (!user) redirect('/login');
  const me = await getMyProfile(); if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const { data: tickets } = await supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at').returns<Ticket[]>(); const all = tickets ?? [];
  const resolved = all.filter((t) => t.status === 'Rešeno'); const avgHours = resolved.length ? Math.round(resolved.reduce((sum, t) => sum + (new Date(t.updated_at || t.created_at).getTime() - new Date(t.created_at).getTime()) / 36e5, 0) / resolved.length) : 0;
  const groups = (values: string[]) => values.map((label) => ({ label, value: all.filter((t) => t.category === label).length }));
  const categories = [...new Set(all.map((t) => t.category))].filter(Boolean); const max = Math.max(1, ...categories.map((c) => all.filter((t) => t.category === c).length));
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Izveštaji i analitika</h2><p className="text-ink-soft text-sm mt-1">Operativna statistika za vašu zgradu.</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"><Metric value={String(all.length)} label="Ukupno problema" /><Metric value={String(resolved.length)} label="Rešeno" /><Metric value={`${avgHours}h`} label="Prosečno vreme rešavanja" /><Metric value={String(all.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() && t.status !== 'Rešeno').length)} label="Overdue" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-5"><div className="card"><h2 className="font-display text-lg font-semibold mb-4">Po kategoriji</h2>{groups(categories).map((x) => <div key={x.label} className="mb-3"><div className="flex justify-between text-xs mb-1"><span>{x.label}</span><span className="font-mono">{x.value}</span></div><div className="h-2 bg-cream-2 rounded-full"><div className="h-full bg-sage rounded-full" style={{ width: `${x.value / max * 100}%` }} /></div></div>)}{!categories.length && <p className="text-sm text-ink-soft">Nema podataka.</p>}</div><div className="card"><h2 className="font-display text-lg font-semibold mb-4">Po prioritetu</h2>{['Critical', 'High', 'Medium', 'Low'].map((p) => <div key={p} className="flex justify-between py-3 border-b border-line text-sm"><span>{priorityLabel(p)}</span><span className="font-mono">{all.filter((t) => t.priority === p).length}</span></div>)}<div className="flex items-center gap-2 text-xs text-ink-soft mt-5"><BarChart3 size={15} />Podaci se računaju iz problema u realnom vremenu.</div></div></div></div>;
}
function Metric({ value, label }: { value: string; label: string }) { return <div className="card"><div className="font-display text-2xl font-semibold">{value}</div><div className="text-xs text-ink-soft">{label}</div></div>; }
