import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BuildingDocument } from '@/lib/types';

// Preuzimanje dokumenta: pravo se proverava kroz RLS (stanar vidi samo vidljive dokumente
// svoje zgrade), pa se preusmerava na potpisani link koji važi 60 sekundi.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docId = Number(id);
  if (!Number.isInteger(docId)) return NextResponse.json({ error: 'Neispravan dokument.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: doc } = await supabase.from('building_documents').select('*').eq('id', docId).single<BuildingDocument>();
  if (!doc) return NextResponse.json({ error: 'Dokument nije dostupan.' }, { status: 404 });

  const inline = new URL(request.url).searchParams.get('view') === '1';
  const { data, error } = await createAdminClient()
    .storage.from('building-documents')
    .createSignedUrl(doc.storage_path, 60, inline ? undefined : { download: doc.file_name });
  if (error || !data) return NextResponse.json({ error: 'Preuzimanje trenutno nije moguće.' }, { status: 502 });

  return NextResponse.redirect(data.signedUrl);
}
