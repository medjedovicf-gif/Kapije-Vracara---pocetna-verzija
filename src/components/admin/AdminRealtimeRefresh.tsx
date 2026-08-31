'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AdminRealtimeRefresh({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`admin-dashboard:${buildingId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `building_id=eq.${buildingId}` }, () => router.refresh()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [buildingId, router]);
  return null;
}
