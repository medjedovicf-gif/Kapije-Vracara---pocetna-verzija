'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyStaffForBuilding } from '@/lib/notifications';

export async function createTicket(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Niste prijavljeni.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('unit, building_id')
    .eq('id', user.id)
    .single<{ unit: string | null; building_id: string | null }>();
  if (!profile?.unit || !profile.building_id) return { error: 'Nedostaje stan/zgrada na nalogu.' };

  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category') || 'Ostalo');
  const description = String(formData.get('description') || '').trim();
  const location = String(formData.get('location') || '').trim();
  const requestedPriority = String(formData.get('priority') || 'Medium');
  const emergency = formData.get('emergency') === 'on';

  if (!title) return { error: 'Unesite naslov kvara.' };
  if (emergency && !['Vodoinstalacije', 'Elektrika', 'Ostalo'].includes(category)) return { error: 'Za hitnu prijavu izaberite kategoriju hitnog problema.' };
  if (!emergency && !['Low', 'Medium', 'High'].includes(requestedPriority)) return { error: 'Izaberite validan prioritet.' };

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      unit: profile.unit,
      building_id: profile.building_id,
      title,
      category,
      description: description || null,
      status: 'Novo',
      reported_by: user.id,
      location: location || null,
      priority: emergency ? 'Critical' : requestedPriority,
      is_emergency: emergency,
    } as never)
    .select('id')
    .single<{ id: number }>();

  if (ticketError || !ticket) return { error: 'Greška pri čuvanju zahteva. Pokušajte ponovo.' };

  await supabase.from('audit_logs').insert({ actor_id: user.id, action: emergency ? 'ticket.emergency_created' : 'ticket.created', entity_type: 'ticket', entity_id: String(ticket.id), summary: `${emergency ? 'Hitan problem' : 'Korisnik'} je prijavio novi problem #${ticket.id}.`, after_value: { title, category, unit: profile.unit, location, priority: emergency ? 'Critical' : requestedPriority } } as never);

  await notifyStaffForBuilding(profile.building_id, { type: 'ticket.created', icon: 'wrench', title: 'Novi zahtev za servis', sub: `Stan ${profile.unit} · ${category}`, target: `/admin/tickets?ticket=${ticket.id}`, persistent: true });

  // Fotografije sa telefona (do 5, maksimalno 8MB po fajlu).
  const photos = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  for (const photo of photos.slice(0, 5)) {
    if (!photo.type.startsWith('image/') || photo.size > 8 * 1024 * 1024) continue;
    const ext = photo.name.split('.').pop() || 'jpg';
    const path = `${profile.building_id}/${ticket.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('ticket-photos').upload(path, photo, {
      contentType: photo.type || 'image/jpeg',
    });
    if (!uploadError) {
      await supabase.from('ticket_photos').insert({ ticket_id: ticket.id, storage_path: path } as never);
    }
  }

  revalidatePath('/services');
  return { success: true };
}
