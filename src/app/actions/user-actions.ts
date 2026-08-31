'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyStaffForBuilding, notifyUser } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';
import type { Profile, Ticket } from '@/lib/types';

async function residentContext() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' } as const;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile || profile.role !== 'resident') return { error: 'Ova akcija je dostupna samo stanarima.' } as const;
  return { supabase, user, profile } as const;
}

async function ownTicket(ctx: Awaited<ReturnType<typeof residentContext>>, ticketId: number) {
  if ('error' in ctx) return ctx;
  const { data: ticket } = await ctx.supabase.from('tickets').select('*').eq('id', ticketId).eq('reported_by', ctx.user.id).single<Ticket>();
  if (!ticket) return { error: 'Problem nije pronađen.' } as const;
  return { ...ctx, ticket } as const;
}

export async function addResidentComment(ticketId: number, body: string) {
  const ctx = await ownTicket(await residentContext(), ticketId); if ('error' in ctx || !('ticket' in ctx)) return { error: 'Problem nije pronađen.' };
  const text = body.trim(); if (!text) return { error: 'Poruka ne može biti prazna.' };
  const { error } = await ctx.supabase.from('ticket_comments').insert({ ticket_id: ticketId, author_id: ctx.user.id, body: text } as never);
  if (error) return { error: error.message };
  await ctx.supabase.from('audit_logs').insert({ actor_id: ctx.user.id, action: 'ticket.comment_added', entity_type: 'ticket', entity_id: String(ticketId), summary: `Stanar je poslao poruku na problem #${ticketId}.`, after_value: { body: text } } as never);
  await notifyStaffForBuilding(ctx.ticket.building_id, { type: 'ticket.comment', icon: 'bell', title: 'Nova poruka stanara', sub: `#${ticketId} · ${ctx.ticket.title}`, target: `/admin/tickets?ticket=${ticketId}`, persistent: true });
  revalidatePath('/services'); return { success: true };
}

export async function confirmAppointment(ticketId: number, status: 'Potvrđeno' | 'Promena tražena') {
  const ctx = await ownTicket(await residentContext(), ticketId); if ('error' in ctx || !('ticket' in ctx)) return { error: 'Problem nije pronađen.' };
  if (!ctx.ticket.appointment_date) return { error: 'Za ovaj problem još nema predloženog termina.' };
  const { error } = await ctx.supabase.from('tickets').update({ appointment_status: status } as never).eq('id', ticketId).eq('reported_by', ctx.user.id);
  if (error) return { error: error.message };
  await ctx.supabase.from('audit_logs').insert({ actor_id: ctx.user.id, action: 'ticket.appointment_updated', entity_type: 'ticket', entity_id: String(ticketId), summary: `Stanar je ${status === 'Potvrđeno' ? 'potvrdio' : 'zatražio promenu'} termina za problem #${ticketId}.` } as never);
  await notifyStaffForBuilding(ctx.ticket.building_id, { type: 'appointment.updated', icon: 'bell', title: status === 'Potvrđeno' ? 'Termin je potvrđen' : 'Stanar traži promenu termina', sub: ctx.ticket.title, target: `/admin/tickets?ticket=${ticketId}`, persistent: true });
  revalidatePath('/services'); return { success: true };
}

export async function rateResolvedTicket(ticketId: number, rating: number, comment: string) {
  const ctx = await ownTicket(await residentContext(), ticketId); if ('error' in ctx || !('ticket' in ctx)) return { error: 'Problem nije pronađen.' };
  if (ctx.ticket.status !== 'Rešeno' || !Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Ocena je dostupna samo za rešene probleme.' };
  const { error } = await ctx.supabase.from('ticket_ratings').insert({ ticket_id: ticketId, resident_id: ctx.user.id, rating, comment: comment.trim() || null } as never);
  if (error) return { error: error.code === '23505' ? 'Ovaj problem je već ocenjen.' : error.message };
  revalidatePath('/services'); return { success: true };
}

export async function saveNotificationPreferences(values: Record<string, boolean>) {
  const ctx = await residentContext(); if ('error' in ctx) return ctx;
  const admin = createAdminClient();
  const { error } = await admin.from('user_notification_preferences').upsert({ user_id: ctx.user.id, ...values, updated_at: new Date().toISOString() } as never);
  if (error) return { error: error.message };
  revalidatePath('/settings'); return { success: true };
}

export async function saveResidentProfile(name: string, phone: string) {
  const ctx = await residentContext(); if ('error' in ctx) return ctx;
  if (!name.trim()) return { error: 'Ime je obavezno.' };
  // Telefon se čuva u metadata jer postojeća profiles šema nema phone kolonu.
  const { error } = await ctx.supabase.auth.updateUser({ data: { name: name.trim(), phone: phone.trim() || null } });
  if (error) return { error: error.message };
  const { error: profileError } = await ctx.supabase.from('profiles').update({ name: name.trim() } as never).eq('id', ctx.user.id);
  if (profileError) return { error: profileError.message };
  revalidatePath('/'); revalidatePath('/settings'); return { success: true };
}
