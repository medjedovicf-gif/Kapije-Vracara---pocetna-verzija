'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { DOCUMENT_CATEGORIES, type BuildingDocument, type Profile } from '@/lib/types';

const DOCUMENTS_BUCKET = 'building-documents';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

async function requireStaff(): Promise<Profile | null> {
  const me = await getMyProfile();
  return me && (me.role === 'admin' || me.role === 'superadmin') ? me : null;
}

function safeFileName(name: string) {
  const base = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
  return base.slice(-80) || 'dokument';
}

// Korak 1: server proverava prava i pravi jednokratni link za upload direktno u storage
// (zaobilazi limit veličine server akcije).
export async function prepareDocumentUpload(input: { fileName: string; size: number; mimeType: string; buildingId?: string }) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const buildingId = me.role === 'superadmin' ? input.buildingId : me.building_id;
  if (!buildingId) return { error: 'Izaberite zgradu.' };
  if (!input.size || input.size > MAX_BYTES) return { error: 'Fajl može imati najviše 25 MB.' };
  if (input.mimeType && !ALLOWED_TYPES.includes(input.mimeType)) return { error: 'Dozvoljeni su PDF, slike, Word, Excel i tekst fajlovi.' };

  const path = `${buildingId}/${crypto.randomUUID()}-${safeFileName(input.fileName)}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: 'Upload trenutno nije moguć. Pokušajte ponovo.' };
  return { path: data.path, token: data.token, buildingId };
}

// Korak 2: posle uspešnog upload-a upisuje se zapis (kroz RLS, kao ulogovani korisnik).
export async function saveDocument(input: {
  path: string;
  buildingId: string;
  title: string;
  category: string;
  fileName: string;
  mimeType: string;
  size: number;
  visibleToResidents: boolean;
}) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const buildingId = me.role === 'superadmin' ? input.buildingId : me.building_id;
  const admin = createAdminClient();
  const discard = () => admin.storage.from(DOCUMENTS_BUCKET).remove([input.path]);

  if (!buildingId || !input.path.startsWith(`${buildingId}/`)) { await discard(); return { error: 'Neispravan fajl.' }; }
  const title = input.title.trim();
  if (!title) { await discard(); return { error: 'Unesite naziv dokumenta.' }; }
  const category = (DOCUMENT_CATEGORIES as readonly string[]).includes(input.category) ? input.category : 'Ostalo';

  const supabase = await createClient();
  const { error } = await supabase.from('building_documents').insert({
    building_id: buildingId,
    title,
    category,
    storage_path: input.path,
    file_name: input.fileName.slice(0, 200),
    mime_type: input.mimeType || null,
    size_bytes: input.size,
    visible_to_residents: input.visibleToResidents,
    uploaded_by: me.id,
  } as never);
  if (error) { await discard(); return { error: 'Dokument nije sačuvan.' }; }

  revalidatePath('/admin/documents');
  revalidatePath('/documents');
  return { success: true };
}

export async function deleteDocument(id: number) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const supabase = await createClient();
  // Čitanje kroz RLS: admin vidi samo dokumente svoje zgrade.
  const { data: doc } = await supabase.from('building_documents').select('*').eq('id', id).single<BuildingDocument>();
  if (!doc) return { error: 'Dokument nije pronađen.' };
  const { error } = await supabase.from('building_documents').delete().eq('id', id);
  if (error) return { error: 'Dokument nije obrisan.' };
  await createAdminClient().storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  revalidatePath('/admin/documents');
  revalidatePath('/documents');
  return { success: true };
}

export async function toggleDocumentVisibility(id: number, visible: boolean) {
  const me = await requireStaff();
  if (!me) return { error: 'Nemate ovlašćenje.' };
  const supabase = await createClient();
  const { error } = await supabase.from('building_documents').update({ visible_to_residents: visible } as never).eq('id', id);
  if (error) return { error: 'Promena nije sačuvana.' };
  revalidatePath('/admin/documents');
  revalidatePath('/documents');
  return { success: true };
}
