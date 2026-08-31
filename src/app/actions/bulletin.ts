'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/lib/types';
import { notifyResidentsForBuilding } from '@/lib/notifications';

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

export async function createBulletinPost(formData: FormData) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { me, supabase } = ctx;

  const title = String(formData.get('title') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const buildingId =
    me.role === 'superadmin' ? String(formData.get('building_id') || '') || null : me.building_id;

  if (!title || !body) return { error: 'Unesite naslov i tekst.' };

  const { error } = await supabase.from('bulletin_posts').insert({
    title,
    body,
    building_id: buildingId,
    author_id: me.id,
    author_name: me.name,
  } as never);
  if (error) return { error: error.message };

  if (buildingId) await notifyResidentsForBuilding(buildingId, { type: 'bulletin.created', icon: 'megaphone', title: 'Novo obaveštenje', sub: title, target: '/bulletin' });

  revalidatePath('/admin/bulletin');
  revalidatePath('/super-admin/bulletin');
  revalidatePath('/bulletin');
  return { success: true };
}

export async function deleteBulletinPost(postId: number) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { supabase } = ctx;
  await supabase.from('bulletin_posts').delete().eq('id', postId);
  revalidatePath('/admin/bulletin');
  revalidatePath('/super-admin/bulletin');
  revalidatePath('/bulletin');
  return { success: true };
}
