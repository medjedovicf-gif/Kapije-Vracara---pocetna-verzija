-- Detaljni podaci o stambenoj zajednici. Bezbedno za ponovno pokretanje.
alter table public.buildings add column if not exists code text;
alter table public.buildings add column if not exists address text;
alter table public.buildings add column if not exists city text;
alter table public.buildings add column if not exists municipality text;
alter table public.buildings add column if not exists postal_code text;
alter table public.buildings add column if not exists bank_account text;
alter table public.buildings add column if not exists email text;
alter table public.buildings add column if not exists year_built integer;
alter table public.buildings add column if not exists elevator_count integer;
alter table public.buildings add column if not exists management_type text;
alter table public.buildings add column if not exists floors text;
alter table public.buildings add column if not exists heating_type text;
alter table public.buildings add column if not exists tax_id text;
alter table public.buildings add column if not exists registration_number text;
alter table public.buildings add column if not exists opening_balance numeric;
alter table public.buildings add column if not exists opening_balance_date date;
alter table public.buildings add column if not exists comment text;

create unique index if not exists buildings_code_unique on public.buildings (lower(code)) where code is not null;

-- Upravnik može da menja podatke svoje zgrade (dodavanje i brisanje ostaje superadminu).
drop policy if exists "buildings_update_admin_own" on public.buildings;
create policy "buildings_update_admin_own" on public.buildings for update
  using (my_role() = 'admin' and id = my_building_id())
  with check (my_role() = 'admin' and id = my_building_id());

notify pgrst, 'reload schema';
