// Prikazni nazivi. Vrednosti u bazi ostaju iste (Low/Medium/High/Critical).
export const PRIORITY_LABELS: Record<string, string> = {
  Low: 'Nisko',
  Medium: 'Srednje',
  High: 'Visoko',
  Critical: 'Kritično',
};

// CSS klase za oznaku statusa rezervacije.
export const BOOKING_STATUS_TAG: Record<string, string> = {
  'Na čekanju': 'tag-gold',
  'Potvrđeno': 'tag-sage',
  'Odbijeno': 'tag-brick',
  'Otkazano': 'bg-cream-2 text-ink-soft',
};

export function priorityLabel(priority: string | null | undefined): string {
  if (!priority) return '—';
  return PRIORITY_LABELS[priority] ?? priority;
}
