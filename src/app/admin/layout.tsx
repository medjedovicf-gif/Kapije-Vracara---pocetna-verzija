import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { DashboardShell } from '@/components/DashboardShell';
import type { Profile } from '@/lib/types';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const profileData = await getMyProfile();
  const profile = profileData as unknown as Profile | null;
  // Sigurnosna provera i ovde, ne samo u middleware-u — odbrana u dubinu.
  if (!profile || profile.role !== 'admin') redirect('/login');

  const { data: building } = profile.building_id
    ? (await supabase.from('buildings').select('name').eq('id', profile.building_id).single()) as unknown as { data: { name: string } | null }
    : { data: null };

  const todayLabel = formatDate(new Date());

  return (
    <DashboardShell
      role="admin"
      sidebar={<AdminSidebar name={profile.name} buildingName={building?.name ?? 'Zgrada'} />}
      title="Admin Dashboard"
      subtitle={todayLabel}
      actions={<NotificationBell userId={user.id} role="admin" />}
    >
      {children}
    </DashboardShell>
  );
}
