import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { ReservationsClient } from '@/components/reservations/ReservationsClient';
import type { CommonSpace, SpaceBooking } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ReservationsPage() {
  const me = await getMyProfile();
  if (!me) redirect('/login');
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString();

  const [{ data: spaces }, { data: upcoming }, { data: mine }] = await Promise.all([
    supabase.from('common_spaces').select('*').eq('active', true).order('name').returns<CommonSpace[]>(),
    // Zauzeti termini u narednih 30 dana (aktivne rezervacije svih stanara zgrade).
    supabase.from('space_bookings').select('*').in('status', ['Na čekanju', 'Potvrđeno']).gte('ends_at', nowIso).lte('starts_at', in30).order('starts_at').returns<SpaceBooking[]>(),
    supabase.from('space_bookings').select('*').eq('resident_id', me.id).order('starts_at', { ascending: false }).limit(20).returns<SpaceBooking[]>(),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-navy-950">Rezervacije</h2>
        <p className="text-ink-soft text-sm mt-1">Rezervišite zajedničke prostore zgrade.</p>
      </div>
      <ReservationsClient spaces={spaces ?? []} upcoming={upcoming ?? []} mine={mine ?? []} myId={me.id} />
    </div>
  );
}
