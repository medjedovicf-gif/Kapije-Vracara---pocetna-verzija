-- Pokrenuti jednom u Supabase SQL Editoru posle osnovne schema.sql šeme.
alter table public.notifications add column if not exists type text not null default 'general';
alter table public.notifications add column if not exists dismissed boolean not null default false;
alter table public.notifications add column if not exists persistent boolean not null default false;

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Od ovog trenutka aplikacija sama kreira notifikacije i šalje browser push.
drop trigger if exists trg_notify_new_ticket on public.tickets;
drop trigger if exists trg_notify_ticket_status on public.tickets;
drop trigger if exists trg_notify_new_bulletin on public.bulletin_posts;
drop trigger if exists trg_notify_new_invoice on public.invoices;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
