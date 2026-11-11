-- ============================================================
-- Zaštita profiles tabele od samopromene uloge i finansijskih polja.
-- Problem: politika "profiles_update_own" dozvoljava korisniku da menja
-- svoj red bez ograničenja kolona, pa stanar može sebi da postavi
-- role = 'superadmin', ili da menja balance / payment_status.
-- Ova migracija NIJE pokrenuta na produkciji. Pokrenuti tek posle provere.
-- ============================================================

create or replace function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Admin i superadmin smeju sve (uključujući rad iz server akcija).
  -- Service role nema auth.uid(), pa prolazi kroz ovu proveru.
  if auth.uid() is not null and coalesce(my_role(), '') not in ('admin','superadmin') then
    if new.role            is distinct from old.role
       or new.building_id  is distinct from old.building_id
       or new.unit         is distinct from old.unit
       or new.balance      is distinct from old.balance
       or new.payment_status is distinct from old.payment_status then
      raise exception 'Nemate dozvolu da menjate ova polja.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_update on profiles;
create trigger trg_guard_profile_update
  before update on profiles
  for each row execute function guard_profile_update();
