import { createClient } from '@/lib/supabase/server';
import { BuildingManager } from '@/components/admin/SuperAdminManagers';
import type { Building } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('buildings').select('*').order('name').returns<Building[]>();
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Zgrade</h2><p className="text-ink-soft text-sm mt-1">Dodajte zgrade i menjajte njihove nazive. Adminima se zgrada dodeljuje u Korisnici.</p></div><BuildingManager buildings={data ?? []} /></div>;
}
