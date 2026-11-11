'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUser, notifyStaffForBuilding } from '@/lib/notifications';

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' } as const;
  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) return { error: 'Nemate ovlašćenje.' } as const;
  return { me, supabase } as const;
}

export async function updateTicketStatus(ticketId: number, status: string) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { supabase } = ctx;

  const { error } = await supabase.from('tickets').update({ status } as never).eq('id', ticketId);
  if (error) return { error: error.message };

  const admin = createAdminClient();
  const { data: ticket } = await admin.from('tickets').select('reported_by, building_id, unit').eq('id', ticketId).single<{ reported_by: string | null; building_id: string; unit: string }>();
  if (ticket?.reported_by) await notifyUser(ticket.reported_by, { type: 'ticket.updated', icon: 'wrench', title: 'Ažuriran status zahteva', sub: `Stan ${ticket.unit} · ${status}`, target: '/services' });

  revalidatePath('/admin/tickets');
  revalidatePath('/admin');
  revalidatePath('/super-admin/tickets');
  revalidatePath('/super-admin');
  return { success: true };
}

export async function createTicketByStaff(formData: FormData) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { me, supabase } = ctx;

  const unit = String(formData.get('unit') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category') || 'Ostalo');
  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '') : me.building_id;

  if (!unit || !title || !buildingId) return { error: 'Popunite stan, naslov i zgradu.' };

  const { data: created, error } = await supabase.from('tickets').insert({
    unit,
    building_id: buildingId,
    title,
    category,
    status: 'Novo',
    priority: 'Medium',
  } as never).select('id').single<{ id: number }>();
  if (error) return { error: error.message };

  await notifyStaffForBuilding(buildingId, { type: 'ticket.created', icon: 'wrench', title: 'Novi zahtev za servis', sub: `Stan ${unit} · ${category}`, target: created ? `/admin/tickets?ticket=${created.id}` : '/admin/tickets', persistent: true });
  await supabase.from('audit_logs').insert({ actor_id: me.id, action: 'ticket.created', entity_type: 'ticket', summary: `Admin je kreirao novi problem za stan ${unit}.`, after_value: { title, category, unit, building_id: buildingId } } as never);

  revalidatePath('/admin/tickets');
  revalidatePath('/super-admin/tickets');
  return { success: true };
}
