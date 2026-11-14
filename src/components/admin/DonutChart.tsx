import Link from 'next/link';

export type DonutSlice = { label: string; value: number; color: string; href?: string };

/** Mali donut grafikon sa legendom. Bez biblioteke, renderuje se na serveru. */
export function DonutChart({ title, slices, center, centerSub, empty = 'Nema podataka.', format = (n: number) => String(n), action }: {
  title: string;
  slices: DonutSlice[];
  center: string;
  centerSub: string;
  empty?: string;
  format?: (n: number) => string;
  action?: { href: string; label: string };
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  const gap = slices.filter((s) => s.value > 0).length > 1 ? 1.5 : 0;
  let offset = 0;

  return (
    <div className="card !p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-navy-950">{title}</h3>
        {action && <Link href={action.href} className="text-[11.5px] text-gold-dark font-semibold hover:underline">{action.label}</Link>}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-[104px] h-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label={title}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#EFE7D6" strokeWidth="13" />
            {total > 0 && slices.map((s) => {
              if (s.value <= 0) return null;
              const len = (s.value / total) * c;
              const el = (
                <circle key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="13"
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-offset}>
                  <title>{`${s.label}: ${format(s.value)}`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
            <span className="font-display font-semibold text-[15px] text-navy-950">{center}</span>
            <span className="text-[9.5px] text-ink-faint uppercase tracking-wide font-mono">{centerSub}</span>
          </div>
        </div>
        <ul className="flex-1 min-w-0 space-y-1">
          {total === 0 && <li className="text-xs text-ink-faint">{empty}</li>}
          {total > 0 && slices.filter((s) => s.value > 0).map((s) => {
            const row = (
              <>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="flex-1 truncate">{s.label}</span>
                <span className="font-mono text-ink-soft tabular-nums">{format(s.value)}</span>
                <span className="font-mono text-ink-faint w-9 text-right tabular-nums">{Math.round((s.value / total) * 100)}%</span>
              </>
            );
            return (
              <li key={s.label}>
                {s.href
                  ? <Link href={s.href} className="row-link flex items-center gap-2 text-[11.5px] -mx-1.5 px-1.5 py-0.5 rounded-md">{row}</Link>
                  : <div className="flex items-center gap-2 text-[11.5px] py-0.5">{row}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export const CHART_COLORS = ['#10152A', '#6F9C87', '#E4B23C', '#B96A4A', '#3E6857', '#C0912A', '#6B7080', '#9C5439', '#9A9DA8'];
