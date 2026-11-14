'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/session';
import { normalizeAccount } from '@/lib/ips';
import { HEATING_TYPES, MANAGEMENT_TYPES } from '@/lib/buildings';

type Result = { error?: string; success?: boolean };

const text = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? '').trim().slice(0, max) || null;
const num = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? '').trim().replace(',', '.');
  return v === '' ? null : Number(v);
};

/**
 * Nova zgrada (samo superadmin) ili izmena postojeće (superadmin bilo koje, upravnik samo svoje).
 * Tekući račun se upisuje i u podešavanja uplate, da se ne unosi dvaput.
 */
export async function saveBuilding(buildingId: string | null, formData: FormData): Promise<Result> {
  const me = await getMyProfile();
  if (!me) return { error: 'Niste prijavljeni.' };
  const isSuper = me.role === 'superadmin';
  if (!isSuper && !(me.role === 'admin' && buildingId && buildingId === me.building_id)) return { error: 'Nemate ovlašćenje.' };

  const name = text(formData, 'name', 120);
  if (!name) return { error: 'Unesite naziv zgrade.' };

  const rawAccount = text(formData, 'bank_account', 40);
  const account = rawAccount ? normalizeAccount(rawAccount) : null;
  if (rawAccount && !account) return { error: 'Tekući račun nije ispravan (18 cifara sa kontrolnim brojem, npr. 160-5100000000-04).' };

  const taxId = text(formData, 'tax_id', 20)?.replace(/\s/g, '') ?? null;
  if (taxId && !/^\d{9}$/.test(taxId)) return { error: 'PIB ima 9 cifara.' };
  const regNo = text(formData, 'registration_number', 20)?.replace(/\s/g, '') ?? null;
  if (regNo && !/^\d{8}$/.test(regNo)) return { error: 'Matični broj ima 8 cifara.' };
  const postal = text(formData, 'postal_code', 10);
  if (postal && !/^\d{5}$/.test(postal)) return { error: 'Poštanski broj ima 5 cifara.' };
  const email = text(formData, 'email', 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Email zgrade nije ispravan.' };

  const year = num(formData, 'year_built');
  const thisYear = new Date().getFullYear();
  if (year !== null && !(Number.isInteger(year) && year >= 1800 && year <= thisYear + 5)) return { error: 'Godina izgradnje nije ispravna.' };
  const elevators = num(formData, 'elevator_count');
  if (elevators !== null && !(Number.isInteger(elevators) && elevators >= 0 && elevators <= 20)) return { error: 'Broj liftova nije ispravan.' };
  const opening = num(formData, 'opening_balance');
  if (opening !== null && !Number.isFinite(opening)) return { error: 'Početno stanje računa nije ispravno.' };

  const management = text(formData, 'management_type');
  const heating = text(formData, 'heating_type');

  const row = {
    name,
    code: text(formData, 'code', 40),
    address: text(formData, 'address', 120),
    city: text(formData, 'city', 60),
    municipality: text(formData, 'municipality', 60),
    postal_code: postal,
    bank_account: account,
    email,
    year_built: year,
    elevator_count: elevators,
    management_type: management && (MANAGEMENT_TYPES as readonly string[]).includes(management) ? management : null,
    floors: text(formData, 'floors', 40),
    heating_type: heating && (HEATING_TYPES as readonly string[]).includes(heating) ? heating : null,
    tax_id: taxId,
    registration_number: regNo,
    opening_balance: opening,
    opening_balance_date: text(formData, 'opening_balance_date', 10),
    comment: text(formData, 'comment', 2000),
  };

  const supabase = await createClient();
  let id = buildingId;
  if (id) {
    const { error } = await supabase.from('buildings').update(row as never).eq('id', id);
    if (error) return { error: error.code === '23505' ? 'Zgrada sa tim kodom već postoji.' : error.message };
  } else {
    if (!isSuper) return { error: 'Samo super administrator dodaje nove zgrade.' };
    const { data, error } = await supabase.from('buildings').insert(row as never).select('id').single<{ id: string }>();
    if (error || !data) return { error: error?.code === '23505' ? 'Zgrada sa tim kodom već postoji.' : error?.message ?? 'Zgrada nije sačuvana.' };
    id = data.id;
  }

  // Račun i naziv primaoca za uplatnice (IPS QR). Postojeća podešavanja (iznos, šifra…) ostaju.
  if (account) {
    const { data: existing } = await supabase.from('building_billing_settings').select('payee_name, payee_address').eq('building_id', id).maybeSingle<{ payee_name: string; payee_address: string | null }>();
    const payeeName = existing?.payee_name || `Stambena zajednica ${row.address ?? name}`.slice(0, 70);
    const payeeAddress = existing?.payee_address || [row.address, row.city].filter(Boolean).join(', ').slice(0, 70) || null;
    await supabase.from('building_billing_settings').upsert({ building_id: id, bank_account: account, payee_name: payeeName, payee_address: payeeAddress, updated_by: me.id, updated_at: new Date().toISOString() } as never);
  }

  await supabase.from('audit_logs').insert({ actor_id: me.id, action: buildingId ? 'building.updated' : 'building.created', entity_type: 'building', entity_id: id, summary: `${buildingId ? 'Izmenjeni podaci zgrade' : 'Dodata zgrada'}: ${name}.` } as never);

  revalidatePath('/super-admin/buildings');
  revalidatePath('/super-admin/users');
  revalidatePath('/admin/buildings');
  revalidatePath('/admin/payments');
  revalidatePath('/admin', 'layout');
  return { success: true };
}
