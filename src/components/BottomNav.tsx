'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Inbox, LayoutDashboard, LayoutGrid, Megaphone, Menu, Users, Wallet, Wrench, type LucideIcon } from 'lucide-react';

export type DashboardRole = 'resident' | 'admin' | 'superadmin';

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const ITEMS: Record<DashboardRole, Item[]> = {
  resident: [
    { href: '/', label: 'Početna', icon: LayoutGrid, exact: true },
    { href: '/payments', label: 'Plaćanja', icon: Wallet },
    { href: '/services', label: 'Servis', icon: Wrench },
    { href: '/bulletin', label: 'Oglasi', icon: Megaphone },
  ],
  admin: [
    { href: '/admin', label: 'Pregled', icon: LayoutDashboard, exact: true },
    { href: '/admin/inbox', label: 'Inbox', icon: Inbox },
    { href: '/admin/tickets', label: 'Problemi', icon: Wrench },
    { href: '/admin/residents', label: 'Stanari', icon: Users },
  ],
  superadmin: [
    { href: '/super-admin', label: 'Pregled', icon: LayoutDashboard, exact: true },
    { href: '/super-admin/buildings', label: 'Zgrade', icon: Building2 },
    { href: '/super-admin/tickets', label: 'Zahtevi', icon: Wrench },
    { href: '/super-admin/users', label: 'Korisnici', icon: Users },
  ],
};

// Donji meni na telefonu (kao u aplikacijama). "Meni" otvara ceo bočni meni.
export function BottomNav({ role, onMenu, menuOpen }: { role: DashboardRole; onMenu: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const isActive = (item: Item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const anyActive = ITEMS[role].some(isActive);

  const cell = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-1 h-full text-[10.5px] font-semibold transition-colors active:scale-95 ${active ? 'text-navy-950' : 'text-ink-faint'}`;
  const indicator = <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-gold" />;

  return (
    <nav
      aria-label="Glavni meni"
      className="md:hidden fixed inset-x-0 bottom-0 z-[150] bg-white/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-[60px]">
        {ITEMS[role].map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cell(active)} aria-current={active ? 'page' : undefined}>
              {active && indicator}
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
        <button onClick={onMenu} className={cell(menuOpen || !anyActive)} aria-label="Otvori ceo meni" aria-expanded={menuOpen}>
          {(menuOpen || !anyActive) && indicator}
          <Menu size={20} />
          Meni
        </button>
      </div>
    </nav>
  );
}
