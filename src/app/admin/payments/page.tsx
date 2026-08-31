import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { SendInvoiceButton } from '@/components/admin/SendInvoiceButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || me.role !== 'admin') redirect('/login');

  const { data: residents } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'resident')
    .eq('building_id', me.building_id ?? '')
    .order('unit')
    .returns<Profile[]>();

  const paid = (residents ?? []).filter((r) => r.payment_status === 'Plaćeno').reduce((a, r) => a + r.balance, 0);
  const pending = (residents ?? []).filter((r) => r.payment_status !== 'Plaćeno').reduce((a, r) => a + r.balance, 0);

  return (
    <div>
      <p className="text-ink-soft text-sm mb-6">Stanje uplata po stanovima i slanje faktura.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-cream-2 flex items-center justify-center mb-2.5">
            <CheckCircle2 size={16} className="text-navy-950" />
          </div>
          <div className="font-display font-semibold text-[22px]">{paid.toLocaleString('de-DE')}</div>
          <div className="text-[11.5px] text-ink-soft">RSD naplaćeno</div>
        </div>
        <div className="card">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-cream-2 flex items-center justify-center mb-2.5">
            <Clock size={16} className="text-navy-950" />
          </div>
          <div className="font-display font-semibold text-[22px]">{pending.toLocaleString('de-DE')}</div>
          <div className="text-[11.5px] text-ink-soft">RSD na čekanju</div>
        </div>
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
                <td className="py-3">
                  <span className={`tag ${r.payment_status === 'Plaćeno' ? 'tag-sage' : 'tag-gold'}`}>{r.payment_status}</span>
                </td>
                <td className="py-3">
                  <SendInvoiceButton unit={r.unit ?? ''} buildingId={r.building_id ?? ''} amount={r.balance} />
                </td>
              </tr>
            ))}
            {!residents?.length && (
              <tr><td colSpan={5} className="py-4 text-[12.5px] text-ink-faint">Nema stanova u ovoj zgradi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
