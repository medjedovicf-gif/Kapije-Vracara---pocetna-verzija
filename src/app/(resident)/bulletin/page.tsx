import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import type { Profile, BulletinPost, Poll, PollOption } from '@/lib/types';
import { PollWidget } from '@/components/resident/PollWidget';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BulletinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');

  const { data: posts } = await supabase
    .from('bulletin_posts')
    .select('*')
    .or(`building_id.is.null,building_id.eq.${profile.building_id}`)
    .order('created_at', { ascending: false })
    .returns<BulletinPost[]>();

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('status', 'active')
    .or(`building_id.is.null,building_id.eq.${profile.building_id}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Poll>();

  let options: PollOption[] = [];
  let alreadyVoted = false;
  if (poll) {
    const { data: opts } = await supabase.from('poll_options').select('*').eq('poll_id', poll.id).returns<PollOption[]>();
    options = opts ?? [];
    const { data: myVote } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', poll.id)
      .eq('voter_id', user.id)
      .maybeSingle();
    alreadyVoted = !!myVote;
  }

  return (
    <div>
      <p className="text-ink-soft text-sm mb-6 max-w-md">Obaveštenja od administracije zgrade i platforme.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr,1fr] gap-5 items-start">
        <div>
          {!posts?.length && <p className="text-[12.5px] text-ink-soft">Trenutno nema obaveštenja.</p>}
          {(posts ?? []).map((b) => (
            <div key={b.id} className="card mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className={`tag ${b.building_id ? 'tag-gold' : 'tag-sage'}`}>
                  {b.building_id ? 'Vaša zgrada' : 'Cela platforma'}
                </span>
                <span className="text-[11px] text-ink-faint">{new Date(b.created_at).toLocaleDateString('sr-RS')}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Megaphone size={16} className="text-navy-950 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-[14.5px] mb-1">{b.title}</div>
                  <p className="text-[12.5px] text-ink-soft leading-relaxed">{b.body}</p>
                  <div className="text-[11px] text-ink-faint mt-2">— {b.author_name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {poll ? (
            <PollWidget poll={poll} options={options} alreadyVoted={alreadyVoted} />
          ) : (
            <div className="card">
              <p className="text-[12.5px] text-ink-soft">Trenutno nema aktivnih anketa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
