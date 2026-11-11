import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';
import { NotificationSettings } from '@/components/resident/NotificationSettings';
import { ProfileEditor } from '@/components/resident/ProfileEditor';

export const dynamic = 'force-dynamic';
type PreferenceRow = { push_enabled: boolean; email_enabled: boolean; problem_updates: boolean; comments_replies: boolean; building_announcements: boolean; appointment_reminders: boolean };
export default async function Page() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(); if (!profile) redirect('/login');
  const { data: row } = await supabase.from('user_notification_preferences').select('*').eq('user_id', user.id).maybeSingle<PreferenceRow>();
  const prefs = { push_enabled: row?.push_enabled ?? true, email_enabled: row?.email_enabled ?? false, problem_updates: row?.problem_updates ?? true, comments_replies: row?.comments_replies ?? true, building_announcements: row?.building_announcements ?? true, appointment_reminders: row?.appointment_reminders ?? true };
  return <div><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-navy-950">Podešavanja</h2><p className="text-ink-soft text-sm mt-1">Upravljajte profilom i načinom na koji primate obaveštenja.</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-5"><ProfileEditor profile={profile} /><NotificationSettings initial={prefs} /></div></div>;
}
