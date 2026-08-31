import { Car, MapPin, Building2, Users } from 'lucide-react';
import { TransitWidget } from '@/components/resident/TransitWidget';

export const dynamic = 'force-dynamic';

const STAYS = [
  {
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=60',
    price: '120€/noć',
    name: 'Apartman 204 · Studio',
    meta: '2 gosta · 1 krevet',
  },
  {
    img: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=600&q=60',
    price: '850€/mesečno',
    name: 'Apartman 510 · 1 spavaća soba',
    meta: '4 gosta · 2 kreveta',
  },
  {
    img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=60',
    price: '80€/mesečno',
    name: 'Parking mesto · A',
    meta: '1 vozilo · Otvoreno',
  },
  {
    img: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=60',
    price: '250€/mesečno',
    name: 'Parking garaža · B2',
    meta: '1 vozilo · Zatvoreno',
  },
];

export default function MobilityPage() {
  return (
    <div>
      <p className="text-ink-soft text-sm mb-6 max-w-md">
        Besprekorna putovanja i kratkoročni boravci, ekskluzivno za stanare zgrade.
      </p>

      <div className="grid grid-cols-2 gap-4.5 mb-7">
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Car size={17} />
              Taksi služba
            </div>
            <span className="tag tag-gold">10% popust</span>
          </div>
          <p className="text-[12.5px] text-ink-soft mb-4">Premium flota, dostupna 24/7 za sve stanare.</p>
          <div className="flex gap-2.5">
            <button className="btn btn-navy flex-1">
              <MapPin size={15} />
              Na adresu
            </button>
            <button className="btn btn-outline flex-1">
              <Building2 size={15} />
              Sa adrese
            </button>
          </div>
        </div>

        <TransitWidget />
      </div>

      <div className="flex justify-between items-center mb-3.5">
        <p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint">Izdavanje</p>
      </div>
      <div className="grid grid-cols-2 gap-4.5">
        {STAYS.map((s) => (
          <div key={s.name} className="rounded-md overflow-hidden bg-white border border-line shadow-card">
            <div className="relative h-[170px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
              <span className="absolute top-2.5 right-2.5 bg-white px-2.5 py-1 rounded-full text-[11px] font-bold font-mono">
                {s.price}
              </span>
            </div>
            <div className="p-4">
              <div className="font-bold text-sm mb-1">{s.name}</div>
              <div className="text-[11.5px] text-ink-soft mb-3 flex items-center gap-1.5">
                <Users size={12} />
                {s.meta}
              </div>
              <button className="btn btn-gold w-full">Kontaktiraj vlasnika</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
