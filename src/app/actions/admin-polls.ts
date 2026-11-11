'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/lib/types';

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

export async function createPoll(formData: FormData) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { me, supabase } = ctx;

  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const imageUrl = String(formData.get('image_url') || '').trim();
  const heroImageUrl = String(formData.get('hero_image_url') || '').trim();
  const options = formData.getAll('options').map((o) => String(o).trim()).filter(Boolean);
  const buildingId =
    me.role === 'superadmin' ? String(formData.get('building_id') || '') || null : me.building_id;

  if (!title || options.length < 2) return { error: 'Unesite naslov i bar dve opcije.' };

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({ title, description: description || null, image_url: imageUrl || null, hero_image_url: heroImageUrl || imageUrl || null, building_id: buildingId, status: 'active', created_by: me.id } as never)
    .select('id')
    .single<{ id: number }>();
  if (pollError || !poll) return { error: pollError?.message ?? 'Greška pri kreiranju ankete.' };

  const { error: optError } = await supabase
    .from('poll_options')
    .insert(options.map((label) => ({ poll_id: poll.id, label, votes: 0 })) as never);
  if (optError) return { error: optError.message };

  revalidatePath('/admin/polls');
  revalidatePath('/super-admin/polls');
  revalidatePath('/bulletin');
  return { success: true };
}

export async function closePoll(pollId: number) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { supabase } = ctx;
  await supabase.from('polls').update({ status: 'closed' } as never).eq('id', pollId);
  revalidatePath('/admin/polls');
  revalidatePath('/super-admin/polls');
  revalidatePath('/bulletin');
  return { success: true };
}

export async function deletePoll(pollId: number) {
  const ctx = await requireStaff();
  if ('error' in ctx) return ctx;
  const { supabase } = ctx;
  await supabase.from('polls').delete().eq('id', pollId);
  revalidatePath('/admin/polls');
  revalidatePath('/super-admin/polls');
  revalidatePath('/bulletin');
  return { success: true };
}
