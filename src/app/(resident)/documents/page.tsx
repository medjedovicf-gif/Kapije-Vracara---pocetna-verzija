import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { DocumentList } from '@/components/documents/DocumentList';
import type { BuildingDocument } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const me = await getMyProfile();
  if (!me) redirect('/login');
  const supabase = await createClient();
  // RLS vraća samo vidljive dokumente stanarove zgrade.
  const { data } = await supabase.from('building_documents').select('*').order('created_at', { ascending: false }).returns<BuildingDocument[]>();

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-navy-950">Dokumenti zgrade</h2>
        <p className="text-ink-soft text-sm mt-1">Zapisnici, ugovori, pravilnik kućnog reda i ostali dokumenti.</p>
      </div>
      <DocumentList documents={data ?? []} />
    </div>
  );
}
