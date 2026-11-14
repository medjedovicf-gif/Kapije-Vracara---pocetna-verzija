import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import type { BuildingExpense, PlannedWork } from '@/lib/types';
import { formatDate, formatRsd } from '@/lib/finance';
import { ExpenseRowActions, NewExpenseButton } from '@/components/admin/FinanceForms';
import { MissingMigration } from '@/components/admin/MissingMigration';

export const dynamic = 'force-dynamic';

export default async function AdminExpensesPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const { status, category } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows, error }, { data: works }] = await Promise.all([
    supabase.from('building_expenses').select('*').eq('building_id', me.building_id).order('issue_date', { ascending: false }).order('id', { ascending: false }).returns<BuildingExpense[]>(),
    supabase.from('planned_works').select('id, title, status').eq('building_id', me.building_id).neq('status', 'Otkazano').order('planned_date').returns<Pick<PlannedWork, 'id' | 'title' | 'status'>[]>(),
  ]);
  if (error) return <MissingMigration what="Fakture i troškovi" />;

  const all = rows ?? [];
  const list = all.filter((e) => (!status || e.status === status) && (!category || e.category === category));
  const paths = list.map((e) => e.file_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length ? await supabase.storage.from('expense-files').createSignedUrls(paths, 60 * 60) : { data: [] };
  const fileUrl = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const yearKey = String(now.getFullYear());
  const sum = (xs: BuildingExpense[]) => xs.reduce((a, e) => a + Number(e.amount), 0);
  const unpaid = all.filter((e) => e.status === 'Neplaćeno');
  const overdue = unpaid.filter((e) => e.due_date && e.due_date < now.toISOString().slice(0, 10));
  const categories = Array.from(new Set(all.map((e) => e.category))).sort();
  const qs = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ status, category, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return `/admin/expenses${s ? `?${s}` : ''}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-ink-soft text-sm">Ulazne fakture dobavljača i troškovi zgrade.</p>
        <NewExpenseButton plannedWorks={(works ?? []).filter((w) => w.status !== 'Završeno')} />
      </div>

      <div className="card !p-0 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line mb-5 overflow-hidden">
        <Kpi label="Ovaj mesec" value={formatRsd(sum(all.filter((e) => e.issue_date.startsWith(monthKey))))} />
        <Kpi label={`Ukupno ${yearKey}.`} value={formatRsd(sum(all.filter((e) => e.issue_date.startsWith(yearKey))))} />
        <Kpi label="Neplaćeno" value={formatRsd(sum(unpaid))} sub={`${unpaid.length} faktura`} tone={unpaid.length ? 'gold' : undefined} />
        <Kpi label="Istekao rok" value={String(overdue.length)} sub={overdue.length ? formatRsd(sum(overdue)) : 'sve u roku'} tone={overdue.length ? 'brick' : undefined} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[undefined, 'Neplaćeno', 'Plaćeno'].map((s) => (
          <Link key={s ?? 'all'} href={qs({ status: s ?? '' })} className={`tag !text-[10.5px] ${status === s || (!status && !s) ? '!bg-navy-950 !text-white' : 'bg-white border border-line text-ink-soft'}`}>{s ?? 'Sve'}</Link>
        ))}
        {categories.length > 1 && <span className="w-px bg-line mx-1" />}
        {categories.length > 1 && categories.map((c) => (
          <Link key={c} href={qs({ category: category === c ? '' : c })} className={`tag !text-[10.5px] ${category === c ? '!bg-sage !text-white' : 'bg-white border border-line text-ink-soft'}`}>{c}</Link>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-[13px]">
            <thead>
              <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-ink-faint border-b border-line bg-cream/40">
                <th className="px-4 py-2.5 font-semibold">Datum</th>
                <th className="px-4 py-2.5 font-semibold">Dobavljač</th>
                <th className="px-4 py-2.5 font-semibold">Kategorija</th>
                <th className="px-4 py-2.5 font-semibold text-right">Iznos</th>
                <th className="px-4 py-2.5 font-semibold">Rok</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const url = e.file_path ? fileUrl.get(e.file_path) : undefined;
                const late = e.status === 'Neplaćeno' && e.due_date && e.due_date < now.toISOString().slice(0, 10);
                return (
                  <tr key={e.id} className="border-b border-line last:border-0 align-middle">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(e.issue_date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold flex items-center gap-1.5">
                        {e.supplier}
                        {url && <a href={url} target="_blank" rel="noreferrer" title="Otvori učitanu fakturu" className="text-gold-dark hover:text-navy-950"><Paperclip size={13} /></a>}
                      </div>
                      <div className="text-[11px] text-ink-faint truncate max-w-[260px]">{[e.invoice_number && `br. ${e.invoice_number}`, e.description].filter(Boolean).join(' · ') || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">{formatRsd(Number(e.amount))}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${late ? 'text-brick font-semibold' : 'text-ink-soft'}`}>{formatDate(e.due_date)}</td>
                    <td className="px-4 py-3"><span className={`tag ${e.status === 'Plaćeno' ? 'tag-sage' : late ? 'tag-brick' : 'tag-gold'}`}>{late ? 'Kasni' : e.status}</span></td>
                    <td className="px-4 py-3"><ExpenseRowActions id={e.id} status={e.status} label={e.supplier} /></td>
                  </tr>
                );
              })}
              {!list.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center">
                  <FileText size={22} className="mx-auto text-ink-faint mb-2" />
                  <p className="text-[13px] text-ink-soft">{all.length ? 'Nema faktura za izabrani filter.' : 'Još nema unetih faktura. Dodajte prvu preko dugmeta „Nova faktura“.'}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'gold' | 'brick' }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`font-display font-semibold text-[18px] mt-0.5 ${tone === 'brick' ? 'text-brick' : tone === 'gold' ? 'text-gold-dark' : 'text-navy-950'}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-soft">{sub}</div>}
    </div>
  );
}
