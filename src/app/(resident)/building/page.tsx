import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Building2, Megaphone } from 'lucide-react';
import type { Building, BulletinPost, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient(); const user = await getSessionUser(); if (!user) redirect('/login');
  const profile = await getMyProfile(); if (!profile) redirect('/login');
  const [{ data: building }, { data: posts }] = await Promise.all([profile.building_id ? supabase.from('buildings').select('*').eq('id', profile.building_id).single<Building>() : Promise.resolve({ data: null }), supabase.from('bulletin_posts').select('*').or(`building_id.is.null,building_id.eq.${profile.building_id}`).order('created_at', { ascending: false }).limit(10).returns<BulletinPost[]>()]);
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">My Building</h2><p className="text-ink-soft text-sm mt-1">Informacije i obaveštenja objekta kome pripadate.</p></div><div className="card mb-5"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-cream-2 flex items-center justify-center"><Building2 size={20} className="text-navy-950" /></div><div><div className="font-display text-xl font-semibold">{building?.name ?? 'Nije dodeljena zgrada'}</div><div className="text-sm text-ink-soft">Stan {profile.unit ?? '—'} · Kontakt upravnika je dostupan preko administracije.</div></div></div></div><h3 className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mb-3">Aktivna obaveštenja</h3>{(posts ?? []).map((p) => <div className="card mb-3" key={p.id}><div className="flex gap-2"><Megaphone size={16} className="text-gold-dark" /><div><div className="font-bold text-sm">{p.title}</div><div className="text-xs text-ink-soft mt-1">{p.body}</div><div className="text-[10px] text-ink-faint mt-2">{new Date(p.created_at).toLocaleString('sr-RS')}</div></div></div></div>)}{!posts?.length && <p className="text-sm text-ink-soft">Nema novih obaveštenja.</p>}</div>;
}
