'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Check, CheckCheck, ChevronRight, Clock3, Inbox, Megaphone, Receipt, UserX, Wrench, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification, Ticket } from '@/lib/types';

type Category = 'critical' | 'overdue' | 'ticket' | 'other';

const FILTERS: Array<[Category | 'all', string]> = [
  ['all', 'Sve'],
  ['ticket', 'Problemi'],
  ['critical', 'Kritično'],
  ['overdue', 'Istekao rok'],
  ['other', 'Ostalo'],
];

const ICONS: Record<string, typeof Bell> = { wrench: Wrench, megaphone: Megaphone, receipt: Receipt, bell: Bell };

function categoryOf(n: AppNotification): Category {
  const t = n.type ?? '';
  if (t.includes('critical')) return 'critical';
  if (t.includes('overdue')) return 'overdue';
  if (t.startsWith('ticket') || t.startsWith('appointment')) return 'ticket';
  return 'other';
}

function labelOf(n: AppNotification) {
  const t = n.type ?? '';
  if (t.includes('critical')) return 'Kritično';
  if (t.includes('overdue')) return 'Istekao rok';
  if (t.startsWith('appointment')) return 'Termin';
  if (t.includes('comment')) return 'Komentar';
  if (t.startsWith('ticket')) return 'Problem';
  if (t.startsWith('bulletin')) return 'Oglasna tabla';
  if (t.startsWith('poll')) return 'Anketa';
  if (t.startsWith('invoice')) return 'Uplata';
  return 'Obaveštenje';
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'upravo';
  if (m < 60) return `pre ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `pre ${h} h`;
  return new Date(iso).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
}

function dayGroup(iso: string) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (days <= 0) return 'Danas';
  if (days === 1) return 'Juče';
  if (days < 7) return 'Ove nedelje';
  return 'Ranije';
}

export function AdminInbox({ notifications, tickets }: { notifications: AppNotification[]; tickets: Ticket[] }) {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [items, setItems] = useState(notifications);
  const supabase = useMemo(() => createClient(), []);
  const now = Date.now();

  const visible = items.filter((n) => !n.dismissed);
  const unreadCount = visible.filter((n) => !n.read).length;
  const filtered = visible.filter((n) => (filter === 'all' || categoryOf(n) === filter) && (!onlyUnread || !n.read));

  const groups = filtered.reduce<Array<{ label: string; items: AppNotification[] }>>((acc, n) => {
    const label = dayGroup(n.created_at);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(n);
    else acc.push({ label, items: [n] });
    return acc;
  }, []);

  const actionTickets = tickets
    .filter((t) => t.status !== 'Rešeno' && (t.priority === 'Critical' || !t.assigned_to || (!!t.due_at && new Date(t.due_at).getTime() < now)))
    .map((t) => {
      const overdue = !!t.due_at && new Date(t.due_at).getTime() < now;
      const reason = t.priority === 'Critical' ? 'Kritično' : overdue ? 'Istekao rok' : 'Nedodeljen';
      const rank = t.priority === 'Critical' ? 0 : overdue ? 1 : 2;
      return { t, reason, rank };
    })
    .sort((a, b) => a.rank - b.rank);
  const shownActions = showAllActions ? actionTickets : actionTickets.slice(0, 5);

  async function read(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true } as never).eq('id', id);
  }
  async function dismiss(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, dismissed: true, read: true } : n)));
    await supabase.from('notifications').update({ dismissed: true, read: true } as never).eq('id', id);
  }
  async function readAll() {
    const ids = visible.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true } as never).in('id', ids);
  }

  return (
    <div>
      {/* Pregled */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
        <button onClick={() => { setOnlyUnread(true); setFilter('all'); }} className="card card-link !p-3.5 sm:!p-4 text-left">
          <div className="flex items-center gap-2 text-ink-soft text-[11px]"><Inbox size={14} />Nepročitano</div>
          <div className="font-display font-semibold text-xl sm:text-2xl mt-1">{unreadCount}</div>
        </button>
        <a href="#potrebna-akcija" className="card card-link !p-3.5 sm:!p-4">
          <div className="flex items-center gap-2 text-ink-soft text-[11px]"><AlertTriangle size={14} className="text-brick" />Akcija</div>
          <div className="font-display font-semibold text-xl sm:text-2xl mt-1">{actionTickets.length}</div>
        </a>
        <button onClick={() => { setOnlyUnread(false); setFilter('all'); }} className="card card-link !p-3.5 sm:!p-4 text-left">
          <div className="flex items-center gap-2 text-ink-soft text-[11px]"><Bell size={14} />Ukupno</div>
          <div className="font-display font-semibold text-xl sm:text-2xl mt-1">{visible.length}</div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* Potrebna akcija: prva na telefonu, desno na desktopu */}
        <aside id="potrebna-akcija" className="card !p-0 lg:order-2 lg:sticky lg:top-24 scroll-mt-24 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-display text-lg font-semibold">Potrebna akcija</h2>
            <span className="tag tag-brick">{actionTickets.length}</span>
          </div>
          {shownActions.map(({ t, reason }) => (
            <Link key={t.id} href={`/admin/tickets?ticket=${t.id}`} className="row-link flex items-center gap-3 px-4 py-3 border-t border-line">
              <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${reason === 'Nedodeljen' ? 'bg-cream-2' : 'bg-brick-soft'}`}>
                {reason === 'Nedodeljen' ? <UserX size={14} className="text-gold-dark" /> : reason === 'Istekao rok' ? <Clock3 size={14} className="text-brick" /> : <AlertTriangle size={14} className="text-brick" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{t.title}</div>
                <div className="text-[10.5px] text-ink-soft truncate">#{t.id} · Stan {t.unit} · {reason}</div>
              </div>
              <ChevronRight size={15} className="text-ink-faint shrink-0" />
            </Link>
          ))}
          {actionTickets.length > 5 && (
            <button onClick={() => setShowAllActions(!showAllActions)} className="w-full border-t border-line py-2.5 text-xs font-semibold text-gold-dark hover:bg-cream-2/60">
              {showAllActions ? 'Prikaži manje' : `Prikaži sve (${actionTickets.length})`}
            </button>
          )}
          {!actionTickets.length && <p className="text-sm text-ink-soft px-4 pb-4">Sve je obrađeno. 🎉</p>}
        </aside>

        {/* Obaveštenja */}
        <section className="card !p-0 lg:order-1 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-line">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-lg font-semibold">Obaveštenja</h2>
              <button onClick={() => void readAll()} disabled={!unreadCount} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-navy-950 disabled:opacity-40">
                <CheckCheck size={14} />Označi sve pročitano
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={`btn shrink-0 ${filter === key ? 'btn-navy' : 'btn-outline'} !px-3 !py-1.5 !text-xs`}>{label}</button>
              ))}
              <button onClick={() => setOnlyUnread(!onlyUnread)} className={`btn shrink-0 ${onlyUnread ? 'btn-gold' : 'btn-outline'} !px-3 !py-1.5 !text-xs`}>Samo nepročitana</button>
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-4 py-2 bg-cream/60 font-mono text-[10px] uppercase tracking-wide text-ink-faint border-b border-line">{g.label}</div>
              {g.items.map((n) => {
                const Icon = ICONS[n.icon] ?? Bell;
                const body = (
                  <>
                    <div className="relative w-9 h-9 shrink-0 rounded-[10px] bg-cream-2 flex items-center justify-center">
                      <Icon size={15} className="text-navy-950" />
                      {!n.read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brick border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] truncate ${n.read ? 'font-semibold text-ink' : 'font-bold text-navy-950'}`}>{n.title}</div>
                      {n.sub && <div className="text-xs text-ink-soft truncate mt-0.5">{n.sub}</div>}
                      <div className="text-[10.5px] text-ink-faint mt-1">{labelOf(n)} · {timeAgo(n.created_at)}</div>
                    </div>
                  </>
                );
                return (
                  <div key={n.id} className={`group flex items-center border-b border-line last:border-0 ${!n.read ? 'bg-[#FBEFD3]/60' : ''}`}>
                    {n.target ? (
                      <Link href={n.target} onClick={() => { if (!n.read) void read(n.id); }} className="row-link flex flex-1 min-w-0 items-center gap-3 px-4 py-3">
                        {body}
                        <ChevronRight size={15} className="text-ink-faint shrink-0" />
                      </Link>
                    ) : (
                      <button onClick={() => { if (!n.read) void read(n.id); }} className="row-link flex flex-1 min-w-0 items-center gap-3 px-4 py-3 text-left">{body}</button>
                    )}
                    <div className="flex items-center gap-1 pr-3">
                      {!n.read && (
                        <button title="Označi pročitano" aria-label="Označi pročitano" onClick={() => void read(n.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-sage hover:bg-sage-soft">
                          <Check size={15} />
                        </button>
                      )}
                      <button title="Ukloni" aria-label="Ukloni" onClick={() => void dismiss(n.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:text-brick hover:bg-brick-soft">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {!filtered.length && (
            <div className="py-10 text-center">
              <Inbox size={22} className="mx-auto text-ink-faint mb-2" />
              <p className="text-sm text-ink-soft">{onlyUnread ? 'Nema nepročitanih obaveštenja.' : 'Nema stavki za ovaj filter.'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
