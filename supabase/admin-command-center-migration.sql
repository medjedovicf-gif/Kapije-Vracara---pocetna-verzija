-- Pokrenuti jednom nakon schema.sql i notifications-migration.sql.
alter table public.tickets add column if not exists priority text not null default 'Medium';
alter table public.tickets add column if not exists due_at timestamptz;
alter table public.tickets add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.tickets add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table public.tickets add constraint tickets_priority_check check (priority in ('Low','Medium','High','Critical'));
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

alter table public.ticket_comments enable row level security;
alter table public.audit_logs enable row level security;
drop policy if exists "ticket_comments_staff_or_own" on public.ticket_comments;
create policy "ticket_comments_staff_or_own" on public.ticket_comments for select using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (t.reported_by = auth.uid() or t.building_id = my_building_id()))
);
drop policy if exists "ticket_comments_insert_staff_or_own" on public.ticket_comments;
create policy "ticket_comments_insert_staff_or_own" on public.ticket_comments for insert with check (author_id = auth.uid());
drop policy if exists "audit_logs_staff_read" on public.audit_logs;
create policy "audit_logs_staff_read" on public.audit_logs for select using (
  my_role() = 'superadmin' or (my_role() = 'admin' and (actor_id = auth.uid() or exists (select 1 from public.tickets t where t.id::text = entity_id and t.building_id = my_building_id())))
);
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated" on public.audit_logs for insert with check (actor_id = auth.uid());

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
