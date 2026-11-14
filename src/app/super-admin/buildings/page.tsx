import { createClient } from '@/lib/supabase/server';
import { BuildingDetails, BuildingFormButton } from '@/components/BuildingForm';
import { fullAddress } from '@/lib/buildings';
import type { Building } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('buildings').select('*').order('name').returns<Building[]>();
  const buildings = data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy-950">Zgrade</h2>
          <p className="text-ink-soft text-sm mt-1">Stambene zajednice i njihovi podaci. Adminima se zgrada dodeljuje u Korisnici.</p>
        </div>
        <BuildingFormButton building={null} />
      </div>

      <div className="space-y-4">
        {buildings.map((b) => (
          <details key={b.id} className="card !p-0 overflow-hidden group">
            <summary className="flex flex-wrap items-center gap-3 px-5 py-4 cursor-pointer list-none row-link">
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold text-[14px] text-navy-950">{b.name}{b.code && <span className="ml-2 font-mono text-[11px] text-ink-faint">{b.code}</span>}</div>
                <div className="text-[12px] text-ink-soft">{fullAddress(b) || 'Adresa nije uneta'}</div>
              </div>
              <span className="text-[11.5px] text-gold-dark font-semibold group-open:hidden">Prikaži podatke ↓</span>
              <span className="text-[11.5px] text-gold-dark font-semibold hidden group-open:inline">Sakrij ↑</span>
            </summary>
            <div className="px-5 pb-5 pt-1 border-t border-line">
              <div className="flex justify-end mb-3 pt-3"><BuildingFormButton building={b} variant="outline" /></div>
              <BuildingDetails building={b} />
            </div>
          </details>
        ))}
        {!buildings.length && <p className="card text-[13px] text-ink-soft">Još nema zgrada. Dodajte prvu preko dugmeta „Dodaj stambenu zajednicu“.</p>}
      </div>
    </div>
  );
}
