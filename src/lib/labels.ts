// Prikazni nazivi. Vrednosti u bazi ostaju iste (Low/Medium/High/Critical).
export const PRIORITY_LABELS: Record<string, string> = {
  Low: 'Nisko',
  Medium: 'Srednje',
  High: 'Visoko',
  Critical: 'Kritično',
};

export function priorityLabel(priority: string | null | undefined): string {
  if (!priority) return '—';
  return PRIORITY_LABELS[priority] ?? priority;
}
