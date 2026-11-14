'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMyProfile } from '@/lib/session';
import { createNotifications } from '@/lib/notifications';
import { normalizeAccount, periodLabel } from '@/lib/ips';

type Result = { error?: string; success?: boolean; created?: number; skipped?: string[] };

async function requireManager() {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) return { error: 'Nemate ovlašćenje.' } as const;
  const supabase = await createClient();
  return { supabase, me, buildingId: me.building_id } as const;
}

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

export async function saveBillingSettings(formData: FormData): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { supabase, me, buildingId } = ctx;

  const payeeName = text(formData, 'payee_name');
  const rawAccount = text(formData, 'bank_account');
  const account = normalizeAccount(rawAccount);
  const paymentCode = text(formData, 'payment_code') || '289';
  const defaultAmount = Number(text(formData, 'default_amount').replace(',', '.') || 0);
  const dueDay = Math.round(Number(text(formData, 'due_day') || 15));

  if (!payeeName) return { error: 'Unesite naziv primaoca (npr. Stambena zajednica …).' };
  if (!account) return { error: 'Broj računa nije ispravan. Primer zapisa: 160-5100000000-04 (18 cifara sa kontrolnim brojem).' };
  if (!/^\d{3}$/.test(paymentCode)) return { error: 'Šifra plaćanja ima tri cifre (npr. 289).' };
  if (!Number.isFinite(defaultAmount) || defaultAmount < 0) return { error: 'Podrazumevani iznos nije ispravan.' };
  if (!(dueDay >= 1 && dueDay <= 28)) return { error: 'Dan roka plaćanja mora biti između 1 i 28.' };

  const { error } = await supabase.from('building_billing_settings').upsert({
    building_id: buildingId,
    payee_name: payeeName.slice(0, 70),
    payee_address: text(formData, 'payee_address').slice(0, 70) || null,
    bank_account: account,
    payment_code: paymentCode,
    purpose: (text(formData, 'purpose') || 'Održavanje zgrade').slice(0, 35),
    default_amount: defaultAmount,
    due_day: dueDay,
    updated_by: me.id,
    updated_at: new Date().toISOString(),
  } as never);
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'billing.settings_updated', entity_type: 'building', entity_id: buildingId, summary: 'Izmenjena podešavanja uplate (račun, primalac, iznos).' } as never);
  revalidatePath('/admin/payments');
  revalidatePath('/payments');
  return { success: true };
}

/** Mesečno zaduženje: po jedna faktura za svaki izabrani stan, za obračunski mesec. */
export async function createMonthlyCharges(input: { period: string; dueDate: string; label: string; rows: { unit: string; amount: number; recipient: string }[] }): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { supabase, me, buildingId } = ctx;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) return { error: 'Izaberite obračunski mesec.' };
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { error: 'Rok plaćanja nije ispravan.' };
  const label = (input.label || 'Održavanje zgrade').trim().slice(0, 120);

  const rows = input.rows
    .map((r) => ({ unit: String(r.unit).trim(), amount: Math.round(Number(r.amount) * 100) / 100, recipient: String(r.recipient ?? '').trim() }))
    .filter((r) => r.unit && Number.isFinite(r.amount) && r.amount > 0);
  if (!rows.length) return { error: 'Nijedan stan nema iznos veći od nule.' };

  // Stanovi koji već imaju zaduženje za ovaj mesec se preskaču.
  const { data: existing, error: existingError } = await supabase.from('invoices').select('unit').eq('building_id', buildingId).eq('period', input.period);
  if (existingError) return { error: existingError.message };
  const already = new Set((existing ?? []).map((x: { unit: string }) => x.unit));
  const todo = rows.filter((r) => !already.has(r.unit));
  const skipped = rows.filter((r) => already.has(r.unit)).map((r) => r.unit);
  if (!todo.length) return { error: 'Svi izabrani stanovi već imaju zaduženje za ovaj mesec.', skipped };

  const month = periodLabel(input.period);
  const { error } = await supabase.from('invoices').insert(
    todo.map((r) => ({
      unit: r.unit,
      building_id: buildingId,
      amount: r.amount,
      month,
      period: input.period,
      status: 'Poslata',
      from_email: 'uprava@kapijevracara.rs',
      recipient_name: r.recipient || null,
      due_date: input.dueDate || null,
      line_items: [{ label: `${label} · ${month}`, amount: r.amount }],
    })) as never,
  );
  if (error) return { error: error.code === '23505' ? 'Neki stan je u međuvremenu već zadužen za ovaj mesec. Osvežite stranicu i pokušajte ponovo.' : error.message };

  // Dug stanara raste za iznos zaduženja.
  const admin = createAdminClient();
  const { data: residents } = await admin.from('profiles').select('id, unit, balance').eq('role', 'resident').eq('building_id', buildingId).in('unit', todo.map((r) => r.unit));
  const byUnit = new Map(todo.map((r) => [r.unit, r.amount]));
  const updatedUnits = new Set<string>();
  for (const res of (residents ?? []) as { id: string; unit: string; balance: number }[]) {
    if (updatedUnits.has(res.unit)) continue; // više naloga u istom stanu: dug se vodi jednom po stanu
    updatedUnits.add(res.unit);
    const add = byUnit.get(res.unit) ?? 0;
    await supabase.from('profiles').update({ balance: Number(res.balance || 0) + add, payment_status: 'Na čekanju' } as never).eq('role', 'resident').eq('building_id', buildingId).eq('unit', res.unit);
  }

  for (const r of todo) {
    const ids = ((residents ?? []) as { id: string; unit: string }[]).filter((x) => x.unit === r.unit).map((x) => x.id);
    if (ids.length) await createNotifications({ recipientIds: ids, type: 'invoice.created', icon: 'receipt', title: 'Nova uplatnica', sub: `${r.amount.toLocaleString('de-DE')} RSD · ${month}`, target: '/payments' });
  }

  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'invoice.monthly_charge', entity_type: 'building', entity_id: buildingId, summary: `Mesečno zaduženje za ${month}: ${todo.length} stanova, ukupno ${todo.reduce((a, r) => a + r.amount, 0).toLocaleString('de-DE')} RSD.` } as never);

  revalidatePath('/admin/payments');
  revalidatePath('/admin');
  revalidatePath('/payments');
  return { success: true, created: todo.length, skipped };
}
