import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, BulletinPost } from '@/lib/types';
import { NewBulletinButton, DeleteBulletinButton } from '@/components/admin/BulletinControls';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminBulletinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || me.role !== 'admin') redirect('/login');

  const { data: posts } = await supabase
    .from('bulletin_posts')
    .select('*')
    .eq('building_id', me.building_id ?? '')
    .order('created_at', { ascending: false })
    .returns<BulletinPost[]>();

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <p className="text-ink-soft text-sm">Obaveštenja vidljiva svim stanarima vaše zgrade.</p>
        <NewBulletinButton />
      </div>

      {!posts?.length && <p className="text-[12.5px] text-ink-soft">Još uvek nema obaveštenja.</p>}
      {(posts ?? []).map((b) => (
        <div key={b.id} className="card mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-ink-faint">
              {new Date(b.created_at).toLocaleDateString('sr-RS')} · {b.author_name}
            </span>
            <DeleteBulletinButton postId={b.id} />
          </div>
          <div className="font-bold text-[14.5px] mb-1">{b.title}</div>
          <p className="text-[12.5px] text-ink-soft leading-relaxed">{b.body}</p>
        </div>
      ))}
    </div>
  );
}
