import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentRowActions, UploadDocumentButton } from '@/components/documents/DocumentAdmin';
import type { BuildingDocument } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDocumentsPage() {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const supabase = await createClient();
  const { data } = await supabase.from('building_documents').select('*').eq('building_id', me.building_id).order('created_at', { ascending: false }).returns<BuildingDocument[]>();

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy-950">Dokumenti</h2>
          <p className="text-ink-soft text-sm mt-1">Zapisnici, ugovori, računi i pravilnici. Fajlovi su privatni i otvaraju se samo prijavljenima.</p>
        </div>
        <UploadDocumentButton />
      </div>
      <DocumentList documents={data ?? []} showVisibility actions={(doc) => <DocumentRowActions doc={doc} />} />
    </div>
  );
}
