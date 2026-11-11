'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Wrench, Megaphone, Receipt, X, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/types';

const ICONS: Record<string, typeof Bell> = { wrench: Wrench, megaphone: Megaphone, receipt: Receipt, bell: Bell };

export function NotificationBell({ userId, role = 'resident' }: { userId: string; role?: 'resident' | 'admin' | 'superadmin' }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [popups, setPopups] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<'unknown' | 'enabled' | 'unsupported' | 'denied'>('unknown');
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const visible = items.filter((n) => !n.dismissed);
  const unread = visible.filter((n) => !n.read).length;
  const persistent = role !== 'resident' ? visible.filter((n) => n.persistent) : [];

  useEffect(() => {
    supabase.from('notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50).then(({ data }) => setItems((data ?? []) as AppNotification[]));
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) setPushState('unsupported');
    else if (Notification.permission === 'denied') setPushState('denied');
    else navigator.serviceWorker.register('/sw.js').then((registration) => registration.pushManager.getSubscription()).then((subscription) => { if (subscription) setPushState('enabled'); }).catch(() => {});
    const channel = supabase.channel(`notifications:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const notification = payload.new as AppNotification;
        setItems((prev) => [notification, ...prev].slice(0, 50));
        setPopups((prev) => [...prev, notification]);
        window.setTimeout(() => setPopups((prev) => prev.filter((n) => n.id !== notification.id)), 8000);
      }
      if (payload.eventType === 'UPDATE') setItems((prev) => prev.map((n) => n.id === (payload.new as AppNotification).id ? payload.new as AppNotification : n));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, userId, role]);

  useEffect(() => { function outside(e: MouseEvent) { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); } document.addEventListener('click', outside); return () => document.removeEventListener('click', outside); }, []);

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setPushState('unsupported');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return setPushState('denied');
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return setPushState('unsupported');
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(key) });
    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
    setPushState('enabled');
  }

  async function markRead(id: number) { setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)); await supabase.from('notifications').update({ read: true } as never).eq('id', id).eq('recipient_id', userId); }
  async function dismiss(id: number) { setItems((prev) => prev.map((n) => n.id === id ? { ...n, dismissed: true } : n)); await supabase.from('notifications').update({ dismissed: true, read: true } as never).eq('id', id).eq('recipient_id', userId); }
  async function markAllRead() { const ids = visible.filter((n) => !n.read).map((n) => n.id); if (!ids.length) return; setItems((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read: true } : n)); await supabase.from('notifications').update({ read: true } as never).in('id', ids).eq('recipient_id', userId); }

  return <>
    {popups.length > 0 && <div className="fixed right-6 top-20 z-[140] w-[360px] space-y-2">{popups.map((n) => <a key={n.id} href={n.target ?? '#'} onClick={() => { void markRead(n.id); setPopups((prev) => prev.filter((item) => item.id !== n.id)); }} className="block bg-white border-l-4 border-gold rounded-xl shadow-soft p-3.5 hover:bg-cream"><div className="font-bold text-[13px] text-navy-950">{n.title}</div><div className="text-xs text-ink-soft mt-1">{n.sub}</div><div className="text-[10px] text-ink-faint mt-1">{formatDate(n.created_at)}</div></a>)}</div>}
    {persistent.length > 0 && <div className="fixed right-6 top-20 z-[140] w-[360px] space-y-2">{persistent.map((n) => <div key={n.id} className="bg-white border-l-4 border-gold rounded-xl shadow-soft p-3.5 flex gap-3"><a href={n.target ?? '#'} onClick={() => markRead(n.id)} className="flex-1"><div className="font-bold text-[13px] text-navy-950">{n.title}</div><div className="text-xs text-ink-soft mt-1">{n.sub}</div><div className="text-[10px] text-ink-faint mt-1">{formatDate(n.created_at)}</div></a><button aria-label="Zatvori obaveštenje" onClick={() => dismiss(n.id)} className="shrink-0 text-ink-faint hover:text-brick"><X size={16} /></button></div>)}</div>}
    <div className="relative" ref={panelRef}><button aria-label="Obaveštenja" onClick={() => setOpen(!open)} className="w-[38px] h-[38px] rounded-full bg-white border border-line flex items-center justify-center relative"><Bell size={16} className="text-navy-950" />{unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brick text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-cream">{unread > 99 ? '99+' : unread}</span>}</button>
      {open && <div className="absolute top-12 right-0 w-[350px] max-h-[460px] bg-white rounded-2xl border border-line shadow-soft z-[150] flex flex-col overflow-hidden"><div className="flex justify-between items-center px-4 py-3.5 border-b border-line"><span className="font-bold text-[13px]">Obaveštenja</span><button onClick={markAllRead} className="text-[11px] text-ink-faint hover:text-navy-950">Označi sve pročitano</button></div>{pushState !== 'enabled' && pushState !== 'denied' && <button onClick={enablePush} className="flex items-center gap-2 px-4 py-3 text-left text-xs bg-cream-2 hover:bg-cream"><Smartphone size={14} />Uključi push obaveštenja</button>}{pushState === 'denied' && <div className="px-4 py-2 text-[11px] text-ink-soft">Push je blokiran u browseru. Dozvoli ga u podešavanjima sajta.</div>}<div className="overflow-y-auto py-1.5">{visible.length === 0 && <div className="py-7 px-4 text-center text-[12.5px] text-ink-faint">Još uvek nema obaveštenja.</div>}{visible.map((n) => { const Icon = ICONS[n.icon] ?? Bell; return <div key={n.id} className={`flex gap-2.5 px-4 py-2.5 border-b border-line items-start hover:bg-cream/60 ${!n.read ? 'bg-[#FBEFD3]' : ''}`}><a href={n.target ?? '#'} onClick={() => { void markRead(n.id); setOpen(false); }} className="flex gap-2.5 min-w-0 flex-1"><div className="w-8 h-8 rounded-[9px] bg-cream-2 shrink-0 flex items-center justify-center"><Icon size={14} className="text-navy-950" /></div><div className="min-w-0"><div className="text-[12.5px] font-bold text-navy-950">{n.title}</div>{n.sub && <div className="text-[11.5px] text-ink-soft mt-0.5">{n.sub}</div>}<div className="text-[10px] text-ink-faint mt-1 font-mono">{formatDate(n.created_at)}</div></div></a>{role !== 'resident' && n.persistent && <button aria-label="Zatvori obaveštenje" onClick={() => void dismiss(n.id)} className="text-ink-faint hover:text-brick"><X size={14} /></button>}</div>; })}</div></div>}
    </div>
  </>;
}

function formatDate(value: string) { return new Date(value).toLocaleString('sr-RS', { day: 'numeric', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function decodeKey(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); }
