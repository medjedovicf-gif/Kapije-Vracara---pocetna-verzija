import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, HardHat, Inbox, Paperclip, ReceiptText, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import type { BuildingExpense, PlannedWork, Profile, Ticket } from '@/lib/types';
import { AdminRealtimeRefresh } from '@/components/admin/AdminRealtimeRefresh';
import { CHART_COLORS, DonutChart } from '@/components/admin/DonutChart';
import { NewExpenseButton, NewPlannedWorkButton } from '@/components/admin/FinanceForms';
import { priorityLabel } from '@/lib/labels';
import { formatDate, formatRsd } from '@/lib/finance';

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

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const yearStart = `${now.getFullYear()}-01-01`;
  const monthKey = todayIso.slice(0, 7);

  const [{ data: residents }, { data: ticketRows }, expensesRes, worksRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'resident').eq('building_id', me.building_id).returns<Profile[]>(),
    supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at', { ascending: false }).returns<Ticket[]>(),
    supabase.from('building_expenses').select('*').eq('building_id', me.building_id).gte('issue_date', yearStart).order('issue_date', { ascending: false }).order('id', { ascending: false }).returns<BuildingExpense[]>(),
    supabase.from('planned_works').select('*').eq('building_id', me.building_id).in('status', ['Planirano', 'U toku']).order('planned_date', { ascending: true, nullsFirst: false }).returns<PlannedWork[]>(),
  ]);
  const financeReady = !expensesRes.error && !worksRes.error;
  const expenses = expensesRes.data ?? [];
  const works = worksRes.data ?? [];

  // Problemi
  const all = ticketRows ?? [];
  const active = all.filter((t) => t.status !== 'Rešeno');
  const overdue = active.filter((t) => t.due_at && new Date(t.due_at).getTime() < now.getTime());
  const critical = active.filter((t) => t.priority === 'Critical');
  const newUnassigned = all.filter((t) => t.status === 'Novo' && !t.assigned_to);

  // Naplata od stanara
  const res = residents ?? [];
  const paidUnits = res.filter((r) => r.payment_status === 'Plaćeno');
  const debt = res.filter((r) => r.payment_status !== 'Plaćeno').reduce((a, r) => a + Number(r.balance || 0), 0);
  const collection = res.length ? Math.round((paidUnits.length / res.length) * 100) : 0;

  // Troškovi
  const sum = (xs: BuildingExpense[]) => xs.reduce((a, e) => a + Number(e.amount), 0);
  const monthCost = sum(expenses.filter((e) => e.issue_date.startsWith(monthKey)));
  const unpaid = expenses.filter((e) => e.status === 'Neplaćeno');
  const lateBills = unpaid.filter((e) => e.due_date && e.due_date < todayIso);
  const byCategory = new Map<string, number>();
  expenses.forEach((e) => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount)));
  const categorySlices = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length], href: `/admin/expenses?category=${encodeURIComponent(label)}` }));
  const yearCost = sum(expenses);
  const planned = works.reduce((a, w) => a + Number(w.estimated_cost), 0);

  const kpis = [
    { label: 'Aktivni problemi', value: String(active.length), sub: critical.length || overdue.length ? `${critical.length} kritično · ${overdue.length} kasni` : 'sve pod kontrolom', tone: critical.length || overdue.length ? 'brick' : undefined, href: tickets({ status: 'active' }) },
    { label: 'Novi, nedodeljeni', value: String(newUnassigned.length), sub: 'čekaju dodelu', tone: newUnassigned.length ? 'gold' : undefined, href: tickets({ filter: 'unassigned' }) },
    { label: 'Naplaćenost', value: `${collection}%`, sub: `${paidUnits.length} od ${res.length} stanova`, href: '/admin/payments' },
    { label: 'Dug stanara', value: formatRsd(debt), sub: `${res.length - paidUnits.length} stanova duguje`, tone: debt > 0 ? 'gold' : undefined, href: '/admin/payments' },
    ...(financeReady ? [{ label: 'Troškovi ovog meseca', value: formatRsd(monthCost), sub: unpaid.length ? `${unpaid.length} neplaćeno · ${formatRsd(sum(unpaid))}` : 'sve plaćeno', tone: lateBills.length ? 'brick' : undefined, href: '/admin/expenses' }] : []),
  ] as { label: string; value: string; sub: string; tone?: 'brick' | 'gold'; href: string }[];

  const statusColors: Record<string, string> = { Novo: '#E4B23C', Zakazano: '#C0912A', 'U toku': '#6F9C87', Rešeno: '#10152A' };

  return (
    <div>
      <AdminRealtimeRefresh buildingId={me.building_id} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-ink-soft text-sm">Operativni i finansijski pregled zgrade.</p>
        <div className="flex flex-wrap gap-2">
          {financeReady && <NewExpenseButton compact plannedWorks={works.map((w) => ({ id: w.id, title: w.title }))} />}
          {financeReady && <NewPlannedWorkButton compact outline />}
          <Link href="/admin/inbox" className="btn btn-outline !px-3.5 !py-2 !text-[12.5px]"><Inbox size={15} /> Inbox</Link>
        </div>
      </div>

      {/* Kompaktna traka pokazatelja */}
      <div className={`card !p-0 grid gap-px bg-line grid-cols-2 ${kpis.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} mb-5 overflow-hidden`}>
        {kpis.map((k, i) => (
          <Link key={k.label} href={k.href} className={`row-link bg-white hover:bg-cream active:bg-cream-2 px-4 py-3 ${kpis.length === 5 && i === 4 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint truncate">{k.label}</div>
            <div className={`font-display font-semibold text-[19px] leading-tight mt-0.5 ${k.tone === 'brick' ? 'text-brick' : k.tone === 'gold' ? 'text-gold-dark' : 'text-navy-950'}`}>{k.value}</div>
            <div className="text-[11px] text-ink-soft truncate">{k.sub}</div>
          </Link>
        ))}
      </div>

      {/* Grafikoni */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        {financeReady ? (
          <DonutChart title={`Troškovi po kategoriji · ${now.getFullYear()}.`} slices={categorySlices} format={formatRsd}
            center={yearCost >= 1_000_000 ? `${(yearCost / 1_000_000).toFixed(1).replace('.', ',')} M` : `${Math.round(yearCost / 1000)}k`} centerSub="RSD"
            empty="Još nema unetih faktura." action={{ href: '/admin/expenses', label: 'Sve fakture →' }} />
        ) : (
          <div className="card !p-4 text-[12.5px] text-ink-soft">
            <h3 className="text-[13px] font-bold text-navy-950 mb-1">Fakture i planirani radovi</h3>
            Modul još nije aktiviran u bazi. Pokrenite <code className="font-mono text-[11.5px] bg-cream-2 px-1 rounded">supabase/admin-finance-migration.sql</code>.
          </div>
        )}
        <DonutChart title="Naplata od stanara" center={`${collection}%`} centerSub="naplaćeno"
          slices={[
            { label: 'Plaćeno', value: paidUnits.length, color: '#6F9C87', href: '/admin/payments' },
            { label: 'Na čekanju', value: res.length - paidUnits.length, color: '#E4B23C', href: '/admin/payments' },
          ]}
          format={(n) => `${n} st.`} empty="Nema stanara." action={{ href: '/admin/payments', label: 'Uplate →' }} />
        <DonutChart title="Problemi po statusu" center={String(active.length)} centerSub="aktivno"
          slices={['Novo', 'Zakazano', 'U toku', 'Rešeno'].map((s) => ({ label: s, value: all.filter((t) => t.status === s).length, color: statusColors[s], href: tickets({ status: s }) }))}
          empty="Nema prijavljenih problema." action={{ href: tickets(), label: 'Svi →' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Panel title="Potrebna akcija" action={{ href: '/admin/inbox', label: 'Inbox →' }}>
          <ActionGroup title="Kritični problemi" href={tickets({ filter: 'critical' })} empty="Nema kritičnih problema."
            items={critical.map((t) => ({ key: `c${t.id}`, href: tickets({ ticket: String(t.id) }), text: `#${t.id} · ${t.title}`, tone: 'red' }))} />
          <ActionGroup title="Istekao rok" href={tickets({ filter: 'overdue' })} empty="Nema problema sa isteklim rokom."
            items={overdue.map((t) => ({ key: `o${t.id}`, href: tickets({ ticket: String(t.id) }), text: `#${t.id} · ${t.title}`, tone: 'red' }))} />
          <ActionGroup title="Novi i nedodeljeni" href={tickets({ filter: 'unassigned' })} empty="Svi novi problemi su dodeljeni."
            items={newUnassigned.map((t) => ({ key: `n${t.id}`, href: tickets({ ticket: String(t.id) }), text: `#${t.id} · ${t.title}`, tone: 'gold' }))} />
          {financeReady && (
            <ActionGroup title="Fakture posle roka" href="/admin/expenses?status=Neplaćeno" empty="Nema neplaćenih faktura posle roka."
              items={lateBills.map((e) => ({ key: `e${e.id}`, href: '/admin/expenses?status=Neplaćeno', text: `${e.supplier} · ${formatRsd(Number(e.amount))} · rok ${formatDate(e.due_date)}`, tone: 'red' }))} />
          )}
        </Panel>

        <Panel title="Planirani radovi" action={{ href: '/admin/planned-works', label: 'Svi radovi →' }}
          meta={financeReady && works.length ? `${works.length} aktivno · ${formatRsd(planned)}` : undefined}>
          {!financeReady && <p className="text-xs text-ink-faint py-1">Modul još nije aktiviran.</p>}
          {financeReady && !works.length && <p className="text-xs text-ink-faint py-1">Nema planiranih radova.</p>}
          {works.slice(0, 5).map((w) => {
            const late = w.status === 'Planirano' && w.planned_date && w.planned_date < todayIso;
            return (
              <Link key={w.id} href="/admin/planned-works" className="row-link flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-cream-2 flex items-center justify-center shrink-0"><HardHat size={14} className="text-navy-950" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{w.title}</div>
                  <div className={`text-[11px] ${late ? 'text-brick font-semibold' : 'text-ink-soft'}`}>{formatDate(w.planned_date)} · {w.status}{late ? ' · kasni' : ''}</div>
                </div>
                <span className="font-mono text-[11.5px] text-ink-soft whitespace-nowrap">{formatRsd(Number(w.estimated_cost))}</span>
              </Link>
            );
          })}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Poslednje fakture" action={{ href: '/admin/expenses', label: 'Sve fakture →' }}>
          {!financeReady && <p className="text-xs text-ink-faint py-1">Modul još nije aktiviran.</p>}
          {financeReady && !expenses.length && <p className="text-xs text-ink-faint py-1">Još nema unetih faktura.</p>}
          {expenses.slice(0, 5).map((e) => (
            <Link key={e.id} href="/admin/expenses" className="row-link flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-cream-2 flex items-center justify-center shrink-0"><ReceiptText size={14} className="text-navy-950" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate flex items-center gap-1">{e.supplier}{e.file_path && <Paperclip size={11} className="text-ink-faint" />}</div>
                <div className="text-[11px] text-ink-soft truncate">{formatDate(e.issue_date)} · {e.category}</div>
              </div>
              <span className="font-mono text-[12px] font-bold whitespace-nowrap">{formatRsd(Number(e.amount))}</span>
              <span className={`tag ${e.status === 'Plaćeno' ? 'tag-sage' : 'tag-gold'}`}>{e.status}</span>
            </Link>
          ))}
        </Panel>

        <Panel title="Poslednji problemi" action={{ href: tickets(), label: 'Svi problemi →' }}>
          {!all.length && <p className="text-xs text-ink-faint py-1">Nema problema.</p>}
          {all.slice(0, 5).map((t) => (
            <Link key={t.id} href={tickets({ ticket: String(t.id) })} className="row-link flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-navy-950 flex items-center justify-center shrink-0"><Wrench size={13} className="text-sage" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{t.title}</div>
                <div className="text-[11px] text-ink-soft truncate">#{t.id} · Stan {t.unit} · {t.category}</div>
              </div>
              <span className={`tag hidden sm:inline-block ${t.priority === 'Critical' ? 'tag-brick' : t.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{priorityLabel(t.priority)}</span>
              <span className={`tag ${t.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{t.status}</span>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, action, meta, children }: { title: string; action?: { href: string; label: string }; meta?: string; children: React.ReactNode }) {
  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-[13px] font-bold text-navy-950">{title}{meta && <span className="ml-2 font-normal text-ink-faint">{meta}</span>}</h2>
        {action && <Link href={action.href} className="text-[11.5px] text-gold-dark font-semibold hover:underline whitespace-nowrap">{action.label}</Link>}
      </div>
      {children}
    </div>
  );
}

type ActionItem = { key: string; href: string; text: string; tone: 'red' | 'gold' };

function ActionGroup({ title, href, items, empty }: { title: string; href: string; items: ActionItem[]; empty: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <Link href={href} className="flex items-center justify-between text-[10.5px] font-mono uppercase tracking-wide text-ink-faint mb-0.5 hover:text-navy-950">
        <span>{title}{items.length > 0 && ` (${items.length})`}</span>
        {items.length > 3 && <span className="normal-case tracking-normal font-sans">Sve →</span>}
      </Link>
      {items.slice(0, 3).map((it) => (
        <Link href={it.href} key={it.key} className="row-link flex items-center gap-2 py-1.5 -mx-2 px-2 rounded-lg">
          <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${it.tone === 'red' ? 'bg-brick' : 'bg-gold'}`} />
          <span className="text-[12.5px] font-semibold flex-1 truncate">{it.text}</span>
          <ChevronRight size={14} className="text-ink-faint shrink-0" />
        </Link>
      ))}
      {!items.length && <p className="text-[11.5px] text-ink-faint py-0.5">{empty}</p>}
    </div>
  );
}
