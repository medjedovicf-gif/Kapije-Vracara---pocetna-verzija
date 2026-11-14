import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Building, Invoice, Profile } from '@/lib/types';
import { FilterChips, makeHref } from '@/components/admin/FilterChips';
import { formatRsd } from '@/lib/finance';
import { formatDate, formatDateTime } from '@/lib/format';
import { currentPeriod } from '@/lib/ips';

export const dynamic = 'force-dynamic';

type Params = { building?: string; status?: string };

export default async function SuperAdminPaymentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: buildingRows }, { data: profileRows }, { data: invoiceRows }] = await Promise.all([
    supabase.from('buildings').select('id, name').order('name').returns<Pick<Building, 'id' | 'name'>[]>(),
    supabase.from('profiles').select('id, name, unit, building_id, balance, payment_status, role').eq('role', 'resident').returns<Profile[]>(),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(1000).returns<Invoice[]>(),
  ]);

  const buildings = buildingRows ?? [];
  const nameOf = new Map(buildings.map((b) => [b.id, b.name]));
  const residents = profileRows ?? [];
  const all = invoiceRows ?? [];
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthKey = currentPeriod();
  const year = String(new Date().getFullYear());

  const isPaid = (i: Invoice) => i.status === 'Plaćena';
  const isLate = (i: Invoice) => !isPaid(i) && !!i.due_date && i.due_date < todayIso;
  const statusOf = (i: Invoice) => (isPaid(i) ? 'paid' : isLate(i) ? 'late' : 'open');
  const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + Number(x.amount), 0);

  const scoped = params.building ? all.filter((i) => i.building_id === params.building) : all;
  const list = params.status ? scoped.filter((i) => statusOf(i) === params.status) : scoped;
  const scopedResidents = params.building ? residents.filter((r) => r.building_id === params.building) : residents;
  const yearInv = scoped.filter((i) => i.created_at.startsWith(year));
  const debt = scopedResidents.filter((r) => r.payment_status !== 'Plaćeno').reduce((a, r) => a + Number(r.balance || 0), 0);

  const kpis = [
    { label: `Izdato ${year}.`, value: formatRsd(sum(yearInv)), sub: `${yearInv.length} faktura` },
    { label: 'Naplaćeno', value: formatRsd(sum(yearInv.filter(isPaid))), sub: yearInv.length ? `${Math.round((sum(yearInv.filter(isPaid)) / Math.max(1, sum(yearInv))) * 100)}% iznosa` : '—' },
    { label: 'Na čekanju', value: formatRsd(sum(scoped.filter((i) => !isPaid(i)))), sub: `${scoped.filter((i) => !isPaid(i)).length} faktura`, tone: 'gold' as const },
    { label: 'Posle roka', value: String(scoped.filter(isLate).length), sub: formatRsd(sum(scoped.filter(isLate))), tone: scoped.some(isLate) ? ('brick' as const) : undefined },
    { label: 'Dug stanara', value: formatRsd(debt), sub: `${scopedResidents.filter((r) => r.payment_status !== 'Plaćeno').length} stanara duguje`, tone: debt > 0 ? ('gold' as const) : undefined },
  ];

  const perBuilding = buildings.map((b) => {
    const inv = all.filter((i) => i.building_id === b.id);
    const rs = residents.filter((r) => r.building_id === b.id);
    const month = inv.filter((i) => i.period === monthKey || (!i.period && i.created_at.startsWith(monthKey)));
    return {
      b,
      monthIssued: sum(month),
      monthCount: month.length,
      units: new Set(rs.map((r) => r.unit).filter(Boolean)).size,
      collection: rs.length ? Math.round((rs.filter((r) => r.payment_status === 'Plaćeno').length / rs.length) * 100) : 0,
      debt: rs.filter((r) => r.payment_status !== 'Plaćeno').reduce((a, r) => a + Number(r.balance || 0), 0),
      late: inv.filter(isLate).length,
    };
  });

  const href = makeHref('/super-admin/payments', params);

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-navy-950">Uplate</h2>
        <p className="text-ink-soft text-sm mt-1">Fakture i naplata po svim zgradama.</p>
      </div>

      <div className="card !p-0 grid gap-px bg-line grid-cols-2 lg:grid-cols-5 mb-5 overflow-hidden">
        {kpis.map((k, i) => (
          <div key={k.label} className={`bg-white px-4 py-3 ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint">{k.label}</div>
            <div className={`font-display font-semibold text-[19px] leading-tight mt-0.5 ${k.tone === 'brick' ? 'text-brick' : k.tone === 'gold' ? 'text-gold-dark' : 'text-navy-950'}`}>{k.value}</div>
            <div className="text-[11px] text-ink-soft truncate">{k.sub}</div>
          </div>
        ))}
      </div>

      {!params.building && (
        <div className="card !p-0 overflow-hidden mb-5">
          <h3 className="px-4 pt-3.5 pb-2 text-[13px] font-bold text-navy-950">Po zgradama</h3>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-[12.5px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-y border-line bg-cream/40">
                  <th className="px-4 py-2 font-semibold">Zgrada</th>
                  <th className="px-3 py-2 font-semibold text-right">Stanovi</th>
                  <th className="px-3 py-2 font-semibold text-right">Izdato ovog meseca</th>
                  <th className="px-3 py-2 font-semibold">Naplaćenost</th>
                  <th className="px-3 py-2 font-semibold text-right">Dug</th>
                  <th className="px-3 py-2 font-semibold text-right">Posle roka</th>
                </tr>
              </thead>
              <tbody>
                {perBuilding.map((x) => (
                  <tr key={x.b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5"><Link href={href('building', x.b.id)} className="font-bold text-navy-950 hover:text-gold-dark">{x.b.name}</Link></td>
                    <td className="px-3 py-2.5 text-right font-mono">{x.units}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{x.monthCount ? `${formatRsd(x.monthIssued)} · ${x.monthCount}` : <span className="text-brick font-sans font-semibold">nije zaduženo</span>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-cream-2 rounded-full overflow-hidden"><div className={`h-full ${x.collection >= 80 ? 'bg-sage' : x.collection >= 50 ? 'bg-gold' : 'bg-brick'}`} style={{ width: `${x.collection}%` }} /></div>
                        <span className="font-mono text-ink-soft">{x.collection}%</span>
                      </div>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${x.debt > 0 ? 'text-gold-dark font-bold' : 'text-ink-soft'}`}>{formatRsd(x.debt)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${x.late ? 'text-brick font-bold' : 'text-ink-soft'}`}>{x.late}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        <FilterChips label="Zgrada" param="building" current={params.building} hrefFor={href} options={buildings.map((b) => ({ value: b.id, label: b.name, count: all.filter((i) => i.building_id === b.id).length }))} />
        <FilterChips label="Status" param="status" current={params.status} hrefFor={href} options={[
          { value: 'open', label: 'Na čekanju', count: scoped.filter((i) => statusOf(i) === 'open').length },
          { value: 'late', label: 'Posle roka', count: scoped.filter(isLate).length },
          { value: 'paid', label: 'Plaćene', count: scoped.filter(isPaid).length },
        ]} />
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-[12.5px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-b border-line bg-cream/40">
                <th className="px-4 py-2 font-semibold">Izdato</th>
                <th className="px-3 py-2 font-semibold">Zgrada</th>
                <th className="px-3 py-2 font-semibold">Stan</th>
                <th className="px-3 py-2 font-semibold">Primalac</th>
                <th className="px-3 py-2 font-semibold">Period</th>
                <th className="px-3 py-2 font-semibold text-right">Iznos</th>
                <th className="px-3 py-2 font-semibold">Rok</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 300).map((i) => {
                const s = statusOf(i);
                return (
                  <tr key={i.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-soft">{formatDateTime(i.created_at)}</td>
                    <td className="px-3 py-2.5">{nameOf.get(i.building_id) ?? '—'}</td>
                    <td className="px-3 py-2.5 font-bold">{i.unit}</td>
                    <td className="px-3 py-2.5 truncate max-w-[180px]">{i.recipient_name ?? '—'}</td>
                    <td className="px-3 py-2.5">{i.month}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap">{formatRsd(Number(i.amount))}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${s === 'late' ? 'text-brick font-semibold' : 'text-ink-soft'}`}>{formatDate(i.due_date)}</td>
                    <td className="px-3 py-2.5"><span className={`tag ${s === 'paid' ? 'tag-sage' : s === 'late' ? 'tag-brick' : 'tag-gold'}`}>{s === 'paid' ? 'Plaćena' : s === 'late' ? 'Kasni' : i.status}</span></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-faint">Nema faktura za izabrani filter.</td></tr>}
            </tbody>
          </table>
        </div>
        {list.length > 300 && <p className="px-4 py-2 text-[11px] text-ink-faint border-t border-line">Prikazano prvih 300 od {list.length}. Suzite filter.</p>}
      </div>
    </div>
  );
}
