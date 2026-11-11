import { createClient } from '@/lib/supabase/server';
import { NewPollButton, PollCardActions } from '@/components/admin/PollControls';
import type { Building, Poll, PollOption } from '@/lib/types';

/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function Page() {
  const supabase = await createClient();
  const [{ data: polls }, { data: buildings }] = await Promise.all([supabase.from('polls').select('*').order('created_at', { ascending: false }).returns<Poll[]>(), supabase.from('buildings').select('*').order('name').returns<Building[]>()]);
  const ids = (polls ?? []).map((p) => p.id);
  const { data: options } = ids.length ? await supabase.from('poll_options').select('*').in('poll_id', ids).returns<PollOption[]>() : { data: [] as PollOption[] };
  const byPoll = new Map<number, PollOption[]>(); (options ?? []).forEach((o) => byPoll.set(o.poll_id, [...(byPoll.get(o.poll_id) ?? []), o]));
  return <div><div className="flex flex-wrap gap-3 justify-between items-center mb-5"><div><h2 className="font-display text-2xl font-semibold text-navy-950">Ankete i rezultati</h2><p className="text-ink-soft text-sm mt-1">Kreiranje anketa za bilo koju zgradu i pregled glasova.</p></div><NewPollButton buildings={buildings ?? []} /></div>{(polls ?? []).map((p) => { const opts = byPoll.get(p.id) ?? []; const total = opts.reduce((sum, o) => sum + o.votes, 0); return <div className="card mb-3.5" key={p.id}><div className="flex justify-between items-start mb-3"><div className="flex gap-3 min-w-0">{(p.hero_image_url || p.image_url) && <img src={p.hero_image_url || p.image_url || ''} alt="" className="w-16 h-12 object-cover rounded-md border border-line shrink-0" />}<div className="min-w-0"><div className="font-bold text-[15px]">{p.title}</div><div className="text-xs text-ink-soft">{p.building_id ? buildings?.find((b) => b.id === p.building_id)?.name : 'Cela platforma'} · {p.status === 'active' ? 'Aktivna' : 'Zatvorena'}</div></div></div><PollCardActions pollId={p.id} status={p.status} /></div>{opts.map((o) => <div className="mb-2" key={o.id}><div className="flex justify-between text-xs mb-1"><span className="font-semibold">{o.label}</span><span className="font-mono text-ink-soft">{o.votes} glasova · {total ? Math.round(o.votes / total * 100) : 0}%</span></div><div className="h-2 bg-cream-2 rounded-full overflow-hidden"><div className="h-full bg-sage" style={{ width: `${total ? o.votes / total * 100 : 0}%` }} /></div></div>)}{!opts.length && <p className="text-xs text-ink-faint">Nema opcija.</p>}<div className="text-[11px] text-ink-soft mt-3">Ukupno glasova: {total}</div></div>; })}{!polls?.length && <p className="text-sm text-ink-soft">Još uvek nema anketa.</p>}</div>;
}
