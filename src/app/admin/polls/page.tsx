import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, Poll, PollOption } from '@/lib/types';
import { NewPollButton, PollCardActions } from '@/components/admin/PollControls';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPollsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || me.role !== 'admin') redirect('/login');

  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .eq('building_id', me.building_id ?? '')
    .order('created_at', { ascending: false })
    .returns<Poll[]>();

  const pollIds = (polls ?? []).map((p) => p.id);
  const { data: allOptions } = pollIds.length
    ? await supabase.from('poll_options').select('*').in('poll_id', pollIds).returns<PollOption[]>()
    : { data: [] as PollOption[] };

  const optionsByPoll = new Map<number, PollOption[]>();
  (allOptions ?? []).forEach((o) => {
    const arr = optionsByPoll.get(o.poll_id) ?? [];
    arr.push(o);
    optionsByPoll.set(o.poll_id, arr);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-ink-soft text-sm">Ankete i glasanja za vašu zgradu.</p>
        <NewPollButton />
      </div>

      {!polls?.length && <p className="text-[12.5px] text-ink-soft">Još uvek nema anketa za vašu zgradu.</p>}

      {(polls ?? []).map((p) => {
        const opts = optionsByPoll.get(p.id) ?? [];
        const total = opts.reduce((a, o) => a + o.votes, 0) || 1;
        return (
          <div key={p.id} className="card mb-3.5">
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="font-bold text-[14.5px]">{p.title}</div>
                <div className="text-xs text-ink-soft mt-0.5">{p.description}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`tag ${p.status === 'active' ? 'tag-sage' : 'tag-brick'}`}>
                  {p.status === 'active' ? 'Aktivna' : 'Zatvorena'}
                </span>
                <PollCardActions pollId={p.id} status={p.status} />
              </div>
            </div>
            {opts.map((o) => {
              const pct = Math.round((o.votes / total) * 100);
              return (
                <div key={o.id} className="mb-2.5 last:mb-0">
                  <div className="flex justify-between text-[12.5px] mb-1">
                    <span className="font-semibold">{o.label}</span>
                    <span className="font-mono text-ink-soft">{o.votes} glasova · {pct}%</span>
                  </div>
                  <div className="h-[7px] bg-cream-2 rounded-full overflow-hidden">
                    <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
