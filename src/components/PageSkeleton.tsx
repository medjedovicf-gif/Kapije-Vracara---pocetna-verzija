// Prikazuje se odmah pri prelasku na drugu stranicu, dok server sprema podatke.
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Učitavanje">
      <div className="h-6 w-48 rounded-md bg-cream-2 mb-2" />
      <div className="h-3.5 w-72 max-w-full rounded bg-cream-2 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card !p-4">
            <div className="w-8 h-8 rounded-[10px] bg-cream-2 mb-3" />
            <div className="h-5 w-12 rounded bg-cream-2 mb-1.5" />
            <div className="h-3 w-20 rounded bg-cream-2" />
          </div>
        ))}
      </div>
      <div className="card !p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-line last:border-0">
            <div className="w-8 h-8 rounded-lg bg-cream-2 shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-2/3 rounded bg-cream-2 mb-1.5" />
              <div className="h-3 w-1/3 rounded bg-cream-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
