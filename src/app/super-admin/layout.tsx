import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { DashboardShell } from '@/components/DashboardShell';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  const profile = data as unknown as Profile | null;
  if (!profile || profile.role !== 'superadmin') redirect('/login');
  return (
    <DashboardShell
      sidebar={<SuperAdminSidebar name={profile.name} />}
      title="Super Admin"
      subtitle={<span className="normal-case">Centralna uprava platforme</span>}
      actions={<NotificationBell userId={user.id} role="superadmin" />}
    >
      {children}
    </DashboardShell>
  );
}
