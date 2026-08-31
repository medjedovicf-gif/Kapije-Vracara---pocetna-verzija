import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/resident/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import type { Profile } from '@/lib/types';

// Ove stranice prikazuju licne podatke ulogovanog korisnika — nikad ih ne kesiraj,
// ni na serveru ni u browseru, da se slucajno ne prikaze tudji keširan sadrzaj
// posle odjave/prijave drugog naloga u istom tabu.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');

  const { data: building } = profile.building_id
    ? await supabase.from('buildings').select('name').eq('id', profile.building_id).single<Profile>()
    : { data: null };

  const todayLabel = new Date().toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar name={profile.name} unit={profile.unit} buildingName={building?.name ?? 'Zgrada'} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-4 px-8 py-5 border-b border-line bg-cream sticky top-0 z-10">
          <div>
            <h1 className="font-display font-semibold text-[22px] text-navy-950">Resident Hub</h1>
            <div className="text-xs text-ink-soft font-mono capitalize">{todayLabel}</div>
          </div>
          <NotificationBell userId={user.id} role="resident" />
        </header>
        <main className="px-8 py-7 pb-16 max-w-[1180px]">{children}</main>
      </div>
    </div>
  );
}
