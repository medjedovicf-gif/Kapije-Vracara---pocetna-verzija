'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotifications } from '@/lib/notifications';

export async function sendInvoice(unit: string, buildingId: string, amount: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' };

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) return { error: 'Nemate ovlašćenje.' };

  const month = new Date().toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });

  const { error } = await supabase.from('invoices').insert({
    unit,
    building_id: buildingId,
    amount,
    month,
    status: 'Poslata',
  } as never);
  if (error) return { error: error.message };

  const admin = createAdminClient();
  const { data: residents } = await admin.from('profiles').select('id').eq('role', 'resident').eq('building_id', buildingId).eq('unit', unit);
  await createNotifications({ recipientIds: (residents ?? []).map((r: { id: string }) => r.id), type: 'invoice.created', icon: 'receipt', title: 'Nova uplatnica', sub: `${amount.toLocaleString('de-DE')} RSD · ${month}`, target: '/payments' });

  revalidatePath('/admin/payments');
  revalidatePath('/super-admin/payments');
  return { success: true };
}
