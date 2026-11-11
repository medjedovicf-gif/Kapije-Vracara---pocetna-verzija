import { describe, expect, it } from 'vitest';
import { formatDuration, resolutionHours, summarizeByUnit } from './ticket-stats';
import type { Ticket } from './types';

const t = (id: number, unit: string, status: string, created: string, updated: string) =>
  ({ id, unit, status, created_at: created, updated_at: updated }) as unknown as Ticket;

describe('ticket-stats', () => {
  it('računa vreme rešavanja u satima', () => {
    expect(resolutionHours({ created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T16:00:00Z' })).toBe(6);
  });

  it('formatira trajanje', () => {
    expect(formatDuration(0.5)).toBe('< 1 h');
    expect(formatDuration(5)).toBe('5 h');
    expect(formatDuration(72)).toBe('3 dana');
  });

  it('grupiše po stanu, sa otvorenim stanovima na vrhu', () => {
    const rows = summarizeByUnit(
      [
        t(1, '12', 'Rešeno', '2026-11-01T00:00:00Z', '2026-11-01T10:00:00Z'),
        t(2, '12', 'Rešeno', '2026-11-02T00:00:00Z', '2026-11-02T20:00:00Z'),
        t(3, '3', 'Novo', '2026-11-03T00:00:00Z', '2026-11-03T00:00:00Z'),
      ],
      [{ ticket_id: 1, rating: 5 }, { ticket_id: 2, rating: 3 }]
    );
    expect(rows.map((r) => r.unit)).toEqual(['3', '12']);
    const u12 = rows.find((r) => r.unit === '12')!;
    expect(u12).toMatchObject({ total: 2, open: 0, resolved: 2, avgHours: 15, avgRating: 4 });
    expect(rows.find((r) => r.unit === '3')).toMatchObject({ open: 1, avgHours: null, avgRating: null });
  });
});
