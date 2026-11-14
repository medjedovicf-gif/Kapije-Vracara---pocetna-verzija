// Jedinstveni prikaz datuma i vremena u celoj aplikaciji:
//   datum i vreme → "HH:MM DD.MM.YYYY"   (npr. 14:05 14.11.2026)
//   samo datum    → "DD.MM.YYYY"
// Uvek po beogradskom vremenu: Vercel server radi u UTC, pa bi bez
// eksplicitne zone vreme na serverski renderovanim stranicama kasnilo.

const TZ = 'Europe/Belgrade';

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type DateInput = string | number | Date | null | undefined;

function pieces(value: DateInput) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]));
  return { day: p.day, month: p.month, year: p.year, hour: p.hour, minute: p.minute };
}

/** "HH:MM DD.MM.YYYY" */
export function formatDateTime(value: DateInput, empty = '—') {
  const p = pieces(value);
  return p ? `${p.hour}:${p.minute} ${p.day}.${p.month}.${p.year}` : empty;
}

/** "DD.MM.YYYY". Kolone tipa date ("2026-11-14") se ne pomeraju kroz vremenske zone. */
export function formatDate(value: DateInput, empty = '—') {
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  }
  const p = pieces(value);
  return p ? `${p.day}.${p.month}.${p.year}` : empty;
}

/** "HH:MM" */
export function formatTime(value: DateInput, empty = '—') {
  const p = pieces(value);
  return p ? `${p.hour}:${p.minute}` : empty;
}
