import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { SuperAdminUserManager, PermissionManager } from '@/components/admin/SuperAdminManagers';
import type { Building, PermissionRow, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: buildings }, { data: permissions }] = await Promise.all([
    supabase.from('profiles').select('*').order('name').returns<Profile[]>(),
    supabase.from('buildings').select('*').order('name').returns<Building[]>(),
    supabase.from('permissions').select('*').order('key').returns<PermissionRow[]>(),
  ]);
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((authUsers.users ?? []).map((u) => [u.id, u.email ?? '']));
  const users = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? 'Nema login emaila' }));
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Korisnici i dozvole</h2><p className="text-ink-soft text-sm mt-1">Dodavanje admina i stanara, promena zgrade, uloge, emaila i lozinke.</p></div><SuperAdminUserManager users={users} buildings={buildings ?? []} /><div className="mt-5"><PermissionManager permissions={permissions ?? []} /></div></div>;
}
