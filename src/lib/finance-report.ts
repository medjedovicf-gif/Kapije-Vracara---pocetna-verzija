// Zbirni finansijski izveštaj zgrade: zaduženja, uplate (prilivi), troškovi i isplate (odlivi).
// Čiste funkcije: isti obračun koriste stranica i izvoz u tabele.

import type { Building, BuildingExpense, Invoice, InvoicePayment } from './types';
import { periodLabel } from './ips';

export type ReportData = {
  building: Pick<Building, 'id' | 'name' | 'opening_balance' | 'opening_balance_date'> | null;
  invoices: Invoice[];
  payments: InvoicePayment[];
  expenses: BuildingExpense[];
};

export type Range = { from: string; to: string }; // YYYY-MM-DD, oba uključena

/** Datum po beogradskom vremenu (YYYY-MM-DD) za timestamp kolone. */
export function belgradeDate(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

const inRange = (d: string | null | undefined, r: Range) => !!d && d >= r.from && d <= r.to;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Uplata = knjižena uplata ili faktura označena kao plaćena bez posebnog knjiženja. */
export type Inflow = { date: string; unit: string; amount: number; reference: string | null; note: string | null; source: 'uplata' | 'faktura' };
/** Isplata = plaćena faktura dobavljača. */
export type Outflow = { date: string; supplier: string; category: string; amount: number; invoice_number: string | null };

export function inflows(d: ReportData): Inflow[] {
  const covered = new Set(d.payments.map((p) => p.invoice_id).filter(Boolean));
  const fromPayments: Inflow[] = d.payments.map((p) => ({ date: p.payment_date, unit: p.unit, amount: Number(p.amount), reference: p.reference, note: p.note, source: 'uplata' }));
  const fromInvoices: Inflow[] = d.invoices
    .filter((i) => i.status === 'Plaćena' && !covered.has(i.id))
    .map((i) => ({ date: i.paid_at ?? belgradeDate(i.created_at), unit: i.unit, amount: Number(i.amount), reference: null, note: `Faktura ${i.month}`, source: 'faktura' }));
  return [...fromPayments, ...fromInvoices].sort((a, b) => a.date.localeCompare(b.date));
}

export function outflows(d: ReportData): Outflow[] {
  return d.expenses
    .filter((e) => e.status === 'Plaćeno')
    .map((e) => ({ date: e.paid_at ?? e.issue_date, supplier: e.supplier, category: e.category, amount: Number(e.amount), invoice_number: e.invoice_number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildReport(d: ReportData, r: Range) {
  const charged = d.invoices.filter((i) => inRange(belgradeDate(i.created_at), r));
  const inAll = inflows(d);
  const outAll = outflows(d);
  const ins = inAll.filter((x) => inRange(x.date, r));
  const outs = outAll.filter((x) => inRange(x.date, r));
  const costs = d.expenses.filter((e) => inRange(e.issue_date, r));
  const sum = (xs: { amount: number }[]) => round2(xs.reduce((a, x) => a + Number(x.amount), 0));

  // Stanje računa: početno stanje + svi prilivi − svi odlivi od dana početnog stanja do kraja perioda.
  let balance: number | null = null;
  const ob = d.building?.opening_balance;
  if (ob !== null && ob !== undefined) {
    const start = d.building?.opening_balance_date ?? '0000-01-01';
    const after = (x: { date: string }) => x.date >= start && x.date <= r.to;
    balance = round2(Number(ob) + sum(inAll.filter(after)) - sum(outAll.filter(after)));
  }

  // Po mesecima
  const months = new Map<string, { charged: number; paidIn: number; costs: number; paidOut: number }>();
  const bucket = (m: string) => {
    if (!months.has(m)) months.set(m, { charged: 0, paidIn: 0, costs: 0, paidOut: 0 });
    return months.get(m)!;
  };
  charged.forEach((i) => { bucket(belgradeDate(i.created_at).slice(0, 7)).charged += Number(i.amount); });
  ins.forEach((x) => { bucket(x.date.slice(0, 7)).paidIn += x.amount; });
  costs.forEach((e) => { bucket(e.issue_date.slice(0, 7)).costs += Number(e.amount); });
  outs.forEach((x) => { bucket(x.date.slice(0, 7)).paidOut += x.amount; });
  const byMonth = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({
    month, label: periodLabel(month), charged: round2(v.charged), paidIn: round2(v.paidIn), costs: round2(v.costs), paidOut: round2(v.paidOut), net: round2(v.paidIn - v.paidOut),
  }));

  // Troškovi po kategoriji i dobavljaču (po datumu fakture, plaćeni i neplaćeni)
  const group = <K extends string>(key: (e: BuildingExpense) => K) => {
    const m = new Map<K, { count: number; total: number; paid: number }>();
    costs.forEach((e) => {
      const k = key(e);
      const v = m.get(k) ?? { count: 0, total: 0, paid: 0 };
      v.count += 1; v.total += Number(e.amount); if (e.status === 'Plaćeno') v.paid += Number(e.amount);
      m.set(k, v);
    });
    const total = sum(costs);
    return [...m.entries()].map(([name, v]) => ({ name, count: v.count, total: round2(v.total), paid: round2(v.paid), unpaid: round2(v.total - v.paid), share: total ? Math.round((v.total / total) * 1000) / 10 : 0 })).sort((a, b) => b.total - a.total);
  };

  // Po stanu: zaduženo i uplaćeno u periodu
  const units = new Map<string, { charged: number; paidIn: number }>();
  charged.forEach((i) => { const v = units.get(i.unit) ?? { charged: 0, paidIn: 0 }; v.charged += Number(i.amount); units.set(i.unit, v); });
  ins.forEach((x) => { const v = units.get(x.unit) ?? { charged: 0, paidIn: 0 }; v.paidIn += x.amount; units.set(x.unit, v); });
  const byUnit = [...units.entries()].map(([unit, v]) => ({ unit, charged: round2(v.charged), paidIn: round2(v.paidIn), diff: round2(v.charged - v.paidIn) }))
    .sort((a, b) => a.unit.localeCompare(b.unit, 'sr', { numeric: true }));

  return {
    totals: { charged: sum(charged), paidIn: sum(ins), costs: sum(costs), paidOut: sum(outs), net: round2(sum(ins) - sum(outs)), unpaidCosts: round2(sum(costs) - sum(costs.filter((e) => e.status === 'Plaćeno'))), balance },
    byMonth,
    byCategory: group((e) => e.category),
    bySupplier: group((e) => e.supplier),
    byUnit,
    inflows: ins,
    outflows: outs,
    costs,
  };
}

export type Report = ReturnType<typeof buildReport>;

/** Unapred zadati periodi. */
export function presetRange(preset: string | undefined, today = belgradeDate(new Date().toISOString())): Range & { preset: string } {
  const [y, m] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  switch (preset) {
    case 'month': return { preset, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` };
    case 'last-month': { const yy = m === 1 ? y - 1 : y; const mm = m === 1 ? 12 : m - 1; return { preset, from: `${yy}-${pad(mm)}-01`, to: `${yy}-${pad(mm)}-${lastDay(yy, mm)}` }; }
    case 'quarter': { const q = Math.floor((m - 1) / 3); return { preset, from: `${y}-${pad(q * 3 + 1)}-01`, to: `${y}-${pad(q * 3 + 3)}-${lastDay(y, q * 3 + 3)}` }; }
    case 'last-year': return { preset, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'all': return { preset, from: '2000-01-01', to: `${y + 1}-12-31` };
    default: return { preset: 'year', from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

// ---------- CSV za Excel (srpska podešavanja: ; kao separator, decimalni zarez) ----------

const csvCell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

const ddmmyyyy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export const EXPORTS = {
  months: 'Po mesecima',
  categories: 'Troškovi po kategoriji',
  suppliers: 'Troškovi po dobavljaču',
  units: 'Zaduženja i uplate po stanu',
  inflows: 'Uplate (prilivi)',
  outflows: 'Isplate (odlivi)',
  costs: 'Sve fakture dobavljača',
} as const;
export type ExportKind = keyof typeof EXPORTS;

export function exportCsv(kind: ExportKind, rep: Report): string {
  switch (kind) {
    case 'months':
      return toCsv(['Mesec', 'Zaduženo', 'Uplaćeno', 'Troškovi (fakture)', 'Isplaćeno', 'Neto (uplate − isplate)'],
        [...rep.byMonth.map((x) => [x.label, x.charged, x.paidIn, x.costs, x.paidOut, x.net]), ['UKUPNO', rep.totals.charged, rep.totals.paidIn, rep.totals.costs, rep.totals.paidOut, rep.totals.net]]);
    case 'categories':
    case 'suppliers': {
      const rows = kind === 'categories' ? rep.byCategory : rep.bySupplier;
      return toCsv([kind === 'categories' ? 'Kategorija' : 'Dobavljač', 'Broj faktura', 'Ukupno', 'Plaćeno', 'Neplaćeno', 'Udeo %'],
        [...rows.map((x) => [x.name, String(x.count), x.total, x.paid, x.unpaid, x.share]), ['UKUPNO', String(rep.costs.length), rep.totals.costs, round2(rep.totals.costs - rep.totals.unpaidCosts), rep.totals.unpaidCosts, 100]]);
    }
    case 'units':
      return toCsv(['Stan', 'Zaduženo', 'Uplaćeno', 'Razlika (duguje)'], rep.byUnit.map((x) => [x.unit, x.charged, x.paidIn, x.diff]));
    case 'inflows':
      return toCsv(['Datum', 'Stan', 'Iznos', 'Poziv na broj', 'Napomena', 'Izvor'], rep.inflows.map((x) => [ddmmyyyy(x.date), x.unit, x.amount, x.reference, x.note, x.source === 'uplata' ? 'Knjižena uplata' : 'Plaćena faktura']));
    case 'outflows':
      return toCsv(['Datum plaćanja', 'Dobavljač', 'Broj fakture', 'Kategorija', 'Iznos'], rep.outflows.map((x) => [ddmmyyyy(x.date), x.supplier, x.invoice_number, x.category, x.amount]));
    case 'costs':
      return toCsv(['Datum fakture', 'Dobavljač', 'Broj fakture', 'Kategorija', 'Opis', 'Iznos', 'Rok', 'Status', 'Datum plaćanja'],
        rep.costs.map((e) => [ddmmyyyy(e.issue_date), e.supplier, e.invoice_number, e.category, e.description, Number(e.amount), e.due_date ? ddmmyyyy(e.due_date) : '', e.status, e.paid_at ? ddmmyyyy(e.paid_at) : '']));
  }
}
