import { createClient } from '@/lib/supabase/server';
import type { Building, Profile, Ticket, Poll, BulletinPost, Invoice } from '@/lib/types';

type Kind = 'buildings'|'residents'|'tickets'|'polls'|'bulletin'|'payments'|'users';
export async function SuperAdminResourcePage({ kind }: { kind: Kind }) {
  const supabase = await createClient();
  const title: Record<Kind,string> = { buildings:'Zgrade', residents:'Stanari', tickets:'Zahtevi za servis', polls:'Ankete', bulletin:'Oglasna tabla', payments:'Uplate', users:'Korisnici' };
  const [b, p, t, polls, posts, invoices] = await Promise.all([
    supabase.from('buildings').select('*').returns<Building[]>(), supabase.from('profiles').select('*').returns<Profile[]>(), supabase.from('tickets').select('*').order('created_at',{ascending:false}).returns<Ticket[]>(), supabase.from('polls').select('*').order('created_at',{ascending:false}).returns<Poll[]>(), supabase.from('bulletin_posts').select('*').order('created_at',{ascending:false}).returns<BulletinPost[]>(), supabase.from('invoices').select('*').order('created_at',{ascending:false}).returns<Invoice[]>()
  ]);
  const buildings = b.data ?? [], profiles = p.data ?? [];
  const rows = kind === 'buildings' ? buildings.map(x => [x.name, `${profiles.filter(p => p.building_id === x.id && p.role === 'resident').length} stanova`]) :
    kind === 'residents' ? profiles.filter(x => x.role === 'resident').map(x => [x.name, `Stan ${x.unit ?? '—'}`, x.payment_status]) :
    kind === 'tickets' ? (t.data ?? []).map(x => [`${x.title} (#${x.id})`, `Stan ${x.unit}`, x.status]) :
    kind === 'polls' ? (polls.data ?? []).map(x => [x.title, x.status === 'active' ? 'Aktivna' : 'Zatvorena']) :
    kind === 'bulletin' ? (posts.data ?? []).map(x => [x.title, x.author_name]) :
    kind === 'payments' ? (invoices.data ?? []).map(x => [`Stan ${x.unit}`, `${x.amount.toLocaleString('de-DE')} RSD`, x.status]) :
    profiles.map(x => [x.name, x.role, buildings.find(b => b.id === x.building_id)?.name ?? '—']);
  return <div><div className="flex justify-between items-center mb-5"><div><h2 className="font-display text-2xl font-semibold text-navy-950">{title[kind]}</h2><p className="text-ink-soft text-sm mt-1">Centralni pregled svih podataka na platformi.</p></div></div><div className="card"><table className="w-full text-[13px]"><tbody>{rows.map((row,i) => <tr key={i} className="border-b border-line last:border-none">{row.map((cell,j) => <td key={j} className={`py-3 ${j===0?'font-bold':''}`}>{cell}</td>)}</tr>)}{!rows.length && <tr><td className="py-4 text-ink-faint">Nema podataka.</td></tr>}</tbody></table></div></div>;
}
