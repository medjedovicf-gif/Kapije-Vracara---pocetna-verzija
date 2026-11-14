import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Receipt, CheckCircle2, Clock } from 'lucide-react';
import type { Profile, Invoice } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { PayInvoiceButton } from '@/components/resident/PayInvoiceButton';
import type { BillingSettings } from '@/lib/ips';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PaymentsPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const profile = await getMyProfile();
  if (!profile) redirect('/login');

  const [{ data: invoices }, { data: billing }] = await Promise.all([
    supabase
    .from('invoices')
    .select('*')
    .eq('unit', profile.unit ?? '')
    .eq('building_id', profile.building_id ?? '')
    .order('created_at', { ascending: false })
    .returns<Invoice[]>(),
    supabase.from('building_billing_settings').select('*').eq('building_id', profile.building_id ?? '').maybeSingle<BillingSettings>(),
  ]);
  const payable = (inv: Invoice) => inv.status !== 'Plaćena';
  const firstUnpaid = (invoices ?? []).filter(payable).at(-1) ?? null;
  const billingReady = billing && billing.payee_name && billing.bank_account ? billing : null;

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
          <PayInvoiceButton variant="hero" invoice={firstUnpaid} billing={billingReady} />
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
                          <div className="text-[11px] text-ink-faint">{formatDateTime(inv.created_at)}</div>
                          {!!inv.line_items?.length && (
                            <ul className="mt-1 space-y-0.5">
                              {inv.line_items.map((x, i) => (
                                <li key={i} className="text-[11.5px] text-ink-soft">{x.label}: <span className="font-mono">{Number(x.amount).toLocaleString('de-DE')} RSD</span></li>
                              ))}
                            </ul>
                          )}
                          {inv.description && <div className="text-[11.5px] text-ink-soft mt-0.5 whitespace-pre-line">{inv.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold">{inv.amount.toLocaleString('de-DE')} RSD</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {payable(inv) && <PayInvoiceButton invoice={inv} billing={billingReady} />}
                        <span className={`tag inline-flex items-center gap-1 ${payable(inv) ? 'tag-gold' : 'tag-sage'}`}>
                          {payable(inv) ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                          {inv.status}
                        </span>
                      </div>
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
