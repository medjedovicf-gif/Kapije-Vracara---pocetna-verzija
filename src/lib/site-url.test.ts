import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

import { safeNextPath } from './site-url';

describe('safeNextPath', () => {
  it('propušta putanje unutar aplikacije', () => {
    expect(safeNextPath('/reset-password')).toBe('/reset-password');
    expect(safeNextPath('/admin/tickets?ticket=4')).toBe('/admin/tickets?ticket=4');
  });

  it('odbija preusmeravanje na tuđi sajt', () => {
    expect(safeNextPath('https://evil.example')).toBe('/');
    expect(safeNextPath('//evil.example')).toBe('/');
    expect(safeNextPath('/\\evil.example')).toBe('/');
    expect(safeNextPath('javascript:alert(1)')).toBe('/');
  });

  it('koristi rezervnu putanju kad next ne postoji', () => {
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath(undefined, '/login')).toBe('/login');
    expect(safeNextPath('', '/login')).toBe('/login');
  });
});
