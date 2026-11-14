import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Building, Profile, Ticket } from '@/lib/types';
import { FilterChips, makeHref } from '@/components/admin/FilterChips';
import { formatDate, formatDateTime } from '@/lib/format';
import { priorityLabel } from '@/lib/labels';
import { formatDuration, resolutionHours } from '@/lib/ticket-stats';

export const dynamic = 'force-dynamic';

type Params = { building?: string; status?: string; priority?: string };
const STATUSES = ['Novo', 'Zakazano', 'U toku', 'Rešeno'] as const;
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export default async function SuperAdminTicketsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: buildingRows }, { data: ticketRows }, { data: staffRows }] = await Promise.all([
    supabase.from('buildings').select('id, name').order('name').returns<Pick<Building, 'id' | 'name'>[]>(),
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(1000).returns<Ticket[]>(),
    supabase.from('profiles').select('id, name, role').in('role', ['admin', 'superadmin']).returns<Pick<Profile, 'id' | 'name' | 'role'>[]>(),
  ]);

  const buildings = buildingRows ?? [];
  const nameOf = new Map(buildings.map((b) => [b.id, b.name]));
  const staffName = new Map((staffRows ?? []).map((s) => [s.id, s.name]));
  const all = ticketRows ?? [];
  const now = Date.now();
  const isOpen = (t: Ticket) => t.status !== 'Rešeno';
  const isLate = (t: Ticket) => isOpen(t) && !!t.due_at && new Date(t.due_at).getTime() < now;

  const scoped = params.building ? all.filter((t) => t.building_id === params.building) : all;
  const byStatus = params.status === 'active' ? scoped.filter(isOpen) : params.status ? scoped.filter((t) => t.status === params.status) : scoped;
  const list = params.priority ? byStatus.filter((t) => t.priority === params.priority) : byStatus;

  const open = scoped.filter(isOpen);
  const resolved30 = scoped.filter((t) => t.status === 'Rešeno' && now - new Date(t.updated_at).getTime() < 30 * 864e5);
  const avgHours = resolved30.length ? resolved30.reduce((a, t) => a + resolutionHours(t), 0) / resolved30.length : null;

  const kpis = [
    { label: 'Otvoreni', value: String(open.length), sub: `${scoped.filter((t) => t.status === 'Novo').length} novih`, href: makeHref('/super-admin/tickets', params)('status', 'active') },
    { label: 'Kritični', value: String(open.filter((t) => t.priority === 'Critical').length), sub: `${open.filter((t) => t.is_emergency).length} hitnih`, tone: open.some((t) => t.priority === 'Critical') ? ('brick' as const) : undefined, href: makeHref('/super-admin/tickets', { ...params, status: 'active' })('priority', 'Critical') },
    { label: 'Istekao rok', value: String(open.filter(isLate).length), sub: 'otvoreni posle roka', tone: open.some(isLate) ? ('brick' as const) : undefined },
    { label: 'Nedodeljeni', value: String(open.filter((t) => !t.assigned_to).length), sub: 'bez zaduženog', tone: open.some((t) => !t.assigned_to) ? ('gold' as const) : undefined },
    { label: 'Rešeno (30 dana)', value: String(resolved30.length), sub: avgHours !== null ? `prosečno ${formatDuration(avgHours)}` : '—' },
  ];

  const perBuilding = buildings.map((b) => {
    const ts = all.filter((t) => t.building_id === b.id);
    const op = ts.filter(isOpen);
    return { b, open: op.length, critical: op.filter((t) => t.priority === 'Critical').length, late: op.filter(isLate).length, unassigned: op.filter((t) => !t.assigned_to).length, total: ts.length };
  }).sort((a, b) => b.critical - a.critical || b.late - a.late || b.open - a.open);

  const href = makeHref('/super-admin/tickets', params);

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-navy-950">Zahtevi za servis</h2>
        <p className="text-ink-soft text-sm mt-1">Prijave kvarova i zahtevi stanara po svim zgradama.</p>
      </div>

      <div className="card !p-0 grid gap-px bg-line grid-cols-2 lg:grid-cols-5 mb-5 overflow-hidden">
        {kpis.map((k, i) => {
          const body = (
            <>
              <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint">{k.label}</div>
              <div className={`font-display font-semibold text-[19px] leading-tight mt-0.5 ${k.tone === 'brick' ? 'text-brick' : k.tone === 'gold' ? 'text-gold-dark' : 'text-navy-950'}`}>{k.value}</div>
              <div className="text-[11px] text-ink-soft truncate">{k.sub}</div>
            </>
          );
          const cls = `bg-white px-4 py-3 ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`;
          return k.href
            ? <Link key={k.label} href={k.href} className={`${cls} row-link hover:bg-cream`}>{body}</Link>
            : <div key={k.label} className={cls}>{body}</div>;
        })}
      </div>

      {!params.building && (
        <div className="card !p-0 overflow-hidden mb-5">
          <h3 className="px-4 pt-3.5 pb-2 text-[13px] font-bold text-navy-950">Po zgradama</h3>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-[12.5px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-y border-line bg-cream/40">
                  <th className="px-4 py-2 font-semibold">Zgrada</th>
                  <th className="px-3 py-2 font-semibold text-right">Otvoreni</th>
                  <th className="px-3 py-2 font-semibold text-right">Kritični</th>
                  <th className="px-3 py-2 font-semibold text-right">Posle roka</th>
                  <th className="px-3 py-2 font-semibold text-right">Nedodeljeni</th>
                  <th className="px-3 py-2 font-semibold text-right">Ukupno</th>
                </tr>
              </thead>
              <tbody>
                {perBuilding.map((x) => (
                  <tr key={x.b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5"><Link href={href('building', x.b.id)} className="font-bold text-navy-950 hover:text-gold-dark">{x.b.name}</Link></td>
                    <td className="px-3 py-2.5 text-right font-mono">{x.open}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${x.critical ? 'text-brick font-bold' : 'text-ink-soft'}`}>{x.critical}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${x.late ? 'text-brick font-bold' : 'text-ink-soft'}`}>{x.late}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${x.unassigned ? 'text-gold-dark font-bold' : 'text-ink-soft'}`}>{x.unassigned}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink-soft">{x.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        <FilterChips label="Zgrada" param="building" current={params.building} hrefFor={href} options={buildings.map((b) => ({ value: b.id, label: b.name, count: all.filter((t) => t.building_id === b.id).length }))} />
        <FilterChips label="Status" param="status" current={params.status} hrefFor={href} options={[{ value: 'active', label: 'Otvoreni', count: open.length }, ...STATUSES.map((s) => ({ value: s, label: s, count: scoped.filter((t) => t.status === s).length }))]} />
        <FilterChips label="Prioritet" param="priority" current={params.priority} hrefFor={href} options={PRIORITIES.map((p) => ({ value: p, label: priorityLabel(p), count: byStatus.filter((t) => t.priority === p).length }))} />
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-[12.5px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-b border-line bg-cream/40">
                <th className="px-4 py-2 font-semibold">Zahtev</th>
                <th className="px-3 py-2 font-semibold">Zgrada · stan</th>
                <th className="px-3 py-2 font-semibold">Prioritet</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Zadužen</th>
                <th className="px-3 py-2 font-semibold">Rok</th>
                <th className="px-3 py-2 font-semibold">Prijavljeno</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 300).map((t) => {
                const late = isLate(t);
                return (
                  <tr key={t.id} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-2.5">
                      <details className="group">
                        <summary className="cursor-pointer list-none">
                          <span className="font-bold text-navy-950">{t.title}</span>
                          <span className="ml-1.5 font-mono text-[11px] text-ink-faint">#{t.id}</span>
                          {t.is_emergency && <span className="tag tag-brick ml-1.5">hitno</span>}
                          <div className="text-[11px] text-ink-faint">{t.category}{t.location ? ` · ${t.location}` : ''}</div>
                        </summary>
                        {t.description && <p className="mt-1.5 text-[12px] text-ink-soft whitespace-pre-line max-w-[360px]">{t.description}</p>}
                      </details>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{nameOf.get(t.building_id) ?? '—'} · <b>{t.unit}</b></td>
                    <td className="px-3 py-2.5"><span className={`tag ${t.priority === 'Critical' ? 'tag-brick' : t.priority === 'High' ? 'tag-gold' : 'bg-cream-2 text-ink-soft'}`}>{priorityLabel(t.priority)}</span></td>
                    <td className="px-3 py-2.5"><span className={`tag ${t.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{t.status}</span></td>
                    <td className="px-3 py-2.5">{t.assigned_to ? staffName.get(t.assigned_to) ?? '—' : <span className="text-ink-faint">—</span>}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${late ? 'text-brick font-semibold' : 'text-ink-soft'}`}>{t.due_at ? formatDate(t.due_at) : '—'}{late ? ' · kasni' : ''}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink-soft">{formatDateTime(t.created_at)}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-faint">Nema zahteva za izabrani filter.</td></tr>}
            </tbody>
          </table>
        </div>
        {list.length > 300 && <p className="px-4 py-2 text-[11px] text-ink-faint border-t border-line">Prikazano prvih 300 od {list.length}. Suzite filter.</p>}
      </div>
    </div>
  );
}
