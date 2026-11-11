import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { DashboardShell } from '@/components/DashboardShell';

export const dynamic = 'force-dynamic';
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const profile = await getMyProfile();
  if (!profile || profile.role !== 'superadmin') redirect('/login');
  return (
    <DashboardShell
      role="superadmin"
      sidebar={<SuperAdminSidebar name={profile.name} />}
      title="Super Admin"
      subtitle={<span className="normal-case">Centralna uprava platforme</span>}
      actions={<NotificationBell userId={user.id} role="superadmin" />}
    >
      {children}
    </DashboardShell>
  );
}
