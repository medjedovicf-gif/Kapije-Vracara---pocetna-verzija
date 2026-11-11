import { describe, expect, it } from 'vitest';
import { priorityLabel } from './labels';

describe('priorityLabel', () => {
  it('prevodi sve prioritete iz baze', () => {
    expect(priorityLabel('Low')).toBe('Nisko');
    expect(priorityLabel('Medium')).toBe('Srednje');
    expect(priorityLabel('High')).toBe('Visoko');
    expect(priorityLabel('Critical')).toBe('Kritično');
  });

  it('nepoznatu vrednost vraća nepromenjenu, a praznu kao crticu', () => {
    expect(priorityLabel('Urgent')).toBe('Urgent');
    expect(priorityLabel(null)).toBe('—');
    expect(priorityLabel(undefined)).toBe('—');
  });
});
