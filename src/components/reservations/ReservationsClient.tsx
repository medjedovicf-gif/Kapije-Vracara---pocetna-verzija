'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, Clock3, DoorOpen, X } from 'lucide-react';
import { cancelBooking, createBooking } from '@/app/actions/reservations';
import { formatDateTime, formatDay, formatTime, todayLocal } from '@/lib/time';
import type { CommonSpace, SpaceBooking } from '@/lib/types';
import { BOOKING_STATUS_TAG as STATUS_TAG } from '@/lib/labels';

export function ReservationsClient({ spaces, upcoming, mine, myId }: { spaces: CommonSpace[]; upcoming: SpaceBooking[]; mine: SpaceBooking[]; myId: string }) {
  const router = useRouter();
  const [spaceId, setSpaceId] = useState<number | null>(spaces[0]?.id ?? null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const space = spaces.find((s) => s.id === spaceId) ?? null;
  const spaceName = (id: number) => spaces.find((s) => s.id === id)?.name ?? 'Prostor';

  // Zauzeti termini izabranog prostora, grupisani po danu.
  const taken = useMemo(() => {
    const list = upcoming.filter((b) => b.space_id === spaceId);
    const byDay = new Map<string, SpaceBooking[]>();
    for (const b of list) byDay.set(formatDay(b.starts_at), [...(byDay.get(formatDay(b.starts_at)) ?? []), b]);
    return [...byDay.entries()];
  }, [upcoming, spaceId]);

  const now = Date.now();
  const myUpcoming = mine.filter((b) => new Date(b.ends_at).getTime() >= now);
  const myPast = mine.filter((b) => new Date(b.ends_at).getTime() < now).slice(0, 5);

  function submit(formData: FormData) {
    setError(''); setMessage('');
    start(async () => {
      const result = await createBooking(formData);
      if ('error' in result && result.error) { setError(result.error); return; }
      setMessage(result.status === 'Potvrđeno' ? 'Rezervacija je potvrđena.' : 'Zahtev je poslat upravi na odobrenje.');
      router.refresh();
    });
  }

  if (!spaces.length) {
    return (
      <div className="card text-center py-10">
        <DoorOpen size={22} className="mx-auto text-ink-faint mb-2" />
        <p className="text-sm text-ink-soft">Uprava još nije dodala zajedničke prostore za rezervaciju.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <div className="space-y-5">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {spaces.map((s) => (
            <button key={s.id} onClick={() => { setSpaceId(s.id); setError(''); setMessage(''); }} className={`btn shrink-0 ${s.id === spaceId ? 'btn-navy' : 'btn-outline'} !px-4 !py-2 !text-xs`}>
              {s.name}
            </button>
          ))}
        </div>

        {space && (
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-navy-950">{space.name}</h3>
            {space.description && <p className="text-sm text-ink-soft mt-1">{space.description}</p>}
            <p className="text-[11.5px] text-ink-faint mt-2">
              Najduže {space.max_hours} h · {space.requires_approval ? 'potrebno odobrenje uprave' : 'potvrda odmah'}
            </p>

            <form action={submit} className="mt-4 grid grid-cols-2 gap-2.5">
              <input type="hidden" name="space_id" value={space.id} />
              <label className="col-span-2"><span className="field-label">Datum</span><input name="date" type="date" required min={todayLocal()} defaultValue={todayLocal()} className="field-input" /></label>
              <label><span className="field-label">Od</span><input name="from" type="time" required step={900} defaultValue="18:00" className="field-input" /></label>
              <label><span className="field-label">Do</span><input name="to" type="time" required step={900} defaultValue="20:00" className="field-input" /></label>
              <label className="col-span-2"><span className="field-label">Napomena (opciono)</span><input name="note" maxLength={300} className="field-input" placeholder="npr. rođendan, 10 osoba" /></label>
              {error && <p className="col-span-2 text-brick text-xs">{error}</p>}
              {message && <p className="col-span-2 text-sage-dark text-xs font-semibold">{message}</p>}
              <button disabled={pending} className="btn btn-gold col-span-2 disabled:opacity-60"><CalendarDays size={15} />{pending ? 'Šaljem…' : 'Rezerviši'}</button>
            </form>
          </div>
        )}

        <div className="card">
          <h3 className="font-display text-base font-semibold mb-3">Zauzeti termini (30 dana)</h3>
          {!taken.length && <p className="text-sm text-ink-soft">Nema zauzetih termina. Prostor je slobodan.</p>}
          {taken.map(([day, list]) => (
            <div key={day} className="mb-3 last:mb-0">
              <div className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">{day}</div>
              <div className="flex flex-wrap gap-1.5">
                {list.map((b) => (
                  <span key={b.id} className={`tag ${b.resident_id === myId ? 'tag-sage' : 'tag-gold'}`}>
                    {formatTime(b.starts_at)}–{formatTime(b.ends_at)}{b.resident_id === myId ? ' · vi' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="card !p-0 overflow-hidden lg:sticky lg:top-24">
        <h3 className="font-display text-base font-semibold px-4 pt-4 pb-2">Moje rezervacije</h3>
        {!myUpcoming.length && <p className="text-sm text-ink-soft px-4 pb-4">Nemate predstojećih rezervacija.</p>}
        {myUpcoming.map((b) => <MyBooking key={b.id} booking={b} name={spaceName(b.space_id)} cancellable />)}
        {myPast.length > 0 && <div className="px-4 py-2 border-t border-line bg-cream/60 font-mono text-[10px] uppercase tracking-wide text-ink-faint">Prethodne</div>}
        {myPast.map((b) => <MyBooking key={b.id} booking={b} name={spaceName(b.space_id)} />)}
      </aside>
    </div>
  );
}

function MyBooking({ booking, name, cancellable = false }: { booking: SpaceBooking; name: string; cancellable?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const canCancel = cancellable && (booking.status === 'Na čekanju' || booking.status === 'Potvrđeno');
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-line">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-cream-2 flex items-center justify-center"><Clock3 size={14} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold truncate">{name}</div>
        <div className="text-[11px] text-ink-soft">{formatDateTime(booking.starts_at)}–{formatTime(booking.ends_at)}</div>
      </div>
      <span className={`tag ${STATUS_TAG[booking.status] ?? 'tag-gold'}`}>{booking.status}</span>
      {canCancel && (
        <button
          title="Otkaži"
          aria-label="Otkaži rezervaciju"
          disabled={pending}
          onClick={() => { if (confirm('Otkazati ovu rezervaciju?')) start(async () => { await cancelBooking(booking.id); router.refresh(); }); }}
          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-ink-faint hover:text-brick hover:bg-brick-soft disabled:opacity-40"
        >
          <X size={15} />
        </button>
      )}
      {!canCancel && booking.status === 'Potvrđeno' && <Check size={15} className="text-sage shrink-0" />}
    </div>
  );
}
