'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { InvoiceLineItem, Profile } from '@/lib/types';
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

/** Stavke iz forme (JSON niz). Prazne i neispravne se preskaču. */
function parseLineItems(formData: FormData): InvoiceLineItem[] {
  try {
    const raw = JSON.parse(String(formData.get('line_items') || '[]'));
    if (!Array.isArray(raw)) return [];
    return raw
      .map((x) => ({ label: String(x?.label ?? '').trim().slice(0, 200), amount: Math.round(Number(x?.amount) * 100) / 100 }))
      .filter((x) => x.label && Number.isFinite(x.amount) && x.amount !== 0)
      .slice(0, 30);
  } catch {
    return [];
  }
}

/** Zajednička polja za novu i izmenjenu fakturu. Iznos je zbir stavki kad stavke postoje. */
function invoiceFields(formData: FormData) {
  const items = parseLineItems(formData);
  const amount = items.length ? items.reduce((a, x) => a + x.amount, 0) : Number(formData.get('amount') || 0);
  return {
    items,
    fields: {
      amount: Math.round(amount * 100) / 100,
      month: String(formData.get('month') || '').trim() || new Date().toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' }),
      from_email: String(formData.get('from_email') || '').trim(),
      recipient_name: String(formData.get('recipient_name') || '').trim() || null,
      recipient_email: String(formData.get('recipient_email') || '').trim() || null,
      description: String(formData.get('description') || '').trim() || null,
      due_date: String(formData.get('due_date') || '').trim() || null,
    },
  };
}

/** Ako kolona line_items još ne postoji u bazi, stavke idu u opis da se ne izgube. */
const missingLineItemsColumn = (e: { message?: string; code?: string } | null) => !!e && (e.code === 'PGRST204' || /line_items/.test(e.message ?? ''));
const itemsAsText = (items: InvoiceLineItem[], description: string | null) =>
  [description, ...items.map((x) => `• ${x.label}: ${x.amount.toLocaleString('de-DE')} RSD`)].filter(Boolean).join('\n');

export async function createInvoice(formData: FormData) {
  const ctx = await requireInvoiceStaff();
  if ('error' in ctx) return ctx;
  const { supabase, me } = ctx;

  const unit = String(formData.get('unit') || '').trim();
  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '').trim() : me.building_id;
  const { items, fields } = invoiceFields(formData);
  const { amount, month } = fields;

  if (!unit || !buildingId || amount <= 0 || !fields.from_email) return { error: 'Unesite stan, zgradu, iznos i email pošiljaoca.' };

  const base = { ...fields, unit, building_id: buildingId, status: 'Poslata' };
  let { error } = await supabase.from('invoices').insert({ ...base, line_items: items.length ? items : null } as never);
  if (missingLineItemsColumn(error)) {
    ({ error } = await supabase.from('invoices').insert({ ...base, description: itemsAsText(items, fields.description) || null } as never));
  }
  if (error) return { error: error.message };

  const admin = createAdminClient();
  const { data: residents } = await admin.from('profiles').select('id').eq('role', 'resident').eq('building_id', buildingId).eq('unit', unit);
  await createNotifications({ recipientIds: (residents ?? []).map((r: { id: string }) => r.id), type: 'invoice.created', icon: 'receipt', title: 'Nova uplatnica', sub: `${amount.toLocaleString('de-DE')} RSD · ${month}`, target: '/payments' });

  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/payments');
  return { success: true };
}

export async function updateInvoice(invoiceId: number, formData: FormData) {
  const ctx = await requireInvoiceStaff();
  if ('error' in ctx) return ctx;
  const { supabase, me } = ctx;

  let query = supabase.from('invoices').select('id, unit, building_id, status').eq('id', invoiceId);
  if (me.role !== 'superadmin') query = query.eq('building_id', me.building_id ?? '');
  const { data: current } = await query.maybeSingle<{ id: number; unit: string; building_id: string; status: string }>();
  if (!current) return { error: 'Faktura nije pronađena.' };
  if (current.status === 'Plaćena') return { error: 'Plaćena faktura ne može da se menja.' };

  const { items, fields } = invoiceFields(formData);
  if (fields.amount <= 0 || !fields.from_email) return { error: 'Unesite iznos i email pošiljaoca.' };

  let { error } = await supabase.from('invoices').update({ ...fields, line_items: items.length ? items : null } as never).eq('id', invoiceId);
  if (missingLineItemsColumn(error)) {
    ({ error } = await supabase.from('invoices').update({ ...fields, description: itemsAsText(items, fields.description) || null } as never).eq('id', invoiceId));
  }
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'invoice.updated', entity_type: 'invoice', entity_id: String(invoiceId), summary: `Izmenjena faktura za stan ${current.unit}: ${fields.amount.toLocaleString('de-DE')} RSD.` } as never);

  const admin = createAdminClient();
  const { data: residents } = await admin.from('profiles').select('id').eq('role', 'resident').eq('building_id', current.building_id).eq('unit', current.unit);
  await createNotifications({ recipientIds: (residents ?? []).map((r: { id: string }) => r.id), type: 'invoice.updated', icon: 'receipt', title: 'Faktura je izmenjena', sub: `${fields.amount.toLocaleString('de-DE')} RSD · ${fields.month}`, target: '/payments' });

  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/payments');
  revalidatePath('/payments');
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
