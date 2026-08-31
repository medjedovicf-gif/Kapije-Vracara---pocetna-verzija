import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';
import { AddResidentButton, ResidentRowActions, StatusTag } from '@/components/admin/ResidentActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminResidentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meData } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  const me = meData as unknown as Profile | null;
  if (!me || me.role !== 'admin') redirect('/login');

  const { data: residents } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'resident')
    .eq('building_id', me.building_id ?? '')
    .order('unit')
    .returns<Profile[]>();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-ink-soft text-sm">Svi stanovi u vašoj zgradi.</p>
        <AddResidentButton buildingId={me.building_id ?? undefined} />
      </div>

      <div className="card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-ink-faint border-b border-line">
              <th className="pb-2.5 font-semibold">Stan</th>
              <th className="pb-2.5 font-semibold">Stanar</th>
              <th className="pb-2.5 font-semibold text-right">Stanje</th>
              <th className="pb-2.5 font-semibold">Status</th>
              <th className="pb-2.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {(residents ?? []).map((r) => (
              <tr key={r.id} className="border-b border-line last:border-none">
                <td className="py-3 font-bold">{r.unit}</td>
                <td className="py-3">{r.name}</td>
                <td className="py-3 text-right font-mono font-bold">{r.balance.toLocaleString('de-DE')} RSD</td>
                <td className="py-3"><StatusTag profileId={r.id} status={r.payment_status} /></td>
                <td className="py-3"><ResidentRowActions profileId={r.id} /></td>
              </tr>
            ))}
            {!residents?.length && (
              <tr>
                <td colSpan={5} className="py-4 text-[12.5px] text-ink-faint">Nema stanova u ovoj zgradi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
