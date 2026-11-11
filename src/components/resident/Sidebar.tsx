'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Wallet, Car, Wrench, Megaphone, LogOut, Building2, Settings, CalendarDays, FileText } from 'lucide-react';
import { GateMark } from '@/components/GateMark';
import { logout } from '@/app/actions/auth';

const NAV = [
  { href: '/', label: 'Početna', icon: LayoutGrid },
  { href: '/payments', label: 'Plaćanja', icon: Wallet },
  { href: '/mobility', label: 'Mobilnost', icon: Car },
  { href: '/services', label: 'Servisni centar', icon: Wrench },
  { href: '/bulletin', label: 'Oglasna tabla', icon: Megaphone },
  { href: '/reservations', label: 'Rezervacije', icon: CalendarDays },
  { href: '/documents', label: 'Dokumenti', icon: FileText },
  { href: '/building', label: 'Moja zgrada', icon: Building2 },
  { href: '/settings', label: 'Podešavanja', icon: Settings },
];

export function Sidebar({ name, unit, buildingName }: { name: string; unit: string | null; buildingName: string }) {
  const pathname = usePathname();
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="w-[230px] shrink-0 bg-gradient-to-b from-navy-950 to-navy-800 text-white flex flex-col p-4 md:p-5 sticky top-0 h-[100dvh]">
      <div className="flex items-center gap-2.5 px-2 pr-10 md:pr-2 pb-4 md:pb-6 pt-1.5 shrink-0">
        <GateMark className="w-7 h-7" />
        <div>
          <div className="font-extrabold text-sm leading-tight">Kapije Vračara</div>
          <div className="text-[10.5px] text-white/50">Resident Hub</div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-2 px-2">
        <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-white/40 px-2.5 mb-2">Meni</div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 md:py-2.5 rounded-xl text-[13.5px] font-semibold mb-0.5 transition ${
                active ? 'bg-gold text-navy-950' : 'text-white/75 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 pt-3 md:pt-4 pb-[env(safe-area-inset-bottom)] border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-9 h-9 rounded-full bg-gold text-navy-950 font-extrabold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{name}</div>
            <div className="text-[10.5px] text-white/50 truncate">
              {unit ? `Stan ${unit} · ${buildingName}` : buildingName}
            </div>
          </div>
        </div>
        <form action={logout} className="mt-2.5">
          <button
            type="submit"
            className="btn btn-outline w-full !bg-transparent !text-white/80 !border-white/20 hover:!border-white hover:!text-white"
          >
            <LogOut size={15} />
            Odjava
          </button>
        </form>
      </div>
    </aside>
  );
}
