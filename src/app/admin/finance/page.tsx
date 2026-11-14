import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { getMyProfile } from '@/lib/session';
import { buildReport, type ExportKind } from '@/lib/finance-report';
import { formatRsd } from '@/lib/finance';
import { formatDate } from '@/lib/format';
import { CHART_COLORS, DonutChart } from '@/components/admin/DonutChart';
import { loadReportData, rangeFromParams } from './data';

export const dynamic = 'force-dynamic';

type Params = { period?: string; from?: string; to?: string };

const PRESETS = [
  { id: 'month', label: 'Ovaj mesec' },
  { id: 'last-month', label: 'Prošli mesec' },
  { id: 'quarter', label: 'Ovaj kvartal' },
  { id: 'year', label: 'Ova godina' },
  { id: 'last-year', label: 'Prošla godina' },
  { id: 'all', label: 'Sve' },
];

export default async function FinanceReportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const params = await searchParams;
  const range = rangeFromParams(params);
  const data = await loadReportData(me.building_id);
  const rep = buildReport(data, range);
  const t = rep.totals;

  const qs = range.preset === 'custom' ? `from=${range.from}&to=${range.to}` : `period=${range.preset}`;
  const exportHref = (kind: ExportKind) => `/admin/finance/export?type=${kind}&${qs}`;

  const kpis = [
    { label: 'Zaduženo stanarima', value: formatRsd(t.charged), sub: 'izdate uplatnice' },
    { label: 'Uplaćeno', value: formatRsd(t.paidIn), sub: t.charged ? `${Math.round((t.paidIn / t.charged) * 100)}% zaduženja` : 'prilivi', tone: 'sage' as const },
    { label: 'Troškovi', value: formatRsd(t.costs), sub: t.unpaidCosts ? `neplaćeno ${formatRsd(t.unpaidCosts)}` : 'sve plaćeno' },
    { label: 'Isplaćeno', value: formatRsd(t.paidOut), sub: 'odlivi dobavljačima' },
    { label: 'Neto', value: formatRsd(t.net), sub: 'uplate − isplate', tone: t.net < 0 ? ('brick' as const) : ('sage' as const) },
    { label: 'Stanje računa', value: t.balance === null ? '—' : formatRsd(t.balance), sub: t.balance === null ? 'unesite početno stanje' : `na dan ${formatDate(range.to)}`, href: t.balance === null ? '/admin/buildings' : undefined },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-ink-soft text-sm">Zbirni pregled uplata, troškova i isplata za period <b className="text-navy-950">{formatDate(range.from)} – {formatDate(range.to)}</b>.</p>
        </div>
        <ExportMenu exportHref={exportHref} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <Link key={p.id} href={`/admin/finance?period=${p.id}`} className={`tag !text-[10.5px] ${range.preset === p.id ? '!bg-navy-950 !text-white' : 'bg-white border border-line text-ink-soft hover:border-navy-950'}`}>{p.label}</Link>
        ))}
        <form action="/admin/finance" className="flex items-center gap-1.5 ml-auto">
          <input type="date" name="from" defaultValue={range.from} aria-label="Od" className="field-input !w-auto !py-1.5 !text-[12px]" />
          <span className="text-ink-faint text-xs">–</span>
          <input type="date" name="to" defaultValue={range.to} aria-label="Do" className="field-input !w-auto !py-1.5 !text-[12px]" />
          <button className="btn btn-outline !px-3 !py-1.5 !text-[12px]">Prikaži</button>
        </form>
      </div>

      <div className="card !p-0 grid gap-px bg-line grid-cols-2 md:grid-cols-3 xl:grid-cols-6 mb-5 overflow-hidden">
        {kpis.map((k) => {
          const body = (
            <>
              <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint truncate">{k.label}</div>
              <div className={`font-display font-semibold text-[18px] leading-tight mt-0.5 ${k.tone === 'brick' ? 'text-brick' : k.tone === 'sage' ? 'text-sage-dark' : 'text-navy-950'}`}>{k.value}</div>
              <div className="text-[11px] text-ink-soft truncate">{k.sub}</div>
            </>
          );
          return k.href ? <Link key={k.label} href={k.href} className="bg-white px-4 py-3 row-link hover:bg-cream">{body}</Link> : <div key={k.label} className="bg-white px-4 py-3">{body}</div>;
        })}
      </div>

      <Table title="Po mesecima" exportHref={exportHref('months')}
        head={['Mesec', 'Zaduženo', 'Uplaćeno', 'Troškovi', 'Isplaćeno', 'Neto']}
        rows={rep.byMonth.map((m) => [m.label, formatRsd(m.charged), formatRsd(m.paidIn), formatRsd(m.costs), formatRsd(m.paidOut), <span key="n" className={m.net < 0 ? 'text-brick' : 'text-sage-dark'}>{formatRsd(m.net)}</span>])}
        foot={['Ukupno', formatRsd(t.charged), formatRsd(t.paidIn), formatRsd(t.costs), formatRsd(t.paidOut), formatRsd(t.net)]}
        empty="Nema prometa u izabranom periodu." />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 mb-5">
        <Table title="Troškovi po kategoriji" exportHref={exportHref('categories')} className="!mb-0"
          head={['Kategorija', 'Faktura', 'Ukupno', 'Plaćeno', 'Neplaćeno', 'Udeo']}
          rows={rep.byCategory.map((c) => [c.name, String(c.count), formatRsd(c.total), formatRsd(c.paid), formatRsd(c.unpaid), `${String(c.share).replace('.', ',')}%`])}
          empty="Nema troškova u izabranom periodu." />
        <DonutChart title="Struktura troškova" format={formatRsd}
          slices={rep.byCategory.map((c, i) => ({ label: c.name, value: c.total, color: CHART_COLORS[i % CHART_COLORS.length] }))}
          center={t.costs >= 1_000_000 ? `${(t.costs / 1_000_000).toFixed(1).replace('.', ',')} M` : `${Math.round(t.costs / 1000)}k`} centerSub="RSD" empty="Nema troškova." />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <Table title="Troškovi po dobavljaču" exportHref={exportHref('suppliers')} className="!mb-0"
          head={['Dobavljač', 'Faktura', 'Ukupno', 'Neplaćeno']}
          rows={rep.bySupplier.slice(0, 12).map((s) => [s.name, String(s.count), formatRsd(s.total), formatRsd(s.unpaid)])}
          empty="Nema troškova." />
        <Table title="Zaduženja i uplate po stanu" exportHref={exportHref('units')} className="!mb-0"
          head={['Stan', 'Zaduženo', 'Uplaćeno', 'Duguje']}
          rows={rep.byUnit.map((u) => [u.unit, formatRsd(u.charged), formatRsd(u.paidIn), <span key="d" className={u.diff > 0 ? 'text-gold-dark font-bold' : ''}>{formatRsd(u.diff)}</span>])}
          empty="Nema zaduženja ni uplata." />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Table title={`Uplate (${rep.inflows.length})`} exportHref={exportHref('inflows')} className="!mb-0"
          head={['Datum', 'Stan', 'Iznos', 'Napomena']}
          rows={rep.inflows.slice(-15).reverse().map((x) => [formatDate(x.date), x.unit, formatRsd(x.amount), x.reference ?? x.note ?? '—'])}
          empty="Nema uplata u periodu." note={rep.inflows.length > 15 ? 'Prikazano poslednjih 15. Ceo spisak je u izvozu.' : undefined} />
        <Table title={`Isplate (${rep.outflows.length})`} exportHref={exportHref('outflows')} className="!mb-0"
          head={['Datum', 'Dobavljač', 'Kategorija', 'Iznos']}
          rows={rep.outflows.slice(-15).reverse().map((x) => [formatDate(x.date), x.supplier, x.category, formatRsd(x.amount)])}
          empty="Nema isplata u periodu." note={rep.outflows.length > 15 ? 'Prikazano poslednjih 15. Ceo spisak je u izvozu.' : undefined} />
      </div>
    </div>
  );
}

