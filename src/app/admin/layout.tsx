import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
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
    <div className="flex min-h-screen">
      <AdminSidebar name={profile.name} buildingName={building?.name ?? 'Zgrada'} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-4 px-8 py-5 border-b border-line bg-cream sticky top-0 z-10">
          <div>
            <h1 className="font-display font-semibold text-[22px] text-navy-950">Admin Dashboard</h1>
            <div className="text-xs text-ink-soft font-mono capitalize">{todayLabel}</div>
          </div>
          <NotificationBell userId={user.id} role="admin" />
        </header>
        <main className="px-8 py-7 pb-16 max-w-[1180px]">{children}</main>
      </div>
    </div>
  );
}
