// NBS IPS QR ("IPS Skeniraj") i poziv na broj po modelu 97.
// Bez zavisnosti, može da se koristi i na serveru i u browseru.

export interface BillingSettings {
  building_id: string;
  payee_name: string;
  payee_address: string | null;
  bank_account: string;
  payment_code: string;
  purpose: string;
  default_amount: number;
  due_day: number;
}

/** Ostatak deljenja dugačkog broja (kao string) sa 97. */
function mod97(digits: string) {
  let r = 0;
  for (const ch of digits) r = (r * 10 + Number(ch)) % 97;
  return r;
}

/** Kontrolni broj po ISO 7064 MOD 97-10 (model 97 i tekući računi). */
export function control97(base: string) {
  return String(98 - mod97(`${base}00`)).padStart(2, '0');
}

/**
 * Tekući račun u 18 cifara. Prima "160-5100000000-04", "160510000000000004" itd.
 * Vraća null ako format ili kontrolni broj nisu ispravni.
 */
export function normalizeAccount(input: string): string | null {
  const s = input.replace(/\s/g, '');
  let digits: string;
  const parts = s.split('-');
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    if (parts[0].length !== 3 || parts[2].length !== 2 || parts[1].length > 13) return null;
    digits = parts[0] + parts[1].padStart(13, '0') + parts[2];
  } else if (/^\d{18}$/.test(s)) {
    digits = s;
  } else {
    return null;
  }
  return control97(digits.slice(0, 16)) === digits.slice(16) ? digits : null;
}

/** "160-0000005100000-04" → lepši prikaz "160-5100000000-04" */
export function formatAccount(digits: string) {
  if (!/^\d{18}$/.test(digits)) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 16).replace(/^0+(?=\d)/, '')}-${digits.slice(16)}`;
}

/**
 * Poziv na broj (model 97) za fakturu: kontrolni broj + stan (4 cifre) + broj fakture (6 cifara).
 * Jedinstven je po fakturi, pa se uplata sa izvoda može povezati tačno sa njom.
 */
export function invoiceReference(unit: string, invoiceId: number) {
  const unitDigits = (unit.replace(/\D/g, '') || '0').slice(-4).padStart(4, '0');
  const base = `${unitDigits}${String(invoiceId).padStart(6, '0')}`;
  return `${control97(base)}${base}`;
}

/** Za prikaz: "97 47-0012-000123" */
export function formatReference(ref: string) {
  return `97 ${ref.slice(0, 2)}-${ref.slice(2, 6)}-${ref.slice(6)}`;
}

const clean = (s: string, max: number) => s.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Iznos u IPS formatu: "RSD3000,00" */
export function ipsAmount(amount: number) {
  return `RSD${amount.toFixed(2).replace('.', ',')}`;
}

/**
 * Tekst za IPS QR kod (NBS standard, tip PR — "prenesi"). Vraća null ako podešavanja nisu potpuna.
 * Polja: K, V, C, R (račun 18 cifara), N (primalac), I (iznos), P (platilac), SF (šifra), S (svrha), RO (model + poziv na broj).
 */
export function buildIpsPayload(input: {
  settings: Pick<BillingSettings, 'payee_name' | 'payee_address' | 'bank_account' | 'payment_code' | 'purpose'>;
  amount: number;
  payer?: string;
  purpose?: string;
  reference?: string;
}): string | null {
  const account = normalizeAccount(input.settings.bank_account);
  const payee = clean(input.settings.payee_name, 70);
  if (!account || !payee || !(input.amount > 0)) return null;
  const code = /^\d{3}$/.test(input.settings.payment_code) ? input.settings.payment_code : '289';
  const name = [payee, clean(input.settings.payee_address ?? '', 70)].filter(Boolean).join('\n').slice(0, 70);
  const fields = [
    'K:PR',
    'V:01',
    'C:1',
    `R:${account}`,
    `N:${name}`,
    `I:${ipsAmount(Math.round(input.amount * 100) / 100)}`,
    input.payer ? `P:${clean(input.payer, 70)}` : null,
    `SF:${code}`,
    `S:${clean(input.purpose || input.settings.purpose || 'Održavanje zgrade', 35)}`,
    input.reference ? `RO:97${input.reference}` : null,
  ];
  return fields.filter(Boolean).join('|');
}

const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];

/** "2026-11" → "novembar 2026" (latinica, ne zavisi od ICU podrške na serveru) */
export function periodLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${y}` : period;
}

/** Tekući obračunski mesec po beogradskom vremenu, "YYYY-MM". */
export function currentPeriod(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit' }).formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}`;
}
