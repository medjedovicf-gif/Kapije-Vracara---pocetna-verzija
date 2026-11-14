import { redirect } from 'next/navigation';
import { CalendarClock, HardHat } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import type { BuildingExpense, PlannedWork } from '@/lib/types';
import { formatDate, formatRsd } from '@/lib/finance';
import { NewPlannedWorkButton, PlannedWorkActions } from '@/components/admin/FinanceForms';
import { MissingMigration } from '@/components/admin/MissingMigration';

export const dynamic = 'force-dynamic';

const statusTag: Record<string, string> = { Planirano: 'tag-gold', 'U toku': 'tag-sage', Završeno: 'bg-navy-950 text-white', Otkazano: 'bg-cream-2 text-ink-faint' };

export default async function PlannedWorksPage() {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const supabase = await createClient();

  const [{ data: works, error }, { data: expenses }] = await Promise.all([
    supabase.from('planned_works').select('*').eq('building_id', me.building_id).order('planned_date', { ascending: true, nullsFirst: false }).returns<PlannedWork[]>(),
    supabase.from('building_expenses').select('planned_work_id, amount').eq('building_id', me.building_id).gt('planned_work_id', 0).returns<Pick<BuildingExpense, 'planned_work_id' | 'amount'>[]>(),
  ]);
  if (error) return <MissingMigration what="Planirani radovi" />;

  const spent = new Map<number, number>();
  (expenses ?? []).forEach((e) => { if (e.planned_work_id) spent.set(e.planned_work_id, (spent.get(e.planned_work_id) ?? 0) + Number(e.amount)); });

  const all = works ?? [];
  const open = all.filter((w) => w.status === 'Planirano' || w.status === 'U toku');
  const done = all.filter((w) => w.status === 'Završeno' || w.status === 'Otkazano');
  const budget = open.reduce((a, w) => a + Number(w.estimated_cost), 0);
  const todayIso = new Date().toISOString().slice(0, 10);
  const next90 = new Date(); next90.setDate(next90.getDate() + 90);
  const soon = open.filter((w) => w.planned_date && w.planned_date <= next90.toISOString().slice(0, 10));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-ink-soft text-sm">Plan radova i očekivanih troškova. Stanari vide planirane radove svoje zgrade.</p>
        <NewPlannedWorkButton />
      </div>

      <div className="card !p-0 grid grid-cols-3 divide-x divide-line mb-5 overflow-hidden">
        <Kpi label="Aktivni radovi" value={String(open.length)} />
        <Kpi label="Narednih 90 dana" value={String(soon.length)} />
        <Kpi label="Planirani budžet" value={formatRsd(budget)} />
      </div>

      <Section title="Planirano i u toku" works={open} spent={spent} todayIso={todayIso}
        empty="Nema planiranih radova. Dodajte prvi preko dugmeta „Planiraj rad“." />
      {done.length > 0 && <Section title="Završeno i otkazano" works={done} spent={spent} todayIso={todayIso} empty="" muted />}
    </div>
  );
}

function Section({ title, works, spent, todayIso, empty, muted }: { title: string; works: PlannedWork[]; spent: Map<number, number>; todayIso: string; empty: string; muted?: boolean }) {
  return (
    <div className={`card !p-0 overflow-hidden mb-5 ${muted ? 'opacity-90' : ''}`}>
      <h2 className="px-4 pt-3.5 pb-2 text-[13px] font-bold text-navy-950">{title} <span className="text-ink-faint font-normal">({works.length})</span></h2>
      {works.map((w) => {
        const actual = spent.get(w.id) ?? 0;
        const late = (w.status === 'Planirano') && w.planned_date && w.planned_date < todayIso;
        const pct = Number(w.estimated_cost) > 0 ? Math.min(100, Math.round((actual / Number(w.estimated_cost)) * 100)) : 0;
        return (
          <div key={w.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 border-t border-line">
            <div className="w-9 h-9 rounded-[10px] bg-cream-2 flex items-center justify-center shrink-0"><HardHat size={16} className="text-navy-950" /></div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13.5px]">{w.title}</span>
                <span className={`tag ${statusTag[w.status] ?? 'tag-gold'}`}>{w.status}</span>
              </div>
              <div className="text-[11.5px] text-ink-soft mt-0.5 flex flex-wrap gap-x-3">
                <span className={`inline-flex items-center gap-1 ${late ? 'text-brick font-semibold' : ''}`}><CalendarClock size={12} />{formatDate(w.planned_date)}{late ? ' · kasni' : ''}</span>
                <span>{w.category}</span>
                {w.contractor && <span>{w.contractor}</span>}
              </div>
              {w.description && <p className="text-[12px] text-ink-soft mt-1 line-clamp-2">{w.description}</p>}
            </div>
            <div className="w-[170px] shrink-0 text-right">
              <div className="font-mono text-[12.5px] font-bold">{formatRsd(Number(w.estimated_cost))}</div>
              <div className="text-[10.5px] text-ink-faint">{actual > 0 ? `plaćeno ${formatRsd(actual)}` : 'procena'}</div>
              {actual > 0 && Number(w.estimated_cost) > 0 && (
                <div className="h-1.5 bg-cream-2 rounded-full mt-1 overflow-hidden"><div className={`h-full ${actual > Number(w.estimated_cost) ? 'bg-brick' : 'bg-sage'}`} style={{ width: `${pct}%` }} /></div>
              )}
            </div>
            <PlannedWorkActions id={w.id} status={w.status} title={w.title} />
          </div>
        );
      })}
      {!works.length && <p className="px-4 py-6 text-[13px] text-ink-soft border-t border-line">{empty}</p>}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="font-display font-semibold text-[18px] mt-0.5 text-navy-950">{value}</div>
    </div>
  );
}
