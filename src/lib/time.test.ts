import { describe, expect, it } from 'vitest';
import { localToUtcIso } from './time';

describe('localToUtcIso (Europe/Belgrade)', () => {
  it('zimsko vreme je UTC+1', () => {
    expect(localToUtcIso('2026-11-14', '18:30')).toBe('2026-11-14T17:30:00.000Z');
  });

  it('letnje vreme je UTC+2', () => {
    expect(localToUtcIso('2026-07-01', '09:00')).toBe('2026-07-01T07:00:00.000Z');
  });

  it('ponoć prelazi na prethodni dan u UTC-u', () => {
    expect(localToUtcIso('2026-01-01', '00:00')).toBe('2025-12-31T23:00:00.000Z');
  });

  it('dan promene na letnje vreme (29. mart 2026)', () => {
    expect(localToUtcIso('2026-03-29', '01:00')).toBe('2026-03-29T00:00:00.000Z');
    expect(localToUtcIso('2026-03-29', '04:00')).toBe('2026-03-29T02:00:00.000Z');
  });

  it('odbija neispravan unos', () => {
    expect(localToUtcIso('14.11.2026', '18:30')).toBeNull();
    expect(localToUtcIso('2026-11-14', '25:00')).toBeNull();
    expect(localToUtcIso('2026-13-01', '10:00')).toBeNull();
  });
});
