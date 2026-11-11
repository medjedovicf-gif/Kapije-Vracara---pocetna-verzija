import type { Ticket, TicketRating } from '@/lib/types';

// Vreme rešavanja u satima. Za rešene probleme approksimira se poslednjom izmenom
// (updated_at), jer baza ne čuva poseban trenutak rešavanja.
export function resolutionHours(t: Pick<Ticket, 'created_at' | 'updated_at'>): number {
  const end = new Date(t.updated_at || t.created_at).getTime();
  return Math.max(0, (end - new Date(t.created_at).getTime()) / 36e5);
}

export function formatDuration(hours: number): string {
  if (hours < 1) return '< 1 h';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} dana`;
}

export type UnitSummary = {
  unit: string;
  total: number;
  open: number;
  resolved: number;
  avgHours: number | null;
  avgRating: number | null;
};

export function summarizeByUnit(tickets: Ticket[], ratings: Pick<TicketRating, 'ticket_id' | 'rating'>[]): UnitSummary[] {
  const byUnit = new Map<string, Ticket[]>();
  for (const t of tickets) {
    if (!t.unit) continue;
    byUnit.set(t.unit, [...(byUnit.get(t.unit) ?? []), t]);
  }
  const ratingByTicket = new Map(ratings.map((r) => [r.ticket_id, r.rating]));

  return [...byUnit.entries()]
    .map(([unit, list]) => {
      const resolved = list.filter((t) => t.status === 'Rešeno');
      const rated = list.map((t) => ratingByTicket.get(t.id)).filter((r): r is number => typeof r === 'number');
      return {
        unit,
        total: list.length,
        open: list.length - resolved.length,
        resolved: resolved.length,
        avgHours: resolved.length ? resolved.reduce((s, t) => s + resolutionHours(t), 0) / resolved.length : null,
        avgRating: rated.length ? rated.reduce((s, r) => s + r, 0) / rated.length : null,
      };
    })
    .sort((a, b) => b.open - a.open || b.total - a.total || a.unit.localeCompare(b.unit, 'sr', { numeric: true }));
}
