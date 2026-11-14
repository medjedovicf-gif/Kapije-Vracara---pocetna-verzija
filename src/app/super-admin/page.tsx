import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Building, BuildingExpense, Invoice, PlannedWork, Profile, Ticket } from '@/lib/types';
import { CHART_COLORS, DonutChart } from '@/components/admin/DonutChart';
import { BuildingFormButton } from '@/components/BuildingForm';
import { fullAddress } from '@/lib/buildings';
import { formatRsd } from '@/lib/finance';
import { currentPeriod } from '@/lib/ips';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const monthKey = currentPeriod(now);

  const [{ data: buildingRows }, { data: profileRows }, { data: ticketRows }, expensesRes, worksRes, { data: invoiceRows }] = await Promise.all([
    supabase.from('buildings').select('*').order('name').returns<Building[]>(),
    supabase.from('profiles').select('*').returns<Profile[]>(),
    supabase.from('tickets').select('*').returns<Ticket[]>(),
    supabase.from('building_expenses').select('building_id, category, amount, issue_date, status').gte('issue_date', yearStart).returns<Pick<BuildingExpense, 'building_id' | 'category' | 'amount' | 'issue_date' | 'status'>[]>(),
    supabase.from('planned_works').select('building_id, estimated_cost, status').in('status', ['Planirano', 'U toku']).returns<Pick<PlannedWork, 'building_id' | 'estimated_cost' | 'status'>[]>(),
    supabase.from('invoices').select('building_id, amount, status, created_at').gte('created_at', yearStart).returns<Pick<Invoice, 'building_id' | 'amount' | 'status' | 'created_at'>[]>(),
  ]);

  const buildings = buildingRows ?? [];
  const profiles = profileRows ?? [];
  const residents = profiles.filter((p) => p.role === 'resident');
  const admins = profiles.filter((p) => p.role === 'admin');
  const tickets = ticketRows ?? [];
  const active = tickets.filter((t) => t.status !== 'Rešeno');
  const critical = active.filter((t) => t.priority === 'Critical');
  const overdue = active.filter((t) => t.due_at && new Date(t.due_at).getTime() < now.getTime());
  const expenses = expensesRes.data ?? [];
  const works = worksRes.data ?? [];
  const invoices = invoiceRows ?? [];

  const debtOf = (rs: Profile[]) => rs.filter((r) => r.payment_status !== 'Plaćeno').reduce((a, r) => a + Number(r.balance || 0), 0);
  const paidShare = (rs: Profile[]) => (rs.length ? Math.round((rs.filter((r) => r.payment_status === 'Plaćeno').length / rs.length) * 100) : 0);
  const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + Number(x.amount), 0);

  const totalDebt = debtOf(residents);
  const monthCost = sum(expenses.filter((e) => e.issue_date.startsWith(monthKey)));
  const issuedYear = sum(invoices);

  const perBuilding = buildings.map((b) => {
    const rs = residents.filter((r) => r.building_id === b.id);
    const act = active.filter((t) => t.building_id === b.id);
    return {
      b,
      units: new Set(rs.map((r) => r.unit).filter(Boolean)).size,
      admin: admins.find((a) => a.building_id === b.id)?.name ?? null,
      collection: paidShare(rs),
      debt: debtOf(rs),
      active: act.length,
      critical: act.filter((t) => t.priority === 'Critical').length,
      monthCost: sum(expenses.filter((e) => e.building_id === b.id && e.issue_date.startsWith(monthKey))),
      planned: works.filter((w) => w.building_id === b.id).length,
      profileDone: [b.address, b.bank_account, b.tax_id, b.registration_number, b.code].filter(Boolean).length,
    };
  });

  const kpis: { label: string; value: string; sub: string; tone?: 'brick' | 'gold'; href: string }[] = [
    { label: 'Zgrade', value: String(buildings.length), sub: `${admins.length} upravnika`, href: '/super-admin/buildings' },
    { label: 'Stanovi', value: String(new Set(residents.map((r) => `${r.building_id}:${r.unit}`)).size), sub: `${residents.length} stanara`, href: '/super-admin/residents' },
    { label: 'Naplaćenost', value: `${paidShare(residents)}%`, sub: `izdato ${now.getFullYear()}: ${formatRsd(issuedYear)}`, href: '/super-admin/payments' },
    { label: 'Dug stanara', value: formatRsd(totalDebt), sub: `${residents.filter((r) => r.payment_status !== 'Plaćeno').length} stanara duguje`, tone: totalDebt > 0 ? 'gold' : undefined, href: '/super-admin/payments' },
    { label: 'Otvoreni zahtevi', value: String(active.length), sub: critical.length || overdue.length ? `${critical.length} kritično · ${overdue.length} kasni` : 'sve pod kontrolom', tone: critical.length || overdue.length ? 'brick' : undefined, href: '/super-admin/tickets' },
    { label: 'Troškovi ovog meseca', value: formatRsd(monthCost), sub: `${works.length} planiranih radova`, href: '/super-admin/buildings' },
  ];

  const debtSlices = perBuilding.filter((x) => x.debt > 0).sort((a, b) => b.debt - a.debt).map((x, i) => ({ label: x.b.name, value: x.debt, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const byCategory = new Map<string, number>();
  expenses.forEach((e) => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount)));
  const costSlices = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const yearCost = sum(expenses);
  const statusColors: Record<string, string> = { Novo: '#E4B23C', Zakazano: '#C0912A', 'U toku': '#6F9C87', Rešeno: '#10152A' };
  const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M` : `${Math.round(n / 1000)}k`);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-ink-soft text-sm">Centralni pregled svih zgrada na platformi.</p>
        <BuildingFormButton building={null} />
      </div>

      <div className="card !p-0 grid gap-px bg-line grid-cols-2 md:grid-cols-3 xl:grid-cols-6 mb-5 overflow-hidden">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="row-link bg-white hover:bg-cream active:bg-cream-2 px-4 py-3">
            <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint truncate">{k.label}</div>
            <div className={`font-display font-semibold text-[19px] leading-tight mt-0.5 ${k.tone === 'brick' ? 'text-brick' : k.tone === 'gold' ? 'text-gold-dark' : 'text-navy-950'}`}>{k.value}</div>
            <div className="text-[11px] text-ink-soft truncate">{k.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        <DonutChart title="Dug stanara po zgradi" slices={debtSlices} format={formatRsd} center={short(totalDebt)} centerSub="RSD" empty="Nema dugovanja." action={{ href: '/super-admin/payments', label: 'Uplate →' }} />
        <DonutChart title={`Troškovi po kategoriji · ${now.getFullYear()}.`} slices={costSlices} format={formatRsd} center={short(yearCost)} centerSub="RSD" empty="Još nema unetih faktura." />
        <DonutChart title="Zahtevi po statusu" center={String(active.length)} centerSub="otvoreno"
          slices={['Novo', 'Zakazano', 'U toku', 'Rešeno'].map((s) => ({ label: s, value: tickets.filter((t) => t.status === s).length, color: statusColors[s] }))}
          empty="Nema zahteva." action={{ href: '/super-admin/tickets', label: 'Svi →' }} />
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <h2 className="text-[13px] font-bold text-navy-950">Zgrade <span className="font-normal text-ink-faint">({buildings.length})</span></h2>
          <Link href="/super-admin/buildings" className="text-[11.5px] text-gold-dark font-semibold hover:underline">Podaci zgrada →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-[12.5px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-y border-line bg-cream/40">
                <th className="px-4 py-2 font-semibold">Zgrada</th>
                <th className="px-3 py-2 font-semibold">Upravnik</th>
                <th className="px-3 py-2 font-semibold text-right">Stanovi</th>
                <th className="px-3 py-2 font-semibold">Naplaćenost</th>
                <th className="px-3 py-2 font-semibold text-right">Dug</th>
                <th className="px-3 py-2 font-semibold text-right">Zahtevi</th>
                <th className="px-3 py-2 font-semibold text-right">Troškovi (mesec)</th>
                <th className="px-3 py-2 font-semibold">Podaci</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {perBuilding.map((x) => (
                <tr key={x.b.id} className="border-b border-line last:border-0 align-middle">
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-navy-950">{x.b.name}</div>
                    <div className="text-[11px] text-ink-faint truncate max-w-[240px]">{fullAddress(x.b) || 'adresa nije uneta'}</div>
                  </td>
                  <td className="px-3 py-2.5">{x.admin ?? <span className="text-brick font-semibold">nema upravnika</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{x.units}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-cream-2 rounded-full overflow-hidden"><div className={`h-full ${x.collection >= 80 ? 'bg-sage' : x.collection >= 50 ? 'bg-gold' : 'bg-brick'}`} style={{ width: `${x.collection}%` }} /></div>
                      <span className="font-mono text-ink-soft">{x.collection}%</span>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono ${x.debt > 0 ? 'text-gold-dark font-bold' : 'text-ink-soft'}`}>{formatRsd(x.debt)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono">{x.active}</span>
                    {x.critical > 0 && <span className="tag tag-brick ml-1.5">{x.critical} krit.</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-soft">{formatRsd(x.monthCost)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`tag ${x.profileDone >= 5 ? 'tag-sage' : x.profileDone >= 2 ? 'tag-gold' : 'tag-brick'}`}>{x.profileDone}/5</span>
                  </td>
                  <td className="px-3 py-2.5 text-right"><BuildingFormButton building={x.b} variant="outline" label="Izmeni" /></td>
                </tr>
              ))}
              {!buildings.length && <tr><td colSpan={9} className="px-4 py-6 text-ink-faint">Nema unetih zgrada.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10.5px] text-ink-faint border-t border-line">„Podaci“ = popunjenost ključnih polja: adresa, tekući račun, PIB, matični broj, kod zgrade.</p>
      </div>
    </div>
  );
}
