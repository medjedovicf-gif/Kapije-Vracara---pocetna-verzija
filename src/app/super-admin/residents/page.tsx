import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { SuperAdminUserManager } from '@/components/admin/SuperAdminManagers';
import type { Building, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: buildings }] = await Promise.all([supabase.from('profiles').select('*').eq('role', 'resident').order('name').returns<Profile[]>(), supabase.from('buildings').select('*').order('name').returns<Building[]>()]);
  const admin = createAdminClient(); const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((authUsers.users ?? []).map((u) => [u.id, u.email ?? '']));
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Stanari</h2><p className="text-ink-soft text-sm mt-1">Pregled i uređivanje stanara na svim zgradama.</p></div><SuperAdminUserManager users={(profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? 'Nema login emaila' }))} buildings={buildings ?? []} /></div>;
}
