import { redirect } from 'next/navigation';
import { CalendarClock, DoorOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { BookingDecision, NewSpaceButton, SpaceToggle } from '@/components/reservations/ReservationsAdmin';
import { BOOKING_STATUS_TAG } from '@/lib/labels';
import { formatDateTime, formatTime } from '@/lib/time';
import type { CommonSpace, Profile, SpaceBooking } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminReservationsPage() {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) redirect('/login');
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ data: spaces }, { data: bookings }, { data: residents }] = await Promise.all([
    supabase.from('common_spaces').select('*').eq('building_id', me.building_id).order('name').returns<CommonSpace[]>(),
    supabase.from('space_bookings').select('*').eq('building_id', me.building_id).gte('ends_at', nowIso).order('starts_at').limit(100).returns<SpaceBooking[]>(),
    supabase.from('profiles').select('id, name, unit').eq('building_id', me.building_id).returns<Pick<Profile, 'id' | 'name' | 'unit'>[]>(),
  ]);

  const spaceName = (id: number) => (spaces ?? []).find((s) => s.id === id)?.name ?? 'Prostor';
  const who = (id: string) => {
    const p = (residents ?? []).find((r) => r.id === id);
    return p ? `${p.name}${p.unit ? ` · stan ${p.unit}` : ''}` : 'Stanar';
  };
  const pending = (bookings ?? []).filter((b) => b.status === 'Na čekanju');
  const confirmed = (bookings ?? []).filter((b) => b.status === 'Potvrđeno');

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy-950">Rezervacije</h2>
          <p className="text-ink-soft text-sm mt-1">Zahtevi stanara i zajednički prostori zgrade.</p>
        </div>
        <NewSpaceButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="space-y-5">
          <section className="card !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="font-display text-lg font-semibold">Čeka odobrenje</h3>
              <span className="tag tag-gold">{pending.length}</span>
            </div>
            {!pending.length && <p className="text-sm text-ink-soft px-5 pb-4">Nema zahteva na čekanju.</p>}
            {pending.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-line">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-[#FBEFD3] flex items-center justify-center"><CalendarClock size={14} className="text-gold-dark" /></div>
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[13px] font-semibold">{spaceName(b.space_id)} · {formatDateTime(b.starts_at)}–{formatTime(b.ends_at)}</div>
                  <div className="text-[11px] text-ink-soft">{who(b.resident_id)}{b.note ? ` · „${b.note}“` : ''}</div>
                </div>
                <BookingDecision id={b.id} mode="decide" />
              </div>
            ))}
          </section>

          <section className="card !p-0 overflow-hidden">
            <h3 className="font-display text-lg font-semibold px-5 pt-4 pb-2">Potvrđene (predstojeće)</h3>
            {!confirmed.length && <p className="text-sm text-ink-soft px-5 pb-4">Nema potvrđenih rezervacija.</p>}
            {confirmed.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-line">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[13px] font-semibold">{spaceName(b.space_id)} · {formatDateTime(b.starts_at)}–{formatTime(b.ends_at)}</div>
                  <div className="text-[11px] text-ink-soft">{who(b.resident_id)}</div>
                </div>
                <span className={`tag ${BOOKING_STATUS_TAG[b.status]}`}>{b.status}</span>
                <BookingDecision id={b.id} mode="cancel" />
              </div>
            ))}
          </section>
        </div>

        <aside className="card !p-0 overflow-hidden lg:sticky lg:top-24">
          <h3 className="font-display text-base font-semibold px-4 pt-4 pb-2">Prostori</h3>
          {!(spaces ?? []).length && (
            <div className="px-4 pb-4 text-sm text-ink-soft flex items-start gap-2"><DoorOpen size={16} className="shrink-0 mt-0.5" />Dodajte prvi prostor (npr. zajednička prostorija, vešernica, parking za goste).</div>
          )}
          {(spaces ?? []).map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-t border-line">
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-semibold truncate ${s.active ? '' : 'text-ink-faint line-through'}`}>{s.name}</div>
                <div className="text-[11px] text-ink-soft">do {s.max_hours} h · {s.requires_approval ? 'uz odobrenje' : 'automatski'}</div>
              </div>
              <SpaceToggle id={s.id} active={s.active} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
