'use client';

import { useState, useTransition } from 'react';
import { Bell, Check } from 'lucide-react';
import { saveNotificationPreferences } from '@/app/actions/user-actions';

type Prefs = { push_enabled: boolean; email_enabled: boolean; problem_updates: boolean; comments_replies: boolean; building_announcements: boolean; appointment_reminders: boolean };
const labels: [keyof Prefs, string, string][] = [['push_enabled', 'Push notifications', 'Obaveštenja u browseru i na uređaju'], ['email_enabled', 'Email notifications', 'Email obaveštenja (ako je uključeno)'], ['problem_updates', 'Problem updates', 'Promene statusa i rešavanje problema'], ['comments_replies', 'Comments / replies', 'Odgovori i nove poruke'], ['building_announcements', 'Building announcements', 'Nova obaveštenja vaše zgrade'], ['appointment_reminders', 'Appointment reminders', 'Termini dolaska servisera']];
export function NotificationSettings({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial); const [saved, setSaved] = useState(false); const [error, setError] = useState(''); const [pending, start] = useTransition();
  function toggle(key: keyof Prefs) { const next = { ...prefs, [key]: !prefs[key] }; setPrefs(next); setSaved(false); start(async () => { const r = await saveNotificationPreferences(next); if (r?.error) setError(r.error); else { setError(''); setSaved(true); } }); }
  return <div className="card"><div className="flex items-center gap-2 mb-4"><Bell size={17} className="text-gold-dark" /><h2 className="font-display text-lg font-semibold">Notification settings</h2></div>{labels.map(([key, title, sub]) => <div key={key} className="flex justify-between items-center py-3 border-b border-line last:border-0"><div><div className="font-semibold text-sm">{title}</div><div className="text-[11px] text-ink-soft">{sub}</div></div><button disabled={pending} onClick={() => toggle(key)} className={`w-12 h-6 rounded-full p-1 ${prefs[key] ? 'bg-sage' : 'bg-ink-faint'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${prefs[key] ? 'translate-x-6' : ''}`} /></button></div>)}{saved && <p className="text-sage text-xs mt-3 flex items-center gap-1"><Check size={13} />Podešavanja su sačuvana.</p>}{error && <p className="text-brick text-xs mt-3">{error}</p>}</div>;
}
