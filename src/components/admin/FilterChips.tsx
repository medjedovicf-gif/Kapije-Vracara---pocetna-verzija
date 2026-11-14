import Link from 'next/link';

/** Red filtera kao linkova (radi bez JavaScript-a, filter ostaje u adresi). */
export function FilterChips({ label, param, options, current, hrefFor }: {
  label: string;
  param: string;
  options: { value: string; label: string; count?: number }[];
  current?: string;
  hrefFor: (param: string, value: string | undefined) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10.5px] font-mono uppercase tracking-wide text-ink-faint mr-1">{label}</span>
      <Link href={hrefFor(param, undefined)} className={`tag !text-[10.5px] ${!current ? '!bg-navy-950 !text-white' : 'bg-white border border-line text-ink-soft hover:border-navy-950'}`}>Sve</Link>
      {options.map((o) => (
        <Link key={o.value} href={hrefFor(param, current === o.value ? undefined : o.value)}
          className={`tag !text-[10.5px] ${current === o.value ? '!bg-navy-950 !text-white' : 'bg-white border border-line text-ink-soft hover:border-navy-950'}`}>
          {o.label}{o.count !== undefined && <span className="opacity-60 ml-1">{o.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function makeHref(base: string, params: Record<string, string | undefined>) {
  return (param: string, value: string | undefined) => {
    const next = { ...params, [param]: value };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `${base}${qs ? `?${qs}` : ''}`;
  };
}