function ExportMenu({ exportHref }: { exportHref: (k: ExportKind) => string }) {
  const items: [ExportKind, string][] = [['months', 'Po mesecima'], ['categories', 'Troškovi po kategoriji'], ['suppliers', 'Troškovi po dobavljaču'], ['units', 'Zaduženja i uplate po stanu'], ['inflows', 'Sve uplate'], ['outflows', 'Sve isplate'], ['costs', 'Sve fakture dobavljača']];
  return (
    <details className="relative">
      <summary className="btn btn-navy !px-3.5 !py-2 !text-[12.5px] list-none cursor-pointer"><Download size={15} /> Izvezi u tabelu</summary>
      <div className="absolute right-0 mt-1.5 z-20 w-[250px] bg-white border border-line rounded-[12px] shadow-soft p-1.5">
        {items.map(([k, label]) => (
          <a key={k} href={exportHref(k)} className="row-link flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold">
            <Download size={13} className="text-ink-faint" />{label}
          </a>
        ))}
        <p className="px-3 pt-1.5 pb-1 text-[10.5px] text-ink-faint">CSV fajl, otvara se u Excelu i Google Sheets.</p>
      </div>
    </details>
  );
}

function Table({ title, head, rows, foot, empty, exportHref, note, className = '' }: {
  title: string; head: string[]; rows: React.ReactNode[][]; foot?: React.ReactNode[]; empty: string; exportHref: string; note?: string; className?: string;
}) {
  return (
    <div className={`card !p-0 overflow-hidden mb-5 ${className}`}>
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h3 className="text-[13px] font-bold text-navy-950">{title}</h3>
        <a href={exportHref} className="inline-flex items-center gap-1 text-[11.5px] text-gold-dark font-semibold hover:underline"><Download size={12} /> Izvezi</a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[480px]">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wide text-ink-faint border-y border-line bg-cream/40">
              {head.map((h, i) => <th key={h} className={`px-4 py-2 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                {r.map((c, j) => <td key={j} className={`px-4 py-2 ${j === 0 ? 'font-semibold' : 'text-right font-mono whitespace-nowrap'}`}>{c}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={head.length} className="px-4 py-5 text-center text-ink-faint">{empty}</td></tr>}
          </tbody>
          {foot && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line bg-cream/40 font-bold">
                {foot.map((c, j) => <td key={j} className={`px-4 py-2 ${j === 0 ? '' : 'text-right font-mono whitespace-nowrap'}`}>{c}</td>)}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {note && <p className="px-4 py-2 text-[10.5px] text-ink-faint border-t border-line">{note}</p>}
    </div>
  );
}
