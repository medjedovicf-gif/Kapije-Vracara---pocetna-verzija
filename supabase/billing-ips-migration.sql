-- Podešavanja uplate po zgradi (za IPS QR i uplatnice) i mesečno zaduženje.
-- Bezbedno za ponovno pokretanje.

create table if not exists public.building_billing_settings (
  building_id uuid primary key references public.buildings(id) on delete cascade,
  payee_name text not null default '',
  payee_address text,
  bank_account text not null default '',
  payment_code text not null default '289',
  purpose text not null default 'Održavanje zgrade',
  default_amount numeric not null default 0 check (default_amount >= 0),
  due_day integer not null default 15 check (due_day between 1 and 28),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.building_billing_settings enable row level security;

drop policy if exists "billing_settings_staff" on public.building_billing_settings;
create policy "billing_settings_staff" on public.building_billing_settings for all
  using (my_role() = 'superadmin' or (my_role() = 'admin' and building_id = my_building_id()))
  with check (my_role() = 'superadmin' or (my_role() = 'admin' and building_id = my_building_id()));
-- Stanar čita podatke za uplatu svoje zgrade (račun i naziv primaoca su ionako na uplatnici).
drop policy if exists "billing_settings_resident_read" on public.building_billing_settings;
create policy "billing_settings_resident_read" on public.building_billing_settings for select
  using (my_role() = 'resident' and building_id = my_building_id());

-- Obračunski mesec mesečnog zaduženja (YYYY-MM). Sprečava dvostruko zaduženje istog stana.
alter table public.invoices add column if not exists period text;
create unique index if not exists invoices_unique_period on public.invoices (building_id, unit, period) where period is not null;

notify pgrst, 'reload schema';
