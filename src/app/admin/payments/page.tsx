import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import type { Invoice, Profile } from '@/lib/types';
import { SendInvoiceButton } from '@/components/admin/SendInvoiceButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const me = await getMyProfile();
  if (!me || me.role !== 'admin') redirect('/login');

  const [{ data: residents }, { data: invoices }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'resident')
      .eq('building_id', me.building_id ?? '')
      .order('unit')
      .returns<Profile[]>(),
    supabase
      .from('invoices')
      .select('*')
      .eq('building_id', me.building_id ?? '')
      .order('created_at', { ascending: false })
      .returns<Invoice[]>(),
  ]);
  const latestByUnit = new Map<string, Invoice>();
  (invoices ?? []).forEach((invoice) => {
    if (!latestByUnit.has(invoice.unit)) latestByUnit.set(invoice.unit, invoice);
  });

  const paid = (residents ?? []).filter((r) => r.payment_status === 'Plaćeno').reduce((a, r) => a + r.balance, 0);
  const pending = (residents ?? []).filter((r) => r.payment_status !== 'Plaćeno').reduce((a, r) => a + r.balance, 0);

  return (
    <div>
      <p className="text-ink-soft text-sm mb-6">Stanje uplata po stanovima i slanje faktura.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        <div className="overflow-x-auto"><table className="min-w-[860px] w-full text-[13px]">
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
                  <SendInvoiceButton resident={r} latestInvoice={r.unit ? latestByUnit.get(r.unit) : undefined} />
                </td>
              </tr>
            ))}
            {!residents?.length && (
              <tr><td colSpan={5} className="py-4 text-[12.5px] text-ink-faint">Nema stanova u ovoj zgradi.</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
