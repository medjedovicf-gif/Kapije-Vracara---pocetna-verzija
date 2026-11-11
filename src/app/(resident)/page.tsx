import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Bell, CreditCard, Bus, Wallet, Wrench, Vote, Plus, Megaphone } from 'lucide-react';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');

  const [{ count: openTickets }, { count: activePolls }, { count: inProgress }, { count: resolvedTickets }, { count: unreadNotifications }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('unit', profile.unit ?? '')
      .neq('status', 'Rešeno'),
    supabase
      .from('polls')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`building_id.is.null,building_id.eq.${profile.building_id}`),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('reported_by', profile.id).eq('status', 'U toku'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('reported_by', profile.id).eq('status', 'Rešeno'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', profile.id).eq('read', false).eq('dismissed', false),
  ]);

  const firstName = profile.name.split(' ')[0];

  return (
    <div>
      {/* HERO */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-navy-950 to-navy-800 text-white p-5 md:p-8 mb-6">
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-gold/20 blur-3xl" />
        <h2 className="relative font-display font-semibold text-[24px] md:text-[30px] leading-tight mb-2">Dobrodošao nazad, {firstName} 👋</h2>
        <p className="relative text-white/70 text-[13.5px] max-w-md mb-5">
          Evo pregleda tvog stana — stanje, otvoreni zahtevi i aktivne ankete na jednom mestu.
        </p>
        <div className="relative flex gap-2.5 flex-wrap">
          <a href="/payments" className="btn btn-gold">
            <CreditCard size={15} />
            Plati stanarinu
          </a>
          <a href="/mobility" className="btn !bg-white/10 !text-white border border-white/20">
            <Bus size={15} />
            Red vožnje
          </a>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <StatCard icon={Wallet} label="RSD stanje" value={profile.balance.toLocaleString('de-DE')} tag={profile.payment_status} />
        <StatCard icon={Wrench} label="Otvorenih zahteva" value={String(openTickets ?? 0)} tag={openTickets ? 'U toku' : 'Sve rešeno'} />
        <StatCard icon={Vote} label="Aktivnih anketa" value={String(activePolls ?? 0)} tag="Glasaj" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <MiniStat label="U obradi" value={String(inProgress ?? 0)} />
        <MiniStat label="Rešeno" value={String(resolvedTickets ?? 0)} />
        <MiniStat label="Nepročitane notifikacije" value={String(unreadNotifications ?? 0)} />
        <a href="/bulletin" className="card hover:bg-cream-2"><Megaphone size={15} className="text-gold-dark mb-2" /><div className="font-semibold text-sm">Obaveštenja zgrade</div><div className="text-[11px] text-ink-soft">Pogledaj novosti →</div></a>
      </div>

      <p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mb-3">Brze akcije</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7"><a href="/services" className="btn btn-gold justify-center"><Plus size={15} />Prijavi problem</a><a href="/services" className="btn btn-outline justify-center"><Wrench size={15} />Moje prijave</a><a href="/bulletin" className="btn btn-outline justify-center"><Bell size={15} />Notifikacije</a></div>

      <p className="font-mono text-[11px] tracking-wide uppercase text-ink-faint mb-3">Brzi pristup</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <QuickTile href="/services" title="Zakaži majstora" img="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=500&q=60" />
        <QuickTile href="/mobility" title="Zakaži taksi" img="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=500&q=60" />
        <QuickTile href="/bulletin" title="Oglasna tabla" img="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=500&q=60" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tag }: { icon: typeof Wallet; label: string; value: string; tag: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2.5">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-cream-2 flex items-center justify-center">
          <Icon size={16} className="text-navy-950" />
        </div>
        <span className="tag tag-gold">{tag}</span>
      </div>
      <div className="font-display font-semibold text-[22px]">{value}</div>
      <div className="text-[11.5px] text-ink-soft">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) { return <div className="card"><div className="font-display text-xl font-semibold">{value}</div><div className="text-[11px] text-ink-soft">{label}</div></div>; }

function QuickTile({ href, title, img }: { href: string; title: string; img: string }) {
  return (
    <a href={href} className="relative rounded-md overflow-hidden h-[140px] block group shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={title} className="w-full h-full object-cover transition group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
      <span className="absolute bottom-3 left-3.5 text-white font-bold text-[13.5px]">{title}</span>
    </a>
  );
}
