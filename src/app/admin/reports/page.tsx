import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BarChart3, ChevronRight, Star } from 'lucide-react';
import type { Ticket, TicketRating } from '@/lib/types';
import { priorityLabel } from '@/lib/labels';
import { formatDuration, resolutionHours, summarizeByUnit } from '@/lib/ticket-stats';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');

  const { data: tickets } = await supabase.from('tickets').select('*').eq('building_id', me.building_id).order('created_at').returns<Ticket[]>();
  const all = tickets ?? [];
  const ids = all.map((t) => t.id);
  const { data: ratingRows } = ids.length
    ? await supabase.from('ticket_ratings').select('*').in('ticket_id', ids).returns<TicketRating[]>()
    : { data: [] as TicketRating[] };
  const ratings = ratingRows ?? [];

  const resolved = all.filter((t) => t.status === 'Rešeno');
  const avgHours = resolved.length ? resolved.reduce((sum, t) => sum + resolutionHours(t), 0) / resolved.length : 0;
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
  const overdue = all.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() && t.status !== 'Rešeno').length;

  const categories = [...new Set(all.map((t) => t.category))].filter(Boolean);
  const catData = categories.map((label) => ({ label, value: all.filter((t) => t.category === label).length })).sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...catData.map((c) => c.value));
  const units = summarizeByUnit(all, ratings);

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-navy-950">Izveštaji i analitika</h2>
        <p className="text-ink-soft text-sm mt-1">Operativna statistika za vašu zgradu.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Metric value={String(all.length)} label="Ukupno problema" href="/admin/tickets" />
        <Metric value={String(resolved.length)} label="Rešeno" href="/admin/tickets?status=Re%C5%A1eno" />
        <Metric value={resolved.length ? formatDuration(avgHours) : '—'} label="Prosečno vreme rešavanja" />
        <Metric value={String(overdue)} label="Istekao rok" href="/admin/tickets?filter=overdue" />
        <Metric value={ratings.length ? `${avgRating.toFixed(1)} ★` : '—'} label={`Ocena stanara (${ratings.length})`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card">
          <h2 className="font-display text-lg font-semibold mb-4">Po kategoriji</h2>
          {catData.map((x) => (
            <div key={x.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span>{x.label}</span><span className="font-mono">{x.value}</span></div>
              <div className="h-2 bg-cream-2 rounded-full"><div className="h-full bg-sage rounded-full" style={{ width: `${(x.value / max) * 100}%` }} /></div>
            </div>
          ))}
          {!catData.length && <p className="text-sm text-ink-soft">Nema podataka.</p>}
        </div>
        <div className="card">
          <h2 className="font-display text-lg font-semibold mb-4">Po prioritetu</h2>
          {['Critical', 'High', 'Medium', 'Low'].map((p) => (
            <Link key={p} href={`/admin/tickets?priority=${p}`} className="row-link flex justify-between py-3 -mx-2 px-2 rounded-lg border-b border-line last:border-0 text-sm">
              <span>{priorityLabel(p)}</span><span className="font-mono">{all.filter((t) => t.priority === p).length}</span>
            </Link>
          ))}
          <div className="flex items-center gap-2 text-xs text-ink-soft mt-5"><BarChart3 size={15} />Podaci se računaju iz problema u realnom vremenu.</div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="font-display text-lg font-semibold">Po stanu</h2>
          <p className="text-xs text-ink-soft mt-0.5">Istorija problema po stanu. Klik otvara probleme tog stana.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-y border-line">
                <th className="py-2.5 pl-5">Stan</th><th>Ukupno</th><th>Otvoreno</th><th>Rešeno</th><th>Prosečno rešavanje</th><th>Ocena</th><th className="pr-5" />
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.unit} className="border-b border-line last:border-0">
                  <td className="py-2.5 pl-5 font-semibold"><Link href={`/admin/tickets?q=${encodeURIComponent(u.unit)}`} className="hover:text-gold-dark">Stan {u.unit}</Link></td>
                  <td className="font-mono">{u.total}</td>
                  <td className={`font-mono ${u.open ? 'text-gold-dark font-semibold' : ''}`}>{u.open}</td>
                  <td className="font-mono">{u.resolved}</td>
                  <td>{u.avgHours !== null ? formatDuration(u.avgHours) : '—'}</td>
                  <td>{u.avgRating !== null ? <span className="inline-flex items-center gap-1"><Star size={12} className="text-gold fill-gold" />{u.avgRating.toFixed(1)}</span> : '—'}</td>
                  <td className="pr-5 text-right"><Link href={`/admin/tickets?q=${encodeURIComponent(u.unit)}`} aria-label={`Problemi stana ${u.unit}`} className="inline-flex text-ink-faint hover:text-navy-950"><ChevronRight size={16} /></Link></td>
                </tr>
              ))}
              {!units.length && <tr><td colSpan={7} className="py-6 text-center text-ink-faint">Nema podataka.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label, href }: { value: string; label: string; href?: string }) {
  const body = <><div className="font-display text-2xl font-semibold">{value}</div><div className="text-xs text-ink-soft">{label}</div></>;
  return href ? <Link href={href} className="card card-link">{body}</Link> : <div className="card">{body}</div>;
}
