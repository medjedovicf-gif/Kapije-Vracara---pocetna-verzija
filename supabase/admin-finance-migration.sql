-- Fakture dobavljača (troškovi zgrade) i planirani radovi.
-- Pokrenuti jednom nad postojećom bazom. Bezbedno za ponovno pokretanje.

create table if not exists public.planned_works (
  id bigint generated always as identity primary key,
  building_id uuid not null references public.buildings(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Ostalo',
  contractor text,
  estimated_cost numeric not null default 0 check (estimated_cost >= 0),
  planned_date date,
  status text not null default 'Planirano',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.planned_works add constraint planned_works_status_check check (status in ('Planirano','U toku','Završeno','Otkazano'));
exception when duplicate_object then null;
end $$;

create table if not exists public.building_expenses (
  id bigint generated always as identity primary key,
  building_id uuid not null references public.buildings(id) on delete cascade,
  supplier text not null,
  invoice_number text,
  category text not null default 'Ostalo',
  description text,
  amount numeric not null check (amount >= 0),
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'Neplaćeno',
  paid_at date,
  file_path text,
  planned_work_id bigint references public.planned_works(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.building_expenses add constraint building_expenses_status_check check (status in ('Neplaćeno','Plaćeno'));
exception when duplicate_object then null;
end $$;
create index if not exists building_expenses_building_date on public.building_expenses (building_id, issue_date desc);
create index if not exists planned_works_building_date on public.planned_works (building_id, planned_date);

alter table public.planned_works enable row level security;
alter table public.building_expenses enable row level security;

-- Upravnik svoje zgrade i superadmin: sve. Stanari vide samo planirane radove svoje zgrade.
drop policy if exists "planned_works_staff" on public.planned_works;
create policy "planned_works_staff" on public.planned_works for all
  using (my_role() = 'superadmin' or (my_role() = 'admin' and building_id = my_building_id()))
  with check (my_role() = 'superadmin' or (my_role() = 'admin' and building_id = my_building_id()));
drop policy if exists "planned_works_resident_read" on public.planned_works;
create policy "planned_works_resident_read" on public.planned_works for select
  using (my_role() = 'resident' and building_id = my_building_id());

drop policy if exists "building_expenses_staff" on public.building_expenses;
create policy "building_expenses_staff" on public.building_expenses for all
  using (my_role() = 'superadmin' or (my_role() = 'admin' and building_id = my_building_id()))
  with check (my_role() = 'superadmin' or (my_role() = 'admin' and building_id = my_building_id()));

-- Privatni bucket za skenirane fakture (PDF/slika). Putanja: <building_id>/<uuid>.<ext>
insert into storage.buckets (id, name, public, file_size_limit)
values ('expense-files', 'expense-files', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "expense_files_staff" on storage.objects;
create policy "expense_files_staff" on storage.objects for all
  using (bucket_id = 'expense-files' and (my_role() = 'superadmin' or (my_role() = 'admin' and (storage.foldername(name))[1] = my_building_id()::text)))
  with check (bucket_id = 'expense-files' and (my_role() = 'superadmin' or (my_role() = 'admin' and (storage.foldername(name))[1] = my_building_id()::text)));

notify pgrst, 'reload schema';
