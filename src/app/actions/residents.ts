'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/lib/types';

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' } as const;

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) {
    return { error: 'Nemate ovlašćenje za ovu akciju.' } as const;
  }
  return { me, supabase } as const;
}

export async function addResident(formData: FormData) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { me, supabase } = ctx;

  const name = String(formData.get('name') || '').trim();
  const unit = String(formData.get('unit') || '').trim();
  const balance = Number(formData.get('balance') || 0);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const buildingId = me.role === 'superadmin' ? String(formData.get('building_id') || '') : me.building_id;

  if (!name || !unit || !buildingId) return { error: 'Unesite ime, stan i zgradu.' };

  let userId: string | null = null;

  if (email && password) {
    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) return { error: `Nalog nije kreiran: ${createError.message}` };
    userId = created.user.id;
  } else {
    // Bez naloga za prijavu — samo evidencija u profiles (koristi generisan id, bez auth naloga)
    userId = crypto.randomUUID();
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    name,
    role: 'resident',
    unit,
    building_id: buildingId,
    balance,
    payment_status: 'Na čekanju',
  } as never);
  if (profileError) return { error: `Greška pri čuvanju profila: ${profileError.message}` };

  revalidatePath('/admin/residents');
  revalidatePath('/super-admin/residents');
  return { success: true };
}

export async function deleteResident(profileId: string) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { supabase } = ctx;

  await supabase.from('profiles').delete().eq('id', profileId);
  // Ako je imao auth nalog, obrisi i njega (bezopasno ako ne postoji)
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(profileId).catch(() => {});

  revalidatePath('/admin/residents');
  revalidatePath('/super-admin/residents');
  return { success: true };
}

export async function changeResidentPassword(profileId: string, newPassword: string) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;

  if (!newPassword || newPassword.length < 4) return { error: 'Lozinka je prekratka.' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password: newPassword });
  if (error) return { error: `Nalog za ovog stanara ne postoji ili greška: ${error.message}` };

  return { success: true };
}

export async function toggleResidentStatus(profileId: string, currentStatus: string) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { supabase } = ctx;

  const next = currentStatus === 'Plaćeno' ? 'Na čekanju' : 'Plaćeno';
  await supabase.from('profiles').update({ payment_status: next } as never).eq('id', profileId);

  revalidatePath('/admin/residents');
  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/residents');
  revalidatePath('/super-admin/payments');
  return { success: true };
}
