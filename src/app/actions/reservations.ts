'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { notifyStaffForBuilding, notifyUser } from '@/lib/notifications';
import { formatDateTime, localToUtcIso } from '@/lib/time';
import type { CommonSpace, SpaceBooking } from '@/lib/types';

function refresh() {
  revalidatePath('/reservations');
  revalidatePath('/admin/reservations');
}

// Poruke iz baze (trigger, constraint) prevedene u razumljiv tekst.
function bookingError(error: { code?: string; message: string }) {
  if (error.code === '23P01') return 'Termin je već zauzet. Izaberite drugo vreme.';
  if (error.code === '23514') return 'Kraj mora biti posle početka.';
  if (error.code === 'P0001') return error.message; // poruke iz naših trigera su već na srpskom
  return 'Rezervacija nije sačuvana. Pokušajte ponovo.';
}

// ---------- STANAR ----------

export async function createBooking(formData: FormData) {
  const me = await getMyProfile();
  if (!me || me.role !== 'resident') return { error: 'Samo stanari mogu da rezervišu.' };

  const spaceId = Number(formData.get('space_id'));
  const date = String(formData.get('date') || '');
  const from = String(formData.get('from') || '');
  const to = String(formData.get('to') || '');
  const note = String(formData.get('note') || '').trim().slice(0, 300) || null;

  const startsAt = localToUtcIso(date, from);
  const endsAt = localToUtcIso(date, to);
  if (!spaceId || !startsAt || !endsAt) return { error: 'Izaberite prostor, datum i vreme.' };
  if (endsAt <= startsAt) return { error: 'Kraj mora biti posle početka.' };

  const supabase = await createClient();
  // Zgrada, status i stanar se postavljaju u bazi (trigger), ne veruje se formi.
  const { data: booking, error } = await supabase
    .from('space_bookings')
    .insert({ space_id: spaceId, resident_id: me.id, building_id: me.building_id, starts_at: startsAt, ends_at: endsAt, note } as never)
    .select('*')
    .single<SpaceBooking>();
  if (error || !booking) return { error: error ? bookingError(error) : 'Rezervacija nije sačuvana.' };

  const { data: space } = await supabase.from('common_spaces').select('*').eq('id', spaceId).single<CommonSpace>();
  if (booking.status === 'Na čekanju') {
    await notifyStaffForBuilding(booking.building_id, {
      type: 'booking.created',
      icon: 'bell',
      title: 'Nova rezervacija čeka odobrenje',
      sub: `${space?.name ?? 'Prostor'} · ${formatDateTime(booking.starts_at)} · ${me.name}`,
      target: '/admin/reservations',
    });
  }
  refresh();
  return { success: true, status: booking.status };
}

export async function cancelBooking(id: number) {
  const me = await getMyProfile();
  if (!me) return { error: 'Niste prijavljeni.' };
  const supabase = await createClient();
  const { error } = await supabase.from('space_bookings').update({ status: 'Otkazano' } as never).eq('id', id).eq('resident_id', me.id);
  if (error) return { error: bookingError(error) };
  refresh();
  return { success: true };
}

// ---------- ADMIN ----------

async function requireStaff() {
  const me = await getMyProfile();
  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) return null;
  return me;
}

export async function decideBooking(id: number, decision: 'Potvrđeno' | 'Odbijeno') {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  if (decision !== 'Potvrđeno' && decision !== 'Odbijeno') return { error: 'Neispravna odluka.' };
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from('space_bookings')
    .update({ status: decision, decided_by: me.id } as never)
    .eq('id', id)
    .select('*')
    .single<SpaceBooking>();
  if (error || !booking) return { error: error ? bookingError(error) : 'Rezervacija nije pronađena.' };

  const { data: space } = await supabase.from('common_spaces').select('name').eq('id', booking.space_id).single<Pick<CommonSpace, 'name'>>();
  await notifyUser(booking.resident_id, {
    type: 'booking.decided',
    icon: 'bell',
    title: decision === 'Potvrđeno' ? 'Rezervacija je potvrđena' : 'Rezervacija je odbijena',
    sub: `${space?.name ?? 'Prostor'} · ${formatDateTime(booking.starts_at)}`,
    target: '/reservations',
  });
  refresh();
  return { success: true };
}

export async function adminCancelBooking(id: number) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from('space_bookings')
    .update({ status: 'Otkazano', decided_by: me.id } as never)
    .eq('id', id)
    .select('*')
    .single<SpaceBooking>();
  if (error || !booking) return { error: 'Rezervacija nije otkazana.' };
  await notifyUser(booking.resident_id, {
    type: 'booking.cancelled',
    icon: 'bell',
    title: 'Uprava je otkazala rezervaciju',
    sub: formatDateTime(booking.starts_at),
    target: '/reservations',
  });
  refresh();
  return { success: true };
}

export async function createSpace(formData: FormData) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '') : me.building_id;
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const maxHours = Math.min(24, Math.max(1, Number(formData.get('max_hours') || 4)));
  const requiresApproval = formData.get('requires_approval') === 'on';
  if (!buildingId || !name) return { error: 'Unesite naziv prostora.' };

  const supabase = await createClient();
  const { error } = await supabase.from('common_spaces').insert({
    building_id: buildingId,
    name,
    description,
    max_hours: maxHours,
    requires_approval: requiresApproval,
  } as never);
  if (error) return { error: 'Prostor nije sačuvan.' };
  refresh();
  return { success: true };
}

export async function setSpaceActive(id: number, active: boolean) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const supabase = await createClient();
  const { error } = await supabase.from('common_spaces').update({ active } as never).eq('id', id);
  if (error) return { error: 'Promena nije sačuvana.' };
  refresh();
  return { success: true };
}
