-- Pokrenuti nad postojećom bazom da se schema cache uskladi sa aplikacijom.

alter table public.tickets add column if not exists priority text not null default 'Medium';
alter table public.tickets add column if not exists due_at timestamptz;
alter table public.tickets add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.tickets add column if not exists updated_at timestamptz not null default now();
alter table public.tickets add column if not exists location text;
alter table public.tickets add column if not exists is_emergency boolean not null default false;
alter table public.tickets add column if not exists appointment_date date;
alter table public.tickets add column if not exists appointment_start time;
alter table public.tickets add column if not exists appointment_end time;
alter table public.tickets add column if not exists appointment_status text not null default 'Nije zakazano';

do $$ begin
  alter table public.tickets add constraint tickets_priority_check check (priority in ('Low','Medium','High','Critical'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.tickets add constraint tickets_appointment_status_check check (appointment_status in ('Nije zakazano','Predloženo','Potvrđeno','Promena tražena','Završeno'));
exception when duplicate_object then null;
end $$;

create table if not exists public.ticket_comments (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

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

alter table public.polls add column if not exists image_url text;
alter table public.polls add column if not exists hero_image_url text;

alter table public.invoices add column if not exists from_email text;
alter table public.invoices add column if not exists recipient_name text;
alter table public.invoices add column if not exists recipient_email text;
alter table public.invoices add column if not exists description text;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists paid_at date;

create table if not exists public.invoice_payments (
  id bigint generated always as identity primary key,
  invoice_id bigint references public.invoices(id) on delete set null,
  unit text not null,
  building_id uuid not null references public.buildings(id),
  amount numeric not null,
  payment_date date not null default current_date,
  reference text,
  note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_statements (
  id bigint generated always as identity primary key,
  building_id uuid not null references public.buildings(id),
  statement_date date not null default current_date,
  payer text,
  reference text,
  amount numeric not null,
  raw_text text,
  matched_invoice_id bigint references public.invoices(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ticket_comments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ticket_ratings enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.bank_statements enable row level security;

drop policy if exists "ticket_comments_staff_or_own" on public.ticket_comments;
create policy "ticket_comments_staff_or_own" on public.ticket_comments for select using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (
    t.reported_by = auth.uid() or
    (my_role() = 'admin' and t.building_id = my_building_id()) or
    my_role() = 'superadmin'
  ))
);
drop policy if exists "ticket_comments_insert_staff_or_own" on public.ticket_comments;
create policy "ticket_comments_insert_staff_or_own" on public.ticket_comments for insert with check (
  author_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and (
    t.reported_by = auth.uid() or
    (my_role() = 'admin' and t.building_id = my_building_id()) or
    my_role() = 'superadmin'
  ))
);

drop policy if exists "audit_logs_staff_read" on public.audit_logs;
create policy "audit_logs_staff_read" on public.audit_logs for select using (
  my_role() = 'superadmin' or
  (my_role() = 'admin' and (actor_id = auth.uid() or exists (select 1 from public.tickets t where t.id::text = entity_id and t.building_id = my_building_id())))
);
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated" on public.audit_logs for insert with check (actor_id = auth.uid());

drop policy if exists "ticket_ratings_own_or_staff" on public.ticket_ratings;
create policy "ticket_ratings_own_or_staff" on public.ticket_ratings for select using (resident_id = auth.uid() or my_role() in ('admin','superadmin'));
drop policy if exists "ticket_ratings_insert_own" on public.ticket_ratings;
create policy "ticket_ratings_insert_own" on public.ticket_ratings for insert with check (resident_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and t.reported_by = auth.uid() and t.status = 'Rešeno'));

drop policy if exists "user_notification_preferences_own" on public.user_notification_preferences;
create policy "user_notification_preferences_own" on public.user_notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "invoices_update_admin" on public.invoices;
create policy "invoices_update_admin" on public.invoices for update using (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "invoices_update_superadmin" on public.invoices;
create policy "invoices_update_superadmin" on public.invoices for update using (my_role() = 'superadmin');

drop policy if exists "invoice_payments_select_resident" on public.invoice_payments;
create policy "invoice_payments_select_resident" on public.invoice_payments for select using (my_role() = 'resident' and unit = my_unit() and building_id = my_building_id());
drop policy if exists "invoice_payments_select_admin" on public.invoice_payments;
create policy "invoice_payments_select_admin" on public.invoice_payments for select using (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "invoice_payments_select_superadmin" on public.invoice_payments;
create policy "invoice_payments_select_superadmin" on public.invoice_payments for select using (my_role() = 'superadmin');
drop policy if exists "invoice_payments_insert_admin" on public.invoice_payments;
create policy "invoice_payments_insert_admin" on public.invoice_payments for insert with check (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "invoice_payments_insert_superadmin" on public.invoice_payments;
create policy "invoice_payments_insert_superadmin" on public.invoice_payments for insert with check (my_role() = 'superadmin');

drop policy if exists "bank_statements_select_admin" on public.bank_statements;
create policy "bank_statements_select_admin" on public.bank_statements for select using (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "bank_statements_select_superadmin" on public.bank_statements;
create policy "bank_statements_select_superadmin" on public.bank_statements for select using (my_role() = 'superadmin');
drop policy if exists "bank_statements_insert_admin" on public.bank_statements;
create policy "bank_statements_insert_admin" on public.bank_statements for insert with check (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "bank_statements_insert_superadmin" on public.bank_statements;
create policy "bank_statements_insert_superadmin" on public.bank_statements for insert with check (my_role() = 'superadmin');

create or replace function public.touch_ticket_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_touch_ticket_updated_at on public.tickets;
create trigger trg_touch_ticket_updated_at before update on public.tickets for each row execute function public.touch_ticket_updated_at();

do $$ begin
  alter publication supabase_realtime add table public.tickets;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.ticket_comments;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.ticket_ratings;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
