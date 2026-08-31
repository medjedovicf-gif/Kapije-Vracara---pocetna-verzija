-- Pokrenuti posle admin-command-center-migration.sql.
alter table public.tickets add column if not exists location text;
alter table public.tickets add column if not exists is_emergency boolean not null default false;
alter table public.tickets add column if not exists appointment_date date;
alter table public.tickets add column if not exists appointment_start time;
alter table public.tickets add column if not exists appointment_end time;
alter table public.tickets add column if not exists appointment_status text not null default 'Nije zakazano';
do $$ begin
  alter table public.tickets add constraint tickets_appointment_status_check check (appointment_status in ('Nije zakazano','Predloženo','Potvrđeno','Promena tražena','Završeno'));
exception when duplicate_object then null;
end $$;

create table if not exists public.ticket_ratings (
  id bigint generated always as identity primary key,
  ticket_id bigint not null unique references public.tickets(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  problem_updates boolean not null default true,
  comments_replies boolean not null default true,
  building_announcements boolean not null default true,
  appointment_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ticket_ratings enable row level security;
alter table public.user_notification_preferences enable row level security;
drop policy if exists "ticket_ratings_own_or_staff" on public.ticket_ratings;
create policy "ticket_ratings_own_or_staff" on public.ticket_ratings for select using (resident_id = auth.uid() or my_role() in ('admin','superadmin'));
drop policy if exists "ticket_ratings_insert_own" on public.ticket_ratings;
create policy "ticket_ratings_insert_own" on public.ticket_ratings for insert with check (resident_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and t.reported_by = auth.uid() and t.status = 'Rešeno'));
drop policy if exists "user_notification_preferences_own" on public.user_notification_preferences;
create policy "user_notification_preferences_own" on public.user_notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
do $$ begin
  alter publication supabase_realtime add table public.ticket_ratings;
exception when duplicate_object then null;
end $$;
