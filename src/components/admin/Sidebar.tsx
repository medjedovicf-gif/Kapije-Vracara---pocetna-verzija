'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity, BarChart3, Building2, ChevronDown, FileSpreadsheet, HardHat, Inbox, LayoutDashboard, LogOut,
  Megaphone, ReceiptText, UserCog, Users, Vote, Wallet, Wrench, type LucideIcon,
} from 'lucide-react';
import { GateMark } from '@/components/GateMark';
import { logout } from '@/app/actions/auth';

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { id: string; label: string; icon: LucideIcon; items: Item[] };

const TOP: Item[] = [
  { href: '/admin', label: 'Pregled', icon: LayoutDashboard },
  { href: '/admin/inbox', label: 'Inbox', icon: Inbox },
];

const GROUPS: Group[] = [
  {
    id: 'finance', label: 'Finansije', icon: Wallet, items: [
      { href: '/admin/payments', label: 'Uplate i zaduženja', icon: Wallet },
      { href: '/admin/expenses', label: 'Fakture i troškovi', icon: ReceiptText },
      { href: '/admin/finance', label: 'Finansijski izveštaj', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'maintenance', label: 'Održavanje', icon: Wrench, items: [
      { href: '/admin/tickets', label: 'Zahtevi za servis', icon: Wrench },
      { href: '/admin/planned-works', label: 'Planirani radovi', icon: HardHat },
      { href: '/admin/reports', label: 'Izveštaj održavanja', icon: BarChart3 },
    ],
  },
  {
    id: 'community', label: 'Stanari i komunikacija', icon: Users, items: [
      { href: '/admin/residents', label: 'Stanari', icon: Users },
      { href: '/admin/users', label: 'Korisnički nalozi', icon: UserCog },
      { href: '/admin/bulletin', label: 'Oglasna tabla', icon: Megaphone },
      { href: '/admin/polls', label: 'Ankete', icon: Vote },
    ],
  },
  {
    id: 'building', label: 'Zgrada', icon: Building2, items: [
      { href: '/admin/buildings', label: 'Podaci o zgradi', icon: Building2 },
      { href: '/admin/activity', label: 'Dnevnik aktivnosti', icon: Activity },
    ],
  },
];

const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

export function AdminSidebar({ name, buildingName }: { name: string; buildingName: string }) {
  const pathname = usePathname();
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const activeGroup = GROUPS.find((g) => g.items.some((i) => isActive(pathname, i.href)))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => (activeGroup ? { [activeGroup]: true } : {}));
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !(o[id] ?? id === activeGroup) }));

  return (
    <aside className="w-[240px] shrink-0 bg-gradient-to-b from-navy-950 to-navy-800 text-white flex flex-col p-4 md:p-5 sticky top-0 h-[100dvh]">
      <div className="flex items-center gap-2.5 px-2 pr-10 md:pr-2 pb-4 md:pb-5 pt-1.5 shrink-0">
        <GateMark className="w-7 h-7" />
        <div className="min-w-0">
          <div className="font-extrabold text-sm leading-tight">Kapije Vračara</div>
          <div className="text-[10.5px] text-white/50 truncate">{buildingName}</div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-2 px-2 space-y-0.5" aria-label="Glavni meni">
        {TOP.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}

        <div className="h-3" />
        {GROUPS.map((g) => {
          const expanded = open[g.id] ?? g.id === activeGroup;
          const hasActive = g.id === activeGroup;
          return (
            <div key={g.id}>
              <button type="button" onClick={() => toggle(g.id)} aria-expanded={expanded}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition ${hasActive && !expanded ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'}`}>
                <g.icon size={17} />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown size={15} className={`text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && (
                <div className="ml-[18px] pl-3 border-l border-white/10 mt-0.5 mb-1.5 space-y-0.5">
                  {g.items.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} sub />)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 pt-3 md:pt-4 pb-[env(safe-area-inset-bottom)] border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-9 h-9 rounded-full bg-sage text-white font-extrabold text-xs flex items-center justify-center shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{name}</div>
            <div className="text-[10.5px] text-white/50 truncate">Upravnik zgrade</div>
          </div>
        </div>
        <form action={logout} className="mt-2.5">
          <button type="submit" className="btn btn-outline w-full !bg-transparent !text-white/80 !border-white/20 hover:!border-white hover:!text-white">
            <LogOut size={15} />
            Odjava
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({ item, active, sub }: { item: Item; active: boolean; sub?: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-xl font-semibold transition ${sub ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-3 py-2 text-[13px]'} ${active ? 'bg-sage text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
      {!sub && <Icon size={17} />}
      {item.label}
    </Link>
  );
}
