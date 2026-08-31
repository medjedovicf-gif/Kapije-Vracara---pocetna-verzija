import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AuditLog, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(); if (!me || me.role !== 'admin') redirect('/login');
  const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).returns<AuditLog[]>();
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Activity Log</h2><p className="text-ink-soft text-sm mt-1">Pregled važnih akcija u sistemu.</p></div><div className="card">{(logs ?? []).map((log) => <div key={log.id} className="py-3 border-b border-line last:border-0"><div className="font-semibold text-sm">{log.summary}</div><div className="text-[11px] text-ink-soft mt-1">{log.action} · {new Date(log.created_at).toLocaleString('sr-RS')} · {log.actor_id === user.id ? 'Vi' : 'drugi korisnik'}</div></div>)}{!logs?.length && <p className="text-sm text-ink-soft">Nema zabeleženih aktivnosti.</p>}</div></div>;
}
