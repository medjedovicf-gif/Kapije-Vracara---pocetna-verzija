import { createClient } from '@/lib/supabase/server';
import type { Building, BuildingExpense, Invoice, InvoicePayment } from '@/lib/types';
import type { ReportData, Range } from '@/lib/finance-report';
import { presetRange } from '@/lib/finance-report';

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Period iz adrese: ?period=month|last-month|quarter|year|last-year|all ili ?from=…&to=… */
export function rangeFromParams(p: { period?: string; from?: string; to?: string }): Range & { preset: string } {
  if (isDate(p.from) && isDate(p.to) && p.from! <= p.to!) return { preset: 'custom', from: p.from!, to: p.to! };
  return presetRange(p.period);
}

/** Svi podaci zgrade potrebni za izveštaj (RLS i dalje ograničava na zgradu upravnika). */
export async function loadReportData(buildingId: string): Promise<ReportData> {
  const supabase = await createClient();
  const [{ data: building }, { data: invoices }, { data: payments }, { data: expenses }] = await Promise.all([
    supabase.from('buildings').select('id, name, opening_balance, opening_balance_date').eq('id', buildingId).maybeSingle<Pick<Building, 'id' | 'name' | 'opening_balance' | 'opening_balance_date'>>(),
    supabase.from('invoices').select('*').eq('building_id', buildingId).returns<Invoice[]>(),
    supabase.from('invoice_payments').select('*').eq('building_id', buildingId).returns<InvoicePayment[]>(),
    supabase.from('building_expenses').select('*').eq('building_id', buildingId).returns<BuildingExpense[]>(),
  ]);
  return { building: building ?? null, invoices: invoices ?? [], payments: payments ?? [], expenses: expenses ?? [] };
}
