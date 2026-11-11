import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, ListFilter, UserRound, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { Profile, Ticket } from '@/lib/types';
import { AdminRealtimeRefresh } from '@/components/admin/AdminRealtimeRefresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const tickets = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return `/admin/tickets${qs ? `?${qs}` : ''}`;
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const [{ data: residents }, { data: ticketRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'resident').eq('building_id', me.building_id).returns<Profile[]>(),
    supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at', { ascending: false }).returns<Ticket[]>(),
  ]);
  const all = ticketRows ?? [];
  const active = all.filter((t) => t.status !== 'Rešeno');
  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week = new Date(); week.setDate(week.getDate() - 7);
  const overdue = active.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const critical = active.filter((t) => t.priority === 'Critical');
  const newUnassigned = all.filter((t) => t.status === 'Novo' && !t.assigned_to);
  const todayCount = all.filter((t) => new Date(t.created_at) >= today).length;
  const weekCount = all.filter((t) => new Date(t.created_at) >= week).length;

  const stats = [
    { label: 'Aktivni problemi', value: active.length, Icon: Wrench, color: 'text-navy-950', href: tickets({ status: 'active' }) },
    { label: 'Novi problemi', value: all.filter((t) => t.status === 'Novo').length, Icon: ListFilter, color: 'text-gold-dark', href: tickets({ status: 'Novo' }) },
    { label: 'U obradi', value: all.filter((t) => t.status === 'U toku').length, Icon: Clock3, color: 'text-gold-dark', href: tickets({ status: 'U toku' }) },
    { label: 'Rešeni', value: all.filter((t) => t.status === 'Rešeno').length, Icon: CheckCircle2, color: 'text-sage', href: tickets({ status: 'Rešeno' }) },
    { label: 'Istekao rok', value: overdue.length, Icon: AlertTriangle, color: 'text-brick', href: tickets({ filter: 'overdue' }), alert: overdue.length > 0 },
    { label: 'Kritični', value: critical.length, Icon: AlertTriangle, color: 'text-brick', href: tickets({ filter: 'critical' }), alert: critical.length > 0 },
    { label: 'Korisnici', value: (residents ?? []).length, Icon: UserRound, color: 'text-navy-950', href: '/admin/residents' },
    { label: 'Danas / 7 dana', value: `${todayCount} / ${weekCount}`, Icon: Clock3, color: 'text-navy-950', href: tickets() },
  ];
  const statusData = ['Novo', 'Zakazano', 'U toku', 'Rešeno'].map((status) => ({ label: status, value: all.filter((t) => t.status === status).length, href: tickets({ status }) }));
  const priorityData = ['Critical', 'High', 'Medium', 'Low'].map((priority) => ({ label: priority, value: all.filter((t) => t.priority === priority).length, href: tickets({ priority }) }));

  return (
    <div>
      <AdminRealtimeRefresh buildingId={me.building_id} />
      <p className="text-ink-soft text-sm mb-6">Command Center · operativni pregled vaše zgrade.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {stats.map(({ label, value, Icon, color, href, alert }) => (
          <Link href={href} key={label} className="card card-link">
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-[10px] bg-cream-2 flex items-center justify-center"><Icon size={15} className={color} /></div>
              {alert ? <span className="w-2 h-2 rounded-full bg-brick" /> : <ChevronRight size={15} className="text-ink-faint" />}
            </div>
            <div className="font-display font-semibold text-[22px] mt-2">{value}</div>
            <div className="text-[11.5px] text-ink-soft">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-5 mb-6">
        <div className="card">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold">Potrebna akcija</h2>
            <Link href="/admin/inbox" className="text-xs text-gold-dark font-semibold hover:underline">Otvori Inbox →</Link>
          </div>
          <ActionGroup title="Kritični problemi" href={tickets({ filter: 'critical' })} items={critical} tone="red" empty="Nema kritičnih problema." />
          <ActionGroup title="Istekao rok" href={tickets({ filter: 'overdue' })} items={overdue} tone="red" empty="Nema problema sa isteklim rokom." />
          <ActionGroup title="Novi i nedodeljeni" href={tickets({ filter: 'unassigned' })} items={newUnassigned} tone="orange" empty="Svi novi problemi su dodeljeni." />
        </div>
        <div className="card">
          <h2 className="font-display text-lg font-semibold mb-3">Problemi po statusu</h2>
          {statusData.map((x) => <Bar key={x.label} {...x} max={Math.max(1, all.length)} />)}
          <h2 className="font-display text-lg font-semibold mt-5 mb-3">Po prioritetu</h2>
          {priorityData.map((x) => <Bar key={x.label} {...x} max={Math.max(1, all.length)} critical={x.label === 'Critical'} />)}
        </div>
      </div>

      <div className="card !px-0 !pb-2">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-2 px-5">
          <h2 className="font-display text-lg font-semibold">Poslednji problemi</h2>
          <Link href={tickets()} className="text-xs text-gold-dark font-semibold hover:underline">Svi problemi →</Link>
        </div>
        {all.slice(0, 7).map((t) => (
          <Link href={tickets({ ticket: String(t.id) })} key={t.id} className="row-link flex items-center gap-3 px-5 py-3 border-b border-line last:border-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-navy-950 flex items-center justify-center"><Wrench size={14} className="text-sage" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] truncate">{t.title}</div>
              <div className="text-[11px] text-ink-soft truncate">#{t.id} · Stan {t.unit} · {t.category}</div>
            </div>
            <span className={`tag hidden sm:inline-block ${t.priority === 'Critical' ? 'tag-brick' : t.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{t.priority} · {t.status}</span>
            <span className={`tag sm:hidden ${t.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{t.status}</span>
            <ChevronRight size={16} className="text-ink-faint shrink-0" />
          </Link>
        ))}
        {!all.length && <p className="text-sm text-ink-soft px-5 py-2">Nema problema.</p>}
      </div>
    </div>
  );
}

function ActionGroup({ title, href, items, tone, empty }: { title: string; href: string; items: Ticket[]; tone: 'red' | 'orange'; empty: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <Link href={href} className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1 hover:text-navy-950">
        <span>{title} {items.length > 0 && `(${items.length})`}</span>
        {items.length > 3 && <span className="normal-case tracking-normal font-sans">Sve →</span>}
      </Link>
      {items.slice(0, 3).map((t) => (
        <Link href={tickets({ ticket: String(t.id) })} key={t.id} className="row-link flex items-center gap-2 py-2.5 -mx-2 px-2 rounded-lg">
          <span className={`w-2 h-2 shrink-0 rounded-full ${tone === 'red' ? 'bg-brick' : 'bg-gold'}`} />
          <span className="text-[12.5px] font-semibold flex-1 truncate">#{t.id} · {t.title}</span>
          <ChevronRight size={15} className="text-ink-faint shrink-0" />
        </Link>
      ))}
      {!items.length && <p className="text-xs text-ink-faint py-1">{empty}</p>}
    </div>
  );
}

function Bar({ label, value, max, href, critical }: { label: string; value: number; max: number; href: string; critical?: boolean }) {
  return (
    <Link href={href} className="row-link block -mx-2 px-2 py-1.5 rounded-lg">
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-mono text-ink-soft">{value}</span></div>
      <div className="h-2 bg-cream-2 rounded-full overflow-hidden"><div className={`h-full ${critical ? 'bg-brick' : 'bg-sage'}`} style={{ width: `${(value / max) * 100}%` }} /></div>
    </Link>
  );
}
