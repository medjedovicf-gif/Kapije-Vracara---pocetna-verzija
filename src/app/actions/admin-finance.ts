'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { EXPENSE_CATEGORIES, MAX_EXPENSE_FILE, PLANNED_WORK_STATUSES } from '@/lib/finance';

type Result = { error?: string; success?: boolean };

async function requireManager() {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) return { error: 'Nemate ovlašćenje.' } as const;
  const supabase = await createClient();
  return { supabase, me, buildingId: me.building_id } as const;
}

function refresh() {
  revalidatePath('/admin');
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/planned-works');
}

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const category = (v: string) => ((EXPENSE_CATEGORIES as readonly string[]).includes(v) ? v : 'Ostalo');

export async function createExpense(formData: FormData): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { supabase, me, buildingId } = ctx;

  const supplier = text(formData, 'supplier');
  const amount = Number(text(formData, 'amount').replace(',', '.'));
  if (!supplier || !Number.isFinite(amount) || amount <= 0) return { error: 'Unesite dobavljača i iznos veći od nule.' };

  let filePath: string | null = null;
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_EXPENSE_FILE) return { error: 'Fajl je veći od 4 MB.' };
    if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) return { error: 'Dozvoljeni su PDF i slike.' };
    const ext = (file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
    filePath = `${buildingId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('expense-files').upload(filePath, file, { contentType: file.type });
    if (uploadError) return { error: `Fajl nije učitan: ${uploadError.message}` };
  }

  const status = text(formData, 'status') === 'Plaćeno' ? 'Plaćeno' : 'Neplaćeno';
  const issueDate = text(formData, 'issue_date') || new Date().toISOString().slice(0, 10);
  const plannedWorkId = Number(text(formData, 'planned_work_id')) || null;

  const { error } = await supabase.from('building_expenses').insert({
    building_id: buildingId,
    supplier,
    invoice_number: text(formData, 'invoice_number') || null,
    category: category(text(formData, 'category')),
    description: text(formData, 'description') || null,
    amount,
    issue_date: issueDate,
    due_date: text(formData, 'due_date') || null,
    status,
    paid_at: status === 'Plaćeno' ? text(formData, 'paid_at') || issueDate : null,
    file_path: filePath,
    planned_work_id: plannedWorkId,
    created_by: me.id,
  } as never);
  if (error) {
    if (filePath) await supabase.storage.from('expense-files').remove([filePath]);
    return { error: error.message };
  }

  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'expense.created', entity_type: 'expense', entity_id: null, summary: `Uneta faktura: ${supplier}, ${amount.toLocaleString('de-DE')} RSD.` } as never);
  refresh();
  return { success: true };
}

export async function setExpenseStatus(id: number, status: 'Plaćeno' | 'Neplaćeno'): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { error } = await ctx.supabase
    .from('building_expenses')
    .update({ status, paid_at: status === 'Plaćeno' ? new Date().toISOString().slice(0, 10) : null } as never)
    .eq('id', id)
    .eq('building_id', ctx.buildingId);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}

export async function deleteExpense(id: number): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { supabase, me, buildingId } = ctx;
  const { data: row } = await supabase.from('building_expenses').select('file_path, supplier, amount').eq('id', id).eq('building_id', buildingId).maybeSingle<{ file_path: string | null; supplier: string; amount: number }>();
  if (!row) return { error: 'Faktura nije pronađena.' };
  const { error } = await supabase.from('building_expenses').delete().eq('id', id).eq('building_id', buildingId);
  if (error) return { error: error.message };
  if (row.file_path) await supabase.storage.from('expense-files').remove([row.file_path]);
  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'expense.deleted', entity_type: 'expense', entity_id: String(id), summary: `Obrisana faktura: ${row.supplier}, ${Number(row.amount).toLocaleString('de-DE')} RSD.` } as never);
  refresh();
  return { success: true };
}

export async function createPlannedWork(formData: FormData): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { supabase, me, buildingId } = ctx;

  const title = text(formData, 'title');
  const estimated = Number(text(formData, 'estimated_cost').replace(',', '.') || 0);
  if (!title) return { error: 'Unesite naziv rada.' };
  if (!Number.isFinite(estimated) || estimated < 0) return { error: 'Procena troška nije ispravna.' };

  const { error } = await supabase.from('planned_works').insert({
    building_id: buildingId,
    title,
    description: text(formData, 'description') || null,
    category: category(text(formData, 'category')),
    contractor: text(formData, 'contractor') || null,
    estimated_cost: estimated,
    planned_date: text(formData, 'planned_date') || null,
    status: 'Planirano',
    created_by: me.id,
  } as never);
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'planned_work.created', entity_type: 'planned_work', entity_id: null, summary: `Planiran rad: ${title}.` } as never);
  refresh();
  return { success: true };
}

export async function setPlannedWorkStatus(id: number, status: string): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  if (!(PLANNED_WORK_STATUSES as readonly string[]).includes(status)) return { error: 'Nepoznat status.' };
  const { error } = await ctx.supabase.from('planned_works').update({ status } as never).eq('id', id).eq('building_id', ctx.buildingId);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}

export async function deletePlannedWork(id: number): Promise<Result> {
  const ctx = await requireManager();
  if ('error' in ctx) return ctx;
  const { error } = await ctx.supabase.from('planned_works').delete().eq('id', id).eq('building_id', ctx.buildingId);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}
