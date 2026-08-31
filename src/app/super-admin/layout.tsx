import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  const profile = data as unknown as Profile | null;
  if (!profile || profile.role !== 'superadmin') redirect('/login');
  return <div className="flex min-h-screen"><SuperAdminSidebar name={profile.name}/><div className="flex-1 min-w-0"><header className="flex items-center justify-between px-8 py-5 border-b border-line bg-cream sticky top-0 z-10"><div><h1 className="font-display font-semibold text-[22px] text-navy-950">Super Admin</h1><div className="text-xs text-ink-soft font-mono">Centralna uprava platforme</div></div><NotificationBell userId={user.id} role="superadmin"/></header><main className="px-8 py-7 pb-16 max-w-[1180px]">{children}</main></div></div>;
}
