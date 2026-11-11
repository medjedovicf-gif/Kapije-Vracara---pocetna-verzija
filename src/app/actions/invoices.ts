'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotifications } from '@/lib/notifications';

async function requireInvoiceStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' } as const;

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) return { error: 'Nemate ovlašćenje.' } as const;
  return { supabase, user, me } as const;
}

export async function createInvoice(formData: FormData) {
  const ctx = await requireInvoiceStaff();
  if ('error' in ctx) return ctx;
  const { supabase, me } = ctx;

  const unit = String(formData.get('unit') || '').trim();
  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '').trim() : me.building_id;
  const amount = Number(formData.get('amount') || 0);
  const month = String(formData.get('month') || '').trim() || new Date().toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });
  const fromEmail = String(formData.get('from_email') || '').trim();
  const recipientName = String(formData.get('recipient_name') || '').trim();
  const recipientEmail = String(formData.get('recipient_email') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const dueDate = String(formData.get('due_date') || '').trim();

  if (!unit || !buildingId || amount <= 0 || !fromEmail) return { error: 'Unesite stan, zgradu, iznos i email pošiljaoca.' };

  const { error } = await supabase.from('invoices').insert({
    unit,
    building_id: buildingId,
    amount,
    month,
    status: 'Poslata',
    from_email: fromEmail,
    recipient_name: recipientName || null,
    recipient_email: recipientEmail || null,
    description: description || null,
    due_date: dueDate || null,
  } as never);
  if (error) return { error: error.message };

  const admin = createAdminClient();
  const { data: residents } = await admin.from('profiles').select('id').eq('role', 'resident').eq('building_id', buildingId).eq('unit', unit);
  await createNotifications({ recipientIds: (residents ?? []).map((r: { id: string }) => r.id), type: 'invoice.created', icon: 'receipt', title: 'Nova uplatnica', sub: `${amount.toLocaleString('de-DE')} RSD · ${month}`, target: '/payments' });

  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/payments');
  return { success: true };
}

export async function sendInvoice(unit: string, buildingId: string, amount: number) {
  const formData = new FormData();
  formData.set('unit', unit);
  formData.set('building_id', buildingId);
  formData.set('amount', String(amount));
  formData.set('from_email', 'uprava@kapijevracara.rs');
  return createInvoice(formData);
}

export async function recordManualInvoicePayment(formData: FormData) {
  const ctx = await requireInvoiceStaff();
  if ('error' in ctx) return ctx;
  const { supabase, user, me } = ctx;

  const invoiceId = Number(formData.get('invoice_id') || 0) || null;
  const unit = String(formData.get('unit') || '').trim();
  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '').trim() : me.building_id;
  const amount = Number(formData.get('amount') || 0);
  const paymentDate = String(formData.get('payment_date') || '').trim() || new Date().toISOString().slice(0, 10);
  const reference = String(formData.get('reference') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!unit || !buildingId || amount <= 0) return { error: 'Unesite stan, zgradu i uplaćeni iznos.' };

  const { error } = await supabase.from('invoice_payments').insert({
    invoice_id: invoiceId,
    unit,
    building_id: buildingId,
    amount,
    payment_date: paymentDate,
    reference: reference || null,
    note: note || null,
    recorded_by: user.id,
  } as never);
  if (error) return { error: error.message };

  if (invoiceId) {
    await supabase.from('invoices').update({ status: 'Plaćena', paid_at: paymentDate } as never).eq('id', invoiceId);
  }

  const { data: resident } = await supabase
    .from('profiles')
    .select('balance')
    .eq('role', 'resident')
    .eq('building_id', buildingId)
    .eq('unit', unit)
    .maybeSingle<{ balance: number }>();
  const nextBalance = Math.max(0, Number(resident?.balance ?? 0) - amount);
  await supabase
    .from('profiles')
    .update({ balance: nextBalance, payment_status: nextBalance <= 0 ? 'Plaćeno' : 'Na čekanju' } as never)
    .eq('role', 'resident')
    .eq('building_id', buildingId)
    .eq('unit', unit);

  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/payments');
  return { success: true };
}

export async function addBankStatement(formData: FormData) {
  const ctx = await requireInvoiceStaff();
  if ('error' in ctx) return ctx;
  const { supabase, user, me } = ctx;

  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '').trim() : me.building_id;
  const statementDate = String(formData.get('statement_date') || '').trim() || new Date().toISOString().slice(0, 10);
  const payer = String(formData.get('payer') || '').trim();
  const reference = String(formData.get('reference') || '').trim();
  const amount = Number(formData.get('amount') || 0);
  const rawText = String(formData.get('raw_text') || '').trim();
  const matchedInvoiceId = Number(formData.get('matched_invoice_id') || 0) || null;

  if (!buildingId || amount <= 0) return { error: 'Unesite zgradu i iznos sa izvoda.' };

  const { error } = await supabase.from('bank_statements').insert({
    building_id: buildingId,
    statement_date: statementDate,
    payer: payer || null,
    reference: reference || null,
    amount,
    raw_text: rawText || null,
    matched_invoice_id: matchedInvoiceId,
    created_by: user.id,
  } as never);
  if (error) return { error: error.message };

  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/payments');
  return { success: true };
}
