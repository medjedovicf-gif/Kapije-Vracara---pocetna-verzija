-- ============================================================
-- KAPIJE VRAČARA — Supabase šema
-- Nalepi ceo ovaj fajl u Supabase Dashboard -> SQL Editor -> Run
-- Redosled je bitan (tabele -> funkcije -> RLS -> triggeri), ne menjaj ga.
-- ============================================================

-- ---------- 1. TABELE ----------

create table buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles je "produžetak" auth.users (koji čuva Supabase Auth) —
-- ovde stoje ime, uloga, stan, zgrada i finansijsko stanje.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('resident','admin','superadmin')),
  unit text,
  building_id uuid references buildings(id),
  balance numeric not null default 0,
  payment_status text not null default 'Na čekanju' check (payment_status in ('Plaćeno','Na čekanju')),
  created_at timestamptz not null default now()
);

create table tickets (
  id bigint generated always as identity primary key,
  unit text not null,
  title text not null,
  category text not null default 'Ostalo',
  description text,
  status text not null default 'Novo' check (status in ('Novo','Zakazano','U toku','Rešeno')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  due_at timestamptz,
  assigned_to uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  location text,
  is_emergency boolean not null default false,
  appointment_date date,
  appointment_start time,
  appointment_end time,
  appointment_status text not null default 'Nije zakazano' check (appointment_status in ('Nije zakazano','Predloženo','Potvrđeno','Promena tražena','Završeno')),
  building_id uuid not null references buildings(id),
  reported_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table ticket_photos (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table ticket_comments (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create table ticket_ratings (
  id bigint generated always as identity primary key,
  ticket_id bigint not null unique references tickets(id) on delete cascade,
  resident_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  problem_updates boolean not null default true,
  comments_replies boolean not null default true,
  building_announcements boolean not null default true,
  appointment_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create table polls (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  image_url text,
  hero_image_url text,
  building_id uuid references buildings(id), -- NULL = cela platforma
  status text not null default 'active' check (status in ('active','closed')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table poll_options (
  id bigint generated always as identity primary key,
  poll_id bigint not null references polls(id) on delete cascade,
  label text not null,
  votes integer not null default 0
);

create table poll_votes (
  id bigint generated always as identity primary key,
  poll_id bigint not null references polls(id) on delete cascade,
  option_id bigint not null references poll_options(id) on delete cascade,
  voter_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id) -- jedan glas po anketi po stanaru
);

create table bulletin_posts (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  building_id uuid references buildings(id), -- NULL = cela platforma
  author_id uuid references profiles(id),
  author_name text not null,
  created_at timestamptz not null default now()
);

create table invoices (
  id bigint generated always as identity primary key,
  unit text not null,
  building_id uuid not null references buildings(id),
  amount numeric not null,
  month text not null,
  status text not null default 'Poslata',
  from_email text,
  recipient_name text,
  recipient_email text,
  description text,
  due_date date,
  paid_at date,
  created_at timestamptz not null default now()
);

create table invoice_payments (
  id bigint generated always as identity primary key,
  invoice_id bigint references invoices(id) on delete set null,
  unit text not null,
  building_id uuid not null references buildings(id),
  amount numeric not null,
  payment_date date not null default current_date,
  reference text,
  note text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table bank_statements (
  id bigint generated always as identity primary key,
  building_id uuid not null references buildings(id),
  statement_date date not null default current_date,
  payer text,
  reference text,
  amount numeric not null,
  raw_text text,
  matched_invoice_id bigint references invoices(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table permissions (
  key text primary key,
  value boolean not null default true
);

create table notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null default 'general',
  icon text not null default 'bell',
  title text not null,
  sub text,
  target text, -- ruta na koju klik vodi, npr. '/admin/tickets'
  read boolean not null default false,
  dismissed boolean not null default false,
  persistent boolean not null default false,
  created_at timestamptz not null default now()
);

create table push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------- 2. POČETNE DOZVOLE (feature toggles) ----------
insert into permissions (key, value) values
  ('admin_manageResidents', true),
  ('admin_managePolls', true),
  ('admin_manageBulletin', true),
  ('admin_viewPayments', true),
  ('admin_sendInvoices', true),
  ('resident_seeBulletin', true),
  ('resident_vote', true),
  ('resident_bookMajstor', true);

-- ---------- 3. POMOĆNE FUNKCIJE (za RLS politike) ----------
-- security definer + stable: bezbedno čitaju profiles bez beskonačne rekurzije u RLS

create or replace function my_role() returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_building_id() returns uuid
language sql security definer stable as $$
  select building_id from profiles where id = auth.uid();
$$;

create or replace function my_unit() returns text
language sql security definer stable as $$
  select unit from profiles where id = auth.uid();
$$;

-- ---------- 4. UKLJUČI ROW LEVEL SECURITY ----------
alter table buildings enable row level security;
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table ticket_photos enable row level security;
alter table ticket_comments enable row level security;
alter table audit_logs enable row level security;
alter table ticket_ratings enable row level security;
alter table user_notification_preferences enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table bulletin_posts enable row level security;
alter table invoices enable row level security;
alter table invoice_payments enable row level security;
alter table bank_statements enable row level security;
alter table permissions enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;

-- ---------- 5. RLS POLITIKE ----------

-- BUILDINGS: svi ulogovani mogu da vide zgrade (potrebno za dropdown-ove); menja samo superadmin
create policy "buildings_select_all" on buildings for select using (auth.role() = 'authenticated');
create policy "buildings_write_superadmin" on buildings for all using (my_role() = 'superadmin');

-- PROFILES
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_select_admin_own_building" on profiles for select using (my_role() = 'admin' and building_id = my_building_id());
create policy "profiles_select_superadmin" on profiles for select using (my_role() = 'superadmin');
create policy "profiles_update_own" on profiles for update using (id = auth.uid());
create policy "profiles_update_admin_own_building" on profiles for update using (my_role() = 'admin' and building_id = my_building_id() and role = 'resident');
create policy "profiles_update_superadmin" on profiles for update using (my_role() = 'superadmin');
create policy "profiles_insert_admin" on profiles for insert with check (my_role() = 'admin' and building_id = my_building_id() and role = 'resident');
create policy "profiles_insert_superadmin" on profiles for insert with check (my_role() = 'superadmin');

-- TICKETS
create policy "tickets_select_resident" on tickets for select using (my_role() = 'resident' and unit = my_unit() and building_id = my_building_id());
create policy "tickets_select_admin" on tickets for select using (my_role() = 'admin' and building_id = my_building_id());
create policy "tickets_select_superadmin" on tickets for select using (my_role() = 'superadmin');
create policy "tickets_insert_resident" on tickets for insert with check (my_role() = 'resident' and unit = my_unit() and building_id = my_building_id() and reported_by = auth.uid());
create policy "tickets_insert_admin" on tickets for insert with check (my_role() in ('admin','superadmin'));
create policy "tickets_update_admin" on tickets for update using (my_role() = 'admin' and building_id = my_building_id());
create policy "tickets_update_superadmin" on tickets for update using (my_role() = 'superadmin');

-- TICKET PHOTOS (prati pristup nad tiketom)
create policy "ticket_photos_select" on ticket_photos for select using (
  exists (select 1 from tickets t where t.id = ticket_id and (
    (my_role() = 'resident' and t.unit = my_unit() and t.building_id = my_building_id()) or
    (my_role() = 'admin' and t.building_id = my_building_id()) or
    my_role() = 'superadmin'
  ))
);
create policy "ticket_photos_insert" on ticket_photos for insert with check (
  exists (select 1 from tickets t where t.id = ticket_id and (
    (my_role() = 'resident' and t.unit = my_unit() and t.building_id = my_building_id()) or
    my_role() in ('admin','superadmin')
  ))
);

create policy "ticket_comments_staff_or_own" on ticket_comments for select using (
  exists (select 1 from tickets t where t.id = ticket_id and (
    t.reported_by = auth.uid() or
    (my_role() = 'admin' and t.building_id = my_building_id()) or
    my_role() = 'superadmin'
  ))
);
create policy "ticket_comments_insert_staff_or_own" on ticket_comments for insert with check (
  author_id = auth.uid() and exists (select 1 from tickets t where t.id = ticket_id and (
    t.reported_by = auth.uid() or
    (my_role() = 'admin' and t.building_id = my_building_id()) or
    my_role() = 'superadmin'
  ))
);

create policy "audit_logs_staff_read" on audit_logs for select using (
  my_role() = 'superadmin' or
  (my_role() = 'admin' and (actor_id = auth.uid() or exists (select 1 from tickets t where t.id::text = entity_id and t.building_id = my_building_id())))
);
create policy "audit_logs_insert_authenticated" on audit_logs for insert with check (actor_id = auth.uid());

create policy "ticket_ratings_own_or_staff" on ticket_ratings for select using (resident_id = auth.uid() or my_role() in ('admin','superadmin'));
create policy "ticket_ratings_insert_own" on ticket_ratings for insert with check (resident_id = auth.uid() and exists (select 1 from tickets t where t.id = ticket_id and t.reported_by = auth.uid() and t.status = 'Rešeno'));
create policy "user_notification_preferences_own" on user_notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- POLLS (vidljivi ako pripadaju mojoj zgradi ili su globalni)
create policy "polls_select" on polls for select using (
  building_id is null or building_id = my_building_id() or my_role() = 'superadmin'
);
create policy "polls_write_admin" on polls for all using (my_role() = 'admin' and building_id = my_building_id());
create policy "polls_write_superadmin" on polls for all using (my_role() = 'superadmin');

create policy "poll_options_select" on poll_options for select using (auth.role() = 'authenticated');
create policy "poll_options_write_admin" on poll_options for all using (
  exists (select 1 from polls p where p.id = poll_id and p.building_id = my_building_id() and my_role() = 'admin')
);
create policy "poll_options_write_superadmin" on poll_options for all using (my_role() = 'superadmin');

create policy "poll_votes_select_own" on poll_votes for select using (voter_id = auth.uid());
create policy "poll_votes_select_staff" on poll_votes for select using (my_role() in ('admin','superadmin'));
create policy "poll_votes_insert_own" on poll_votes for insert with check (voter_id = auth.uid() and my_role() = 'resident');

-- BULLETIN
create policy "bulletin_select" on bulletin_posts for select using (
  building_id is null or building_id = my_building_id() or my_role() = 'superadmin'
);
create policy "bulletin_write_admin" on bulletin_posts for all using (my_role() = 'admin' and building_id = my_building_id());
create policy "bulletin_write_superadmin" on bulletin_posts for all using (my_role() = 'superadmin');

-- INVOICES
create policy "invoices_select_resident" on invoices for select using (my_role() = 'resident' and unit = my_unit() and building_id = my_building_id());
create policy "invoices_select_admin" on invoices for select using (my_role() = 'admin' and building_id = my_building_id());
create policy "invoices_select_superadmin" on invoices for select using (my_role() = 'superadmin');
create policy "invoices_insert_admin" on invoices for insert with check (my_role() = 'admin' and building_id = my_building_id());
create policy "invoices_insert_superadmin" on invoices for insert with check (my_role() = 'superadmin');
create policy "invoices_update_admin" on invoices for update using (my_role() = 'admin' and building_id = my_building_id());
create policy "invoices_update_superadmin" on invoices for update using (my_role() = 'superadmin');

create policy "invoice_payments_select_resident" on invoice_payments for select using (my_role() = 'resident' and unit = my_unit() and building_id = my_building_id());
create policy "invoice_payments_select_admin" on invoice_payments for select using (my_role() = 'admin' and building_id = my_building_id());
create policy "invoice_payments_select_superadmin" on invoice_payments for select using (my_role() = 'superadmin');
create policy "invoice_payments_insert_admin" on invoice_payments for insert with check (my_role() = 'admin' and building_id = my_building_id());
create policy "invoice_payments_insert_superadmin" on invoice_payments for insert with check (my_role() = 'superadmin');

create policy "bank_statements_select_admin" on bank_statements for select using (my_role() = 'admin' and building_id = my_building_id());
create policy "bank_statements_select_superadmin" on bank_statements for select using (my_role() = 'superadmin');
create policy "bank_statements_insert_admin" on bank_statements for insert with check (my_role() = 'admin' and building_id = my_building_id());
create policy "bank_statements_insert_superadmin" on bank_statements for insert with check (my_role() = 'superadmin');

-- PERMISSIONS (svi čitaju, samo superadmin menja)
create policy "permissions_select_all" on permissions for select using (auth.role() = 'authenticated');
create policy "permissions_write_superadmin" on permissions for update using (my_role() = 'superadmin');

-- NOTIFICATIONS (samo svoje)
create policy "notifications_select_own" on notifications for select using (recipient_id = auth.uid());
create policy "notifications_update_own" on notifications for update using (recipient_id = auth.uid());
create policy "notifications_delete_own" on notifications for delete using (recipient_id = auth.uid());
create policy "push_subscriptions_own" on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table tickets;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table ticket_comments;
exception when duplicate_object then null;
end $$;

-- ---------- 6. RPC FUNKCIJA: glasanje (atomično, sprečava duplo glasanje) ----------
create or replace function cast_vote(p_poll_id bigint, p_option_id bigint)
returns void
language plpgsql security definer as $$
begin
  if my_role() != 'resident' then
    raise exception 'Samo stanari mogu da glasaju.';
  end if;
  insert into poll_votes (poll_id, option_id, voter_id) values (p_poll_id, p_option_id, auth.uid());
  update poll_options set votes = votes + 1 where id = p_option_id;
end;
$$;

create or replace function touch_ticket_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger trg_touch_ticket_updated_at before update on tickets
  for each row execute function touch_ticket_updated_at();

-- ---------- 7. TRIGGERI: automatska obaveštenja ----------
-- Novi zahtev -> obavesti sve admine/superadmine te zgrade
create or replace function notify_new_ticket() returns trigger
language plpgsql security definer as $$
begin
  insert into notifications (recipient_id, icon, title, sub, target)
  select id, 'wrench', 'Novi zahtev za servis', 'Stan ' || new.unit || ' · ' || new.category, '/admin/tickets'
  from profiles where role in ('admin','superadmin') and (building_id = new.building_id or role = 'superadmin');
  return new;
end;
$$;
create trigger trg_notify_new_ticket after insert on tickets
  for each row execute function notify_new_ticket();

-- Promena statusa zahteva -> obavesti stanara koji ga je prijavio
create or replace function notify_ticket_status() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.reported_by is not null then
    insert into notifications (recipient_id, icon, title, sub, target)
    values (new.reported_by, 'wrench', 'Status zahteva promenjen: ' || new.status, new.title, '/services');
  end if;
  return new;
end;
$$;
create trigger trg_notify_ticket_status after update on tickets
  for each row execute function notify_ticket_status();

-- Novo obaveštenje na oglasnoj tabli -> obavesti sve stanare te zgrade (ili sve, ako je globalno)
create or replace function notify_new_bulletin() returns trigger
language plpgsql security definer as $$
begin
  insert into notifications (recipient_id, icon, title, sub, target)
  select id, 'megaphone', 'Novo obaveštenje', new.title, '/bulletin'
  from profiles where role = 'resident' and (new.building_id is null or building_id = new.building_id);
  return new;
end;
$$;
create trigger trg_notify_new_bulletin after insert on bulletin_posts
  for each row execute function notify_new_bulletin();

-- Nova faktura -> obavesti tog stanara
create or replace function notify_new_invoice() returns trigger
language plpgsql security definer as $$
begin
  insert into notifications (recipient_id, icon, title, sub, target)
  select id, 'receipt', 'Nova faktura', new.month || ' · ' || new.amount || ' RSD', '/payments'
  from profiles where role = 'resident' and unit = new.unit and building_id = new.building_id;
  return new;
end;
$$;
create trigger trg_notify_new_invoice after insert on invoices
  for each row execute function notify_new_invoice();

-- Aplikacija sada kreira notifikacije i šalje browser push iz server akcija.
-- Trigger funkcije ostaju kao dokumentacija/rezerva, ali se isključuju da ne nastanu duplikati.
drop trigger if exists trg_notify_new_ticket on tickets;
drop trigger if exists trg_notify_ticket_status on tickets;
drop trigger if exists trg_notify_new_bulletin on bulletin_posts;
drop trigger if exists trg_notify_new_invoice on invoices;

-- ---------- 8. STORAGE BUCKET za fotografije kvarova ----------
insert into storage.buckets (id, name, public) values ('ticket-photos', 'ticket-photos', true)
on conflict (id) do nothing;

create policy "ticket_photos_bucket_read" on storage.objects for select using (bucket_id = 'ticket-photos');
create policy "ticket_photos_bucket_write" on storage.objects for insert with check (bucket_id = 'ticket-photos' and auth.role() = 'authenticated');

-- ============================================================
-- GOTOVO. Sledeći korak: Authentication -> Providers -> proveri da je
-- Email uključen, zatim ručno napravi 3 test naloga (Filip, Budimir, Petar)
-- preko Authentication -> Users -> Add user, pa im dodaj red u "profiles"
-- tabeli (uputstvo u SETUP.md).
-- ============================================================
