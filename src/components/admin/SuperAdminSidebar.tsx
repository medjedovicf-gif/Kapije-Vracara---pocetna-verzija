'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Users, Wrench, Vote, Megaphone, Wallet, Settings, LogOut } from 'lucide-react';
import { GateMark } from '@/components/GateMark';
import { logout } from '@/app/actions/auth';

const NAV = [
  ['/super-admin', 'Pregled', LayoutDashboard], ['/super-admin/buildings', 'Zgrade', Building2],
  ['/super-admin/residents', 'Stanari', Users], ['/super-admin/tickets', 'Zahtevi za servis', Wrench],
  ['/super-admin/polls', 'Ankete', Vote], ['/super-admin/bulletin', 'Oglasna tabla', Megaphone],
  ['/super-admin/payments', 'Uplate', Wallet], ['/super-admin/users', 'Korisnici', Settings],
] as const;

export function SuperAdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return <aside className="w-[230px] shrink-0 bg-gradient-to-b from-navy-950 to-navy-800 text-white flex flex-col p-5 sticky top-0 h-screen">
    <div className="flex items-center gap-2.5 px-2 pb-6 pt-1.5"><GateMark className="w-7 h-7" /><div><div className="font-extrabold text-sm leading-tight">Kapije Vračara</div><div className="text-[10.5px] text-white/50">Super Admin</div></div></div>
    <nav className="flex-1"><div className="font-mono text-[10px] tracking-[0.12em] uppercase text-white/40 px-2.5 mb-2">Meni</div>{NAV.map(([href, label, Icon]) => <Link key={href} href={href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold mb-0.5 ${pathname === href ? 'bg-gold text-navy-950' : 'text-white/75 hover:bg-white/5 hover:text-white'}`}><Icon size={17}/>{label}</Link>)}</nav>
    <div className="pt-4 border-t border-white/10"><div className="flex items-center gap-2.5 px-2 py-1.5"><div className="w-9 h-9 rounded-full bg-gold text-navy-950 font-extrabold text-xs flex items-center justify-center">{initials}</div><div className="min-w-0"><div className="text-xs font-bold truncate">{name}</div><div className="text-[10.5px] text-white/50">Super Administrator</div></div></div><form action={logout} className="mt-2.5"><button type="submit" className="btn btn-outline w-full !bg-transparent !text-white/80 !border-white/20"><LogOut size={15}/>Odjava</button></form></div>
  </aside>;
}
