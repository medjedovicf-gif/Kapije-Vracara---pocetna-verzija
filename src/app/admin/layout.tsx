import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { DashboardShell } from '@/components/DashboardShell';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  const profile = profileData as unknown as Profile | null;
  // Sigurnosna provera i ovde, ne samo u middleware-u — odbrana u dubinu.
  if (!profile || profile.role !== 'admin') redirect('/login');

  const { data: building } = profile.building_id
    ? (await supabase.from('buildings').select('name').eq('id', profile.building_id).single()) as unknown as { data: { name: string } | null }
    : { data: null };

  const todayLabel = new Date().toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <DashboardShell
      sidebar={<AdminSidebar name={profile.name} buildingName={building?.name ?? 'Zgrada'} />}
      title="Admin Dashboard"
      subtitle={todayLabel}
      actions={<NotificationBell userId={user.id} role="admin" />}
    >
      {children}
    </DashboardShell>
  );
}
