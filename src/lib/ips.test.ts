import { describe, expect, it } from 'vitest';
import { buildIpsPayload, control97, currentPeriod, formatAccount, invoiceReference, ipsAmount, normalizeAccount, periodLabel } from './ips';

describe('model 97', () => {
  it('računa kontrolni broj po ISO 7064 MOD 97-10', () => {
    // Isti algoritam kao IBAN. Poznat primer: GB82 WEST 1234 5698 7654 32.
    // Slova u cifre (W=32, E=14, S=28, T=29, G=16, B=11), oznaka zemlje ide na kraj.
    expect(control97('32142829' + '12345698765432' + '1611')).toBe('82');
  });

  it('poziv na broj za fakturu je validan i jedinstven po fakturi', () => {
    const ref = invoiceReference('12B', 123);
    expect(ref).toMatch(/^\d{12}$/);
    expect(ref.slice(2)).toBe('0012000123');
    expect(control97(ref.slice(2))).toBe(ref.slice(0, 2));
    expect(invoiceReference('12B', 124)).not.toBe(ref);
  });
});

describe('tekući račun', () => {
  it('prihvata zapis sa crticama i dopunjuje nulama', () => {
    const digits = '1600000005100000';
    const acc = `${digits}${control97(digits)}`;
    expect(normalizeAccount(`160-5100000-${acc.slice(16)}`)).toBe(acc);
    expect(normalizeAccount(acc)).toBe(acc);
    expect(formatAccount(acc)).toBe(`160-5100000-${acc.slice(16)}`);
  });

  it('odbija pogrešan kontrolni broj i loš format', () => {
    const digits = '1600000005100000';
    const wrong = String((Number(control97(digits)) + 1) % 100).padStart(2, '0');
    expect(normalizeAccount(`${digits}${wrong}`)).toBeNull();
    expect(normalizeAccount('abc')).toBeNull();
    expect(normalizeAccount('160-123')).toBeNull();
  });
});

describe('IPS QR', () => {
  const digits = '1600000005100000';
  const account = `${digits}${control97(digits)}`;
  const settings = { payee_name: 'Stambena zajednica Sazonova 75', payee_address: 'Beograd', bank_account: account, payment_code: '289', purpose: 'Održavanje zgrade' };

  it('formatira iznos sa zarezom', () => {
    expect(ipsAmount(3000)).toBe('RSD3000,00');
    expect(ipsAmount(1290.5)).toBe('RSD1290,50');
  });

  it('pravi tekst po NBS formatu', () => {
    const ref = invoiceReference('1', 7);
    const payload = buildIpsPayload({ settings, amount: 2500, payer: 'Marko Petrović, stan 1', reference: ref, purpose: 'Održavanje novembar 2026' });
    expect(payload).toBe(
      `K:PR|V:01|C:1|R:${account}|N:Stambena zajednica Sazonova 75\nBeograd|I:RSD2500,00|P:Marko Petrović, stan 1|SF:289|S:Održavanje novembar 2026|RO:97${ref}`,
    );
  });

  it('vraća null bez računa, primaoca ili iznosa', () => {
    expect(buildIpsPayload({ settings: { ...settings, bank_account: '' }, amount: 100 })).toBeNull();
    expect(buildIpsPayload({ settings: { ...settings, payee_name: '' }, amount: 100 })).toBeNull();
    expect(buildIpsPayload({ settings, amount: 0 })).toBeNull();
  });

  it('svrha je najviše 35 znakova i bez znaka |', () => {
    const p = buildIpsPayload({ settings, amount: 1, purpose: 'a|b'.repeat(30) })!;
    const s = p.split('|').find((x) => x.startsWith('S:'))!;
    expect(s.length).toBeLessThanOrEqual(37);
  });
});

describe('obračunski mesec', () => {
  it('daje naziv meseca latinicom', () => {
    expect(periodLabel('2026-11')).toBe('novembar 2026');
  });
  it('tekući mesec po beogradskom vremenu', () => {
    expect(currentPeriod(new Date('2026-11-30T23:30:00Z'))).toBe('2026-12');
  });
});
