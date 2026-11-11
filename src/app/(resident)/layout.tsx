import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/resident/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { DashboardShell } from '@/components/DashboardShell';
import type { Profile } from '@/lib/types';

// Ove stranice prikazuju licne podatke ulogovanog korisnika — nikad ih ne kesiraj,
// ni na serveru ni u browseru, da se slucajno ne prikaze tudji keširan sadrzaj
// posle odjave/prijave drugog naloga u istom tabu.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getSessionUser();

  if (!user) redirect('/login');

  const profile = await getMyProfile();
  if (!profile) redirect('/login');

  const { data: building } = profile.building_id
    ? await supabase.from('buildings').select('name').eq('id', profile.building_id).single<Profile>()
    : { data: null };

  const todayLabel = new Date().toLocaleDateString('sr-Latn-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <DashboardShell
      role="resident"
      sidebar={<Sidebar name={profile.name} unit={profile.unit} buildingName={building?.name ?? 'Zgrada'} />}
      title="Resident Hub"
      subtitle={todayLabel}
      actions={<NotificationBell userId={user.id} role="resident" />}
    >
      {children}
    </DashboardShell>
  );
}
