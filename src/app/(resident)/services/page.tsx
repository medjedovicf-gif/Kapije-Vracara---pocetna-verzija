import { createClient } from '@/lib/supabase/server';
import { getMyProfile, getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Wrench, Zap, Wind, Sparkles } from 'lucide-react';
import type { AuditLog, Profile, Ticket, TicketComment, TicketPhoto, TicketRating } from '@/lib/types';
import { ReportIssueButton } from '@/components/resident/ReportIssueButton';
import { ResidentTicketList } from '@/components/resident/ResidentTicketList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const CATEGORY_TILES = [
  { icon: Wrench, label: 'Vodoinstalater', sub: 'Curenja, popravke, instalacije', category: 'Vodoinstalacije' },
  { icon: Zap, label: 'Električar', sub: 'Kvarovi, ožičenje, rasveta', category: 'Elektrika' },
  { icon: Wind, label: 'Klima servis', sub: 'Servisiranje i punjenje gasa', category: 'Klima' },
  { icon: Sparkles, label: 'Čišćenje zgrade', sub: 'Zajedničke prostorije i hodnici', category: 'Čišćenje' },
];

export default async function ServicesPage() {
  const supabase = await createClient(); const user = await getSessionUser(); if (!user) redirect('/login');
  const profile = await getMyProfile(); if (!profile) redirect('/login');
  const { data: tickets } = await supabase.from('tickets').select('*').eq('reported_by', user.id).order('created_at', { ascending: false }).returns<Ticket[]>();
  const ids = (tickets ?? []).map((t) => t.id);
  const [{ data: photos }, { data: comments }, { data: logs }, { data: ratings }] = await Promise.all([
    ids.length ? supabase.from('ticket_photos').select('*').in('ticket_id', ids).returns<TicketPhoto[]>() : Promise.resolve({ data: [] as TicketPhoto[] }),
    ids.length ? supabase.from('ticket_comments').select('*').in('ticket_id', ids).order('created_at').returns<TicketComment[]>() : Promise.resolve({ data: [] as TicketComment[] }),
    ids.length ? supabase.from('audit_logs').select('*').in('entity_id', ids.map(String)).order('created_at').returns<AuditLog[]>() : Promise.resolve({ data: [] as AuditLog[] }),
    ids.length ? supabase.from('ticket_ratings').select('*').in('ticket_id', ids).returns<TicketRating[]>() : Promise.resolve({ data: [] as TicketRating[] }),
  ]);
  return <div><div className="flex flex-wrap gap-3 justify-between items-center mb-4"><div><p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint">Moje prijave</p><p className="text-ink-soft text-sm mt-1">Pratite status, komunikaciju, termine i istoriju svakog problema.</p></div><ReportIssueButton /></div><ResidentTicketList tickets={tickets ?? []} comments={comments ?? []} logs={logs ?? []} ratings={ratings ?? []} photos={photos ?? []} userId={user.id} /><p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mb-3 mt-8">Zakaži majstora</p><div className="grid grid-cols-2 gap-3">{CATEGORY_TILES.map(({ icon: Icon, label, sub, category }) => <div key={label} className="card flex items-center gap-3"><div className="w-10 h-10 rounded-[11px] bg-navy-950 flex items-center justify-center shrink-0"><Icon size={17} className="text-gold" /></div><div className="min-w-0"><div className="font-bold text-[13.5px]">{label}</div><div className="text-[11.5px] text-ink-soft">{sub}</div></div><div className="ml-auto shrink-0"><ReportIssueButton presetCategory={category} /></div></div>)}</div></div>;
}
