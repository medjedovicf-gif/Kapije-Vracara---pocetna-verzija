import { describe, expect, it } from 'vitest';
import { buildReport, exportCsv, presetRange, toCsv, type ReportData } from './finance-report';
import type { BuildingExpense, Invoice, InvoicePayment } from './types';

const inv = (p: Partial<Invoice>): Invoice => ({ id: 1, unit: '1', building_id: 'b', amount: 1000, month: 'novembar 2026', status: 'Poslata', from_email: null, recipient_name: null, recipient_email: null, description: null, due_date: null, paid_at: null, created_at: '2026-11-05T10:00:00Z', ...p });
const pay = (p: Partial<InvoicePayment>): InvoicePayment => ({ id: 1, invoice_id: null, unit: '1', building_id: 'b', amount: 500, payment_date: '2026-11-10', reference: null, note: null, recorded_by: null, created_at: '2026-11-10T10:00:00Z', ...p });
const exp = (p: Partial<BuildingExpense>): BuildingExpense => ({ id: 1, building_id: 'b', supplier: 'EPS', invoice_number: null, category: 'Struja', description: null, amount: 300, issue_date: '2026-11-03', due_date: null, status: 'Neplaćeno', paid_at: null, file_path: null, planned_work_id: null, created_by: null, created_at: '2026-11-03T10:00:00Z', ...p });

const data: ReportData = {
  building: { id: 'b', name: 'Zgrada', opening_balance: 10000, opening_balance_date: '2026-10-01' },
  invoices: [inv({ id: 1, unit: '1' }), inv({ id: 2, unit: '2', status: 'Plaćena', paid_at: '2026-11-12' }), inv({ id: 3, unit: '1', created_at: '2026-10-05T10:00:00Z' })],
  payments: [pay({ invoice_id: 1, amount: 400 })],
  expenses: [exp({ id: 1 }), exp({ id: 2, supplier: 'Lift d.o.o.', category: 'Lift', amount: 2000, status: 'Plaćeno', paid_at: '2026-11-20' }), exp({ id: 3, issue_date: '2026-09-01', status: 'Plaćeno', paid_at: '2026-09-02', amount: 999 })],
};

describe('zbirni izveštaj', () => {
  const rep = buildReport(data, { from: '2026-11-01', to: '2026-11-30' });

  it('sabira zaduženja, uplate, troškove i isplate u periodu', () => {
    expect(rep.totals.charged).toBe(2000);
    expect(rep.totals.paidIn).toBe(1400); // 400 knjiženo + 1000 plaćena faktura bez knjiženja
    expect(rep.totals.costs).toBe(2300);
    expect(rep.totals.paidOut).toBe(2000);
    expect(rep.totals.net).toBe(-600);
    expect(rep.totals.unpaidCosts).toBe(300);
  });

  it('stanje računa kreće od početnog stanja i ne broji odlive pre tog datuma', () => {
    expect(rep.totals.balance).toBe(10000 + 1400 - 2000);
  });

  it('grupiše troškove po kategoriji sa udelom', () => {
    expect(rep.byCategory.map((c) => [c.name, c.total, c.share])).toEqual([['Lift', 2000, 87], ['Struja', 300, 13]]);
  });

  it('po stanu prikazuje razliku zaduženo − uplaćeno', () => {
    expect(rep.byUnit).toEqual([{ unit: '1', charged: 1000, paidIn: 400, diff: 600 }, { unit: '2', charged: 1000, paidIn: 1000, diff: 0 }]);
  });
});

describe('CSV', () => {
  it('koristi ; i decimalni zarez, sa BOM za Excel', () => {
    const csv = toCsv(['A', 'B'], [['x;y', 1234.5]]);
    expect(csv).toBe('﻿A;B\r\n"x;y";1234,50\r\n');
  });
  it('izvoz po mesecima ima red UKUPNO', () => {
    const csv = exportCsv('months', buildReport(data, { from: '2026-01-01', to: '2026-12-31' }));
    expect(csv).toContain('UKUPNO');
    expect(csv).toContain('novembar 2026');
  });
});

describe('periodi', () => {
  it('prošli mesec preko granice godine', () => {
    expect(presetRange('last-month', '2026-01-15')).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
  });
  it('kvartal', () => {
    expect(presetRange('quarter', '2026-11-14')).toMatchObject({ from: '2026-10-01', to: '2026-12-31' });
  });
});
