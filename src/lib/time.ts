// Vreme u aplikaciji je beogradsko (Europe/Belgrade, sa letnjim računanjem),
// a server radi u UTC-u. Ove funkcije prevode između ta dva.
export const APP_TZ = 'Europe/Belgrade';

// Razlika (ms) između beogradskog i UTC vremena u datom trenutku.
function tzOffsetMs(instant: number, timeZone = APP_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - instant;
}

// "2026-11-14" + "18:30" (beogradsko vreme) -> ISO u UTC-u. Vraća null za neispravan unos.
export function localToUtcIso(date: string, time: string, timeZone = APP_TZ): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return null;
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  let utc = guess - tzOffsetMs(guess, timeZone);
  // Druga iteracija pokriva slučaj kad je pomak drugačiji oko promene sata.
  utc = guess - tzOffsetMs(utc, timeZone);
  return new Date(utc).toISOString();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sr-Latn-RS', { timeZone: APP_TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sr-Latn-RS', { timeZone: APP_TZ, hour: '2-digit', minute: '2-digit' });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('sr-Latn-RS', { timeZone: APP_TZ, weekday: 'long', day: 'numeric', month: 'long' });
}

// Današnji datum u Beogradu kao "YYYY-MM-DD" (za min vrednost u formi).
export function todayLocal(timeZone = APP_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
