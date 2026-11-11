-- ============================================================
-- Dokumenti zgrade + rezervacije zajedničkih prostora
-- Idempotentno: može da se pokrene više puta.
-- Pokrenuti posle schema.sql i ostalih migracija.
-- ============================================================

create extension if not exists btree_gist;

-- ---------- DOKUMENTI ----------
create table if not exists public.building_documents (
  id bigint generated always as identity primary key,
  building_id uuid not null references public.buildings(id) on delete cascade,
  title text not null,
  category text not null default 'Ostalo',
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  visible_to_residents boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.building_documents add constraint building_documents_category_check
    check (category in ('Zapisnik','Ugovor','Pravilnik','Račun','Obaveštenje','Ostalo'));
exception when duplicate_object then null;
end $$;

create index if not exists building_documents_building_idx on public.building_documents (building_id, created_at desc);

alter table public.building_documents enable row level security;

drop policy if exists "documents_select" on public.building_documents;
create policy "documents_select" on public.building_documents for select using (
  my_role() = 'superadmin'
  or (my_role() = 'admin' and building_id = my_building_id())
  or (my_role() = 'resident' and building_id = my_building_id() and visible_to_residents)
);

drop policy if exists "documents_write_admin" on public.building_documents;
create policy "documents_write_admin" on public.building_documents for all
  using (my_role() = 'admin' and building_id = my_building_id())
  with check (my_role() = 'admin' and building_id = my_building_id());

drop policy if exists "documents_write_superadmin" on public.building_documents;
create policy "documents_write_superadmin" on public.building_documents for all
  using (my_role() = 'superadmin') with check (my_role() = 'superadmin');

-- Privatni bucket: fajlovi se preuzimaju samo preko kratkotrajnih potpisanih linkova
-- koje server pravi tek posle provere prava (RLS iznad).
insert into storage.buckets (id, name, public) values ('building-documents', 'building-documents', false)
on conflict (id) do update set public = false;

-- ---------- REZERVACIJE ----------
create table if not exists public.common_spaces (
  id bigint generated always as identity primary key,
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  description text,
  requires_approval boolean not null default true,
  max_hours integer not null default 4 check (max_hours between 1 and 24),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.space_bookings (
  id bigint generated always as identity primary key,
  space_id bigint not null references public.common_spaces(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  status text not null default 'Na čekanju',
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint space_bookings_time_check check (ends_at > starts_at)
);

do $$ begin
  alter table public.space_bookings add constraint space_bookings_status_check
    check (status in ('Na čekanju','Potvrđeno','Odbijeno','Otkazano'));
exception when duplicate_object then null;
end $$;

-- Isti prostor ne može biti dvaput zauzet u istom terminu (aktivne rezervacije).
do $$ begin
  alter table public.space_bookings add constraint space_bookings_no_overlap
    exclude using gist (space_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('Na čekanju','Potvrđeno'));
exception when duplicate_object then null;
end $$;

create index if not exists space_bookings_space_time_idx on public.space_bookings (space_id, starts_at);
create index if not exists space_bookings_resident_idx on public.space_bookings (resident_id, starts_at desc);

-- Pre upisa: zgrada se uzima iz prostora, status zavisi od toga da li prostor traži odobrenje,
-- i proverava se trajanje. Stanar ne može sam sebi da postavi status ili tuđu zgradu.
create or replace function public.prepare_space_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.common_spaces;
begin
  select * into s from public.common_spaces where id = new.space_id;
  if s.id is null or not s.active then
    raise exception 'Prostor nije dostupan.';
  end if;
  new.building_id := s.building_id;
  if extract(epoch from (new.ends_at - new.starts_at)) / 3600 > s.max_hours then
    raise exception 'Najduže trajanje rezervacije je % h.', s.max_hours;
  end if;
  if new.starts_at < now() - interval '5 minutes' then
    raise exception 'Termin je u prošlosti.';
  end if;
  if coalesce(my_role(), '') = 'resident' then
    new.resident_id := auth.uid();
    new.status := case when s.requires_approval then 'Na čekanju' else 'Potvrđeno' end;
    new.decided_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prepare_space_booking on public.space_bookings;
create trigger trg_prepare_space_booking before insert on public.space_bookings
  for each row execute function public.prepare_space_booking();

-- Stanar sme samo da otkaže svoju rezervaciju; ništa drugo ne sme da menja.
create or replace function public.guard_space_booking_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(my_role(), '') = 'resident' then
    if new.status <> 'Otkazano'
       or new.space_id is distinct from old.space_id
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.resident_id is distinct from old.resident_id
       or new.building_id is distinct from old.building_id then
      raise exception 'Možete samo da otkažete svoju rezervaciju.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_space_booking_update on public.space_bookings;
create trigger trg_guard_space_booking_update before update on public.space_bookings
  for each row execute function public.guard_space_booking_update();

alter table public.common_spaces enable row level security;
alter table public.space_bookings enable row level security;

drop policy if exists "spaces_select" on public.common_spaces;
create policy "spaces_select" on public.common_spaces for select using (
  my_role() = 'superadmin' or building_id = my_building_id()
);
drop policy if exists "spaces_write_admin" on public.common_spaces;
create policy "spaces_write_admin" on public.common_spaces for all
  using (my_role() = 'admin' and building_id = my_building_id())
  with check (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "spaces_write_superadmin" on public.common_spaces;
create policy "spaces_write_superadmin" on public.common_spaces for all
  using (my_role() = 'superadmin') with check (my_role() = 'superadmin');

-- Stanari vide sve rezervacije svoje zgrade (da bi videli zauzete termine).
drop policy if exists "bookings_select" on public.space_bookings;
create policy "bookings_select" on public.space_bookings for select using (
  my_role() = 'superadmin' or building_id = my_building_id()
);
drop policy if exists "bookings_insert_resident" on public.space_bookings;
create policy "bookings_insert_resident" on public.space_bookings for insert
  with check (my_role() = 'resident' and resident_id = auth.uid());
drop policy if exists "bookings_update_own" on public.space_bookings;
create policy "bookings_update_own" on public.space_bookings for update
  using (my_role() = 'resident' and resident_id = auth.uid());
drop policy if exists "bookings_write_admin" on public.space_bookings;
create policy "bookings_write_admin" on public.space_bookings for all
  using (my_role() = 'admin' and building_id = my_building_id())
  with check (my_role() = 'admin' and building_id = my_building_id());
drop policy if exists "bookings_write_superadmin" on public.space_bookings;
create policy "bookings_write_superadmin" on public.space_bookings for all
  using (my_role() = 'superadmin') with check (my_role() = 'superadmin');
