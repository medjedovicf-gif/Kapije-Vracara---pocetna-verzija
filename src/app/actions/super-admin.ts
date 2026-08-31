'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' } as const;
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: string }>();
  if (me?.role !== 'superadmin') return { error: 'Samo super administrator može izvršiti ovu akciju.' } as const;
  return { supabase, userId: user.id } as const;
}

export async function createManagedUser(formData: FormData) {
  const ctx = await requireSuperAdmin();
  if ('error' in ctx) return ctx;
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'resident');
  const unit = String(formData.get('unit') || '').trim() || null;
  const buildingId = String(formData.get('building_id') || '').trim() || null;
  if (!name || !email || password.length < 4 || !['resident', 'admin', 'superadmin'].includes(role)) {
    return { error: 'Unesite ime, ispravan email, lozinku od najmanje 4 karaktera i ulogu.' };
  }
  if (role !== 'superadmin' && !buildingId) return { error: 'Izaberite zgradu za admina ili stanara.' };

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !created.user) return { error: `Auth nalog nije kreiran: ${authError?.message ?? 'nepoznata greška'}` };
  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id, name, role, unit: role === 'resident' ? unit : null,
    building_id: buildingId, balance: 0, payment_status: 'Na čekanju',
  } as never);
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `Profil nije sačuvan: ${profileError.message}` };
  }
  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin/residents');
  return { success: true };
}

export async function updateManagedUser(profileId: string, formData: FormData) {
  const ctx = await requireSuperAdmin();
  if ('error' in ctx) return ctx;
  if (profileId === ctx.userId && String(formData.get('role')) !== 'superadmin') return { error: 'Ne možete ukloniti superadmin ulogu svom aktivnom nalogu.' };
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'resident');
  const unit = String(formData.get('unit') || '').trim() || null;
  const buildingId = String(formData.get('building_id') || '').trim() || null;
  if (!name || !email || !['resident', 'admin', 'superadmin'].includes(role)) return { error: 'Podaci nisu ispravni.' };
  if (role !== 'superadmin' && !buildingId) return { error: 'Izaberite zgradu.' };
  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(profileId, { email, ...(password ? { password } : {}) });
  if (authError) return { error: `Auth nalog nije izmenjen: ${authError.message}` };
  const { error } = await admin.from('profiles').update({ name, role, unit: role === 'resident' ? unit : null, building_id: buildingId } as never).eq('id', profileId);
  if (error) return { error: `Profil nije izmenjen: ${error.message}` };
  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin/residents');
  return { success: true };
}

export async function deleteManagedUser(profileId: string) {
  const ctx = await requireSuperAdmin();
  if ('error' in ctx) return ctx;
  if (profileId === ctx.userId) return { error: 'Ne možete obrisati sopstveni aktivni nalog.' };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { error: `Korisnik nije obrisan: ${error.message}` };
  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin/residents');
  return { success: true };
}

export async function createBuilding(formData: FormData) {
  const ctx = await requireSuperAdmin();
  if ('error' in ctx) return ctx;
  const name = String(formData.get('name') || '').trim();
  if (!name) return { error: 'Unesite naziv zgrade.' };
  const { error } = await ctx.supabase.from('buildings').insert({ name } as never);
  if (error) return { error: error.message };
  revalidatePath('/super-admin/buildings');
  revalidatePath('/super-admin/users');
  return { success: true };
}

export async function updateBuilding(buildingId: string, name: string) {
  const ctx = await requireSuperAdmin();
  if ('error' in ctx) return ctx;
  const value = name.trim();
  if (!value) return { error: 'Naziv zgrade ne može biti prazan.' };
  const { error } = await ctx.supabase.from('buildings').update({ name: value } as never).eq('id', buildingId);
  if (error) return { error: error.message };
  revalidatePath('/super-admin/buildings');
  revalidatePath('/super-admin/users');
  return { success: true };
}

export async function togglePermission(key: string, value: boolean) {
  const ctx = await requireSuperAdmin();
  if ('error' in ctx) return ctx;
  const { error } = await ctx.supabase.from('permissions').update({ value } as never).eq('key', key);
  if (error) return { error: error.message };
  revalidatePath('/super-admin/users');
  return { success: true };
}
