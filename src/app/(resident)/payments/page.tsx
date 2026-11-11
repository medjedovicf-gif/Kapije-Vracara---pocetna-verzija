import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreditCard, Receipt, CheckCircle2, Clock } from 'lucide-react';
import type { Profile, Invoice } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('unit', profile.unit ?? '')
    .eq('building_id', profile.building_id ?? '')
    .order('created_at', { ascending: false })
    .returns<Invoice[]>();

  return (
    <div>
      <p className="text-ink-soft text-sm mb-6 max-w-md">
        Pratite stanje i istoriju plaćanja za stan {profile.unit}.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.4fr] gap-5 items-start">
        <div className="rounded-lg bg-gradient-to-br from-navy-950 to-navy-800 text-white p-6">
          <div className="text-xs text-white/60">Trenutno stanje</div>
          <div className="font-display font-semibold text-[34px] mt-1.5">
            {profile.balance.toLocaleString('de-DE')} <span className="text-base font-medium">RSD</span>
          </div>
          <div className="text-xs text-gold mb-5">{profile.payment_status}</div>
          <button className="btn btn-gold w-full">
            <CreditCard size={16} />
            Plati odmah
          </button>
        </div>

        <div className="card">
          <p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mb-3">Istorija faktura</p>
          {!invoices?.length && (
            <p className="text-[12.5px] text-ink-soft">Još uvek nema faktura za ovaj stan.</p>
          )}
          {!!invoices?.length && (
            <div className="overflow-x-auto"><table className="min-w-[640px] w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-ink-faint border-b border-line">
                  <th className="pb-2.5 font-semibold">Stavka</th>
                  <th className="pb-2.5 font-semibold text-right">Iznos</th>
                  <th className="pb-2.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-line last:border-none">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[9px] bg-cream-2 flex items-center justify-center shrink-0">
                          <Receipt size={14} className="text-navy-950" />
                        </div>
                        <div>
                          <div className="font-semibold">{inv.month}</div>
                          <div className="text-[11px] text-ink-faint">{new Date(inv.created_at).toLocaleDateString('sr-RS')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold">{inv.amount.toLocaleString('de-DE')} RSD</td>
                    <td className="py-3 text-right">
                      <span className="tag tag-sage inline-flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
