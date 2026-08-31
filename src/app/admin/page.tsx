import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, ListFilter, UserRound, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, Ticket } from '@/lib/types';
import { AdminRealtimeRefresh } from '@/components/admin/AdminRealtimeRefresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const [{ data: residents }, { data: tickets }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'resident').eq('building_id', me.building_id).returns<Profile[]>(),
    supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at', { ascending: false }).returns<Ticket[]>(),
  ]);
  const all = tickets ?? []; const active = all.filter((t) => t.status !== 'Rešeno');
  const now = Date.now(); const today = new Date(); today.setHours(0, 0, 0, 0); const week = new Date(); week.setDate(week.getDate() - 7);
  const overdue = active.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const critical = active.filter((t) => t.priority === 'Critical');
  const newUnassigned = all.filter((t) => t.status === 'Novo' && !t.assigned_to);
  const todayCount = all.filter((t) => new Date(t.created_at) >= today).length;
  const weekCount = all.filter((t) => new Date(t.created_at) >= week).length;
  const stats = [
    ['Aktivni problemi', active.length, Wrench, 'text-navy-950'], ['Novi problemi', all.filter((t) => t.status === 'Novo').length, ListFilter, 'text-gold-dark'], ['U obradi', all.filter((t) => t.status === 'U toku').length, Clock3, 'text-gold-dark'], ['Rešeni', all.filter((t) => t.status === 'Rešeno').length, CheckCircle2, 'text-sage'], ['Istekao rok', overdue.length, AlertTriangle, 'text-brick'], ['Kritični', critical.length, AlertTriangle, 'text-brick'], ['Korisnici', (residents ?? []).length, UserRound, 'text-navy-950'], ['Danas / 7 dana', `${todayCount} / ${weekCount}`, Clock3, 'text-navy-950'],
  ] as const;
  const statusData = ['Novo', 'Zakazano', 'U toku', 'Rešeno'].map((status) => ({ label: status, value: all.filter((t) => t.status === status).length }));
  const priorityData = ['Critical', 'High', 'Medium', 'Low'].map((priority) => ({ label: priority, value: all.filter((t) => t.priority === priority).length }));
  return <div><AdminRealtimeRefresh buildingId={me.building_id} /><div className="mb-6"><p className="text-ink-soft text-sm">Command Center · operativni pregled vaše zgrade.</p></div>
    <div className="grid grid-cols-4 gap-3 mb-7">{stats.map(([label, value, Icon, color]) => <div className="card" key={label}><div className="flex justify-between items-start"><div className="w-8 h-8 rounded-[10px] bg-cream-2 flex items-center justify-center"><Icon size={15} className={color} /></div>{(label === 'Kritični' || label === 'Istekao rok') && Number(value) > 0 && <span className="w-2 h-2 rounded-full bg-brick" />}</div><div className="font-display font-semibold text-[22px] mt-2">{value}</div><div className="text-[11.5px] text-ink-soft">{label}</div></div>)}</div>
    <div className="grid grid-cols-[1.15fr_.85fr] gap-5 mb-6"><div className="card"><div className="flex justify-between items-center mb-4"><h2 className="font-display text-lg font-semibold">Potrebna akcija</h2><Link href="/admin/inbox" className="text-xs text-gold-dark font-semibold">Otvori Inbox →</Link></div><ActionGroup title="Critical problemi" items={critical} tone="red" empty="Nema kritičnih problema." /><ActionGroup title="Istekao rok" items={overdue} tone="red" empty="Nema problema sa isteklim rokom." /><ActionGroup title="Novi i nedodeljeni" items={newUnassigned} tone="orange" empty="Svi novi problemi su dodeljeni." /></div><div className="card"><h2 className="font-display text-lg font-semibold mb-4">Problemi po statusu</h2>{statusData.map((x) => <Bar key={x.label} label={x.label} value={x.value} max={Math.max(1, all.length)} />)}<h2 className="font-display text-lg font-semibold mt-6 mb-4">Po prioritetu</h2>{priorityData.map((x) => <Bar key={x.label} label={x.label} value={x.value} max={Math.max(1, all.length)} critical={x.label === 'Critical'} />)}</div></div>
    <div className="card"><div className="flex justify-between items-center mb-4"><h2 className="font-display text-lg font-semibold">Poslednji problemi</h2><Link href="/admin/tickets" className="text-xs text-gold-dark font-semibold">Svi problemi →</Link></div>{all.slice(0, 7).map((t) => <Link href={`/admin/tickets?ticket=${t.id}`} key={t.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0 hover:bg-cream-2/50"><div className="w-8 h-8 rounded-lg bg-navy-950 flex items-center justify-center"><Wrench size={14} className="text-sage" /></div><div className="flex-1 min-w-0"><div className="font-bold text-[13px] truncate">{t.title}</div><div className="text-[11px] text-ink-soft">#{t.id} · Stan {t.unit} · {t.category}</div></div><span className={`tag ${t.priority === 'Critical' ? 'tag-brick' : t.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{t.priority} · {t.status}</span></Link>)}{!all.length && <p className="text-sm text-ink-soft">Nema problema.</p>}</div>
  </div>;
}

function ActionGroup({ title, items, tone, empty }: { title: string; items: Ticket[]; tone: 'red' | 'orange'; empty: string }) { return <div className="mb-4 last:mb-0"><div className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">{title}</div>{items.slice(0, 3).map((t) => <Link href={`/admin/tickets?ticket=${t.id}`} key={t.id} className="flex items-center gap-2 py-2 border-b border-line last:border-0"><span className={`w-2 h-2 rounded-full ${tone === 'red' ? 'bg-brick' : 'bg-gold'}`} /><span className="text-[12.5px] font-semibold flex-1 truncate">#{t.id} · {t.title}</span><span className="text-[11px] text-ink-soft">→</span></Link>)}{!items.length && <p className="text-xs text-ink-faint">{empty}</p>}</div>; }
function Bar({ label, value, max, critical }: { label: string; value: number; max: number; critical?: boolean }) { return <div className="mb-2.5"><div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-mono text-ink-soft">{value}</span></div><div className="h-2 bg-cream-2 rounded-full overflow-hidden"><div className={`h-full ${critical ? 'bg-brick' : 'bg-sage'}`} style={{ width: `${value / max * 100}%` }} /></div></div>; }
