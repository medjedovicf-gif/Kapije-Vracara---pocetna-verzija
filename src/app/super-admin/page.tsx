import { createClient } from '@/lib/supabase/server';
import { Building2, Users, Wrench, Wallet } from 'lucide-react';
import type { Building, Profile, Ticket } from '@/lib/types';

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const [{ data: buildings }, { data: profiles }, { data: tickets }] = await Promise.all([
    supabase.from('buildings').select('*').returns<Building[]>(), supabase.from('profiles').select('*').returns<Profile[]>(), supabase.from('tickets').select('*').neq('status','Rešeno').returns<Ticket[]>()
  ]);
  const residents = (profiles ?? []).filter(p => p.role === 'resident');
  const owed = residents.reduce((sum, p) => sum + p.balance, 0);
  const stats = [[Building2, buildings?.length ?? 0, 'Zgrada na platformi'], [Users, residents.length, 'Aktivnih stanova'], [Wallet, `${owed.toLocaleString('de-DE')} RSD`, 'Ukupno potraživanje'], [Wrench, tickets?.length ?? 0, 'Otvorenih zahteva']] as const;
  return <div><p className="text-ink-soft text-sm mb-6">Centralni pregled svih zgrada i aktivnosti na platformi.</p><div className="grid grid-cols-4 gap-4 mb-7">{stats.map(([Icon,value,label]) => <div className="card" key={label}><div className="w-[34px] h-[34px] rounded-[10px] bg-cream-2 flex items-center justify-center mb-2.5"><Icon size={16}/></div><div className="font-display font-semibold text-[22px]">{value}</div><div className="text-[11.5px] text-ink-soft">{label}</div></div>)}</div><div className="card"><h2 className="font-display text-lg font-semibold mb-4">Zgrade</h2><table className="w-full text-[13px]"><tbody>{(buildings ?? []).map(b => <tr key={b.id} className="border-b border-line"><td className="py-3 font-bold">{b.name}</td><td className="py-3 text-right">{residents.filter(r => r.building_id === b.id).length} stanova</td></tr>)}</tbody></table>{!buildings?.length && <p className="text-sm text-ink-faint">Nema unetih zgrada.</p>}</div></div>;
}
