'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotifications, notifyUser } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';
import type { Profile, Ticket, TicketPriority, TicketStatus } from '@/lib/types';

const statuses: TicketStatus[] = ['Novo', 'Zakazano', 'U toku', 'Rešeno'];
const priorities: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' } as const;
  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || !['admin', 'superadmin'].includes(me.role)) return { error: 'Nemate ovlašćenje.' } as const;
  return { supabase, me, userId: user.id } as const;
}

async function audit(supabase: Awaited<ReturnType<typeof createClient>>, actorId: string, action: string, entityId: string, summary: string, beforeValue: unknown, afterValue: unknown) {
  await supabase.from('audit_logs').insert({ actor_id: actorId, action, entity_type: 'ticket', entity_id: entityId, summary, before_value: beforeValue, after_value: afterValue } as never);
}

export async function updateTicketDetails(ticketId: number, values: { title: string; description: string; category: string; unit: string; status: string; priority: string; due_at: string; assigned_to: string; appointment_date?: string; appointment_start?: string; appointment_end?: string; appointment_status?: string }) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  if (!statuses.includes(values.status as TicketStatus) || !priorities.includes(values.priority as TicketPriority)) return { error: 'Status ili prioritet nisu ispravni.' };
  const oldQuery = ctx.me.role === 'superadmin'
    ? ctx.supabase.from('tickets').select('*').eq('id', ticketId).single<Ticket>()
    : ctx.supabase.from('tickets').select('*').eq('id', ticketId).eq('building_id', ctx.me.building_id ?? '').single<Ticket>();
  const { data: before } = await oldQuery;
  if (!before) return { error: 'Problem nije pronađen ili nije u vašoj zgradi.' };
  const assignedTo = values.assigned_to || null;
  const patch: Record<string, string | null> = {
    title: values.title.trim(),
    description: values.description.trim() || null,
    category: values.category.trim() || 'Ostalo',
    unit: values.unit.trim(),
    status: values.status,
    priority: values.priority,
    due_at: values.due_at || null,
    assigned_to: assignedTo,
  };

  if (values.appointment_date || values.appointment_start || values.appointment_end || values.appointment_status) {
    patch.appointment_date = values.appointment_date || null;
    patch.appointment_start = values.appointment_start || null;
    patch.appointment_end = values.appointment_end || null;
    patch.appointment_status = values.appointment_status || 'Nije zakazano';
  }

  const { error } = await ctx.supabase.from('tickets').update(patch as never).eq('id', ticketId);
  if (error) return { error: error.message };
  const changed = `${before.status} → ${values.status}`;
  await audit(ctx.supabase, ctx.userId, 'ticket.updated', String(ticketId), `Problem #${ticketId} je izmenjen (${changed}).`, before, values);
  if (before.reported_by && before.status !== values.status) await notifyUser(before.reported_by, { type: 'ticket.status_changed', icon: 'wrench', title: 'Status problema je promenjen', sub: `${before.title} · ${values.status}`, target: `/admin/tickets?ticket=${ticketId}` });
  if (assignedTo && assignedTo !== before.assigned_to) await notifyUser(assignedTo, { type: 'ticket.assigned', icon: 'wrench', title: 'Dodeljen vam je problem', sub: `#${ticketId} · ${values.title}`, target: `/admin/tickets?ticket=${ticketId}`, persistent: true });
  if (values.priority === 'Critical' && before.priority !== 'Critical') {
    const admin = createAdminClient();
    const { data: staff } = await admin.from('profiles').select('id, role').or(`building_id.eq.${before.building_id},role.eq.superadmin`);
    await createNotifications({ recipientIds: (staff ?? []).filter((p: { role: string }) => ['admin', 'superadmin'].includes(p.role)).map((p: { id: string }) => p.id), type: 'ticket.critical', icon: 'wrench', title: 'Kritičan problem', sub: `#${ticketId} · ${values.title}`, target: `/admin/tickets?ticket=${ticketId}`, persistent: true });
  }
  revalidatePath('/admin'); revalidatePath('/admin/tickets');
  return { success: true };
}

export async function addTicketComment(ticketId: number, body: string) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const text = body.trim(); if (!text) return { error: 'Komentar ne može biti prazan.' };
  const { data: ticket } = await ctx.supabase.from('tickets').select('id, building_id, reported_by, title').eq('id', ticketId).single<Pick<Ticket, 'id' | 'building_id' | 'reported_by' | 'title'>>();
  if (!ticket || (ctx.me.role === 'admin' && ticket.building_id !== ctx.me.building_id)) return { error: 'Problem nije dostupan.' };
  const { error } = await ctx.supabase.from('ticket_comments').insert({ ticket_id: ticketId, author_id: ctx.userId, body: text } as never);
  if (error) return { error: error.message };
  await audit(ctx.supabase, ctx.userId, 'ticket.comment_added', String(ticketId), `Dodat je komentar na problem #${ticketId}.`, null, { body: text });
  if (ticket.reported_by && ticket.reported_by !== ctx.userId) await notifyUser(ticket.reported_by, { type: 'ticket.comment', icon: 'bell', title: 'Novi komentar na problem', sub: ticket.title, target: `/admin/tickets?ticket=${ticketId}` });
  revalidatePath('/admin/tickets');
  return { success: true };
}
