export const EXPENSE_CATEGORIES = ['Održavanje', 'Čišćenje', 'Struja', 'Voda', 'Lift', 'Popravke', 'Osiguranje', 'Upravljanje', 'Ostalo'] as const;
export const PLANNED_WORK_STATUSES = ['Planirano', 'U toku', 'Završeno', 'Otkazano'] as const;

export const formatRsd = (n: number) => `${Math.round(n).toLocaleString('de-DE')} RSD`;

export const formatDate = (d: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Fakture koje mogu da se učitaju: PDF ili slika, najviše 4 MB (limit server akcije). */
export const MAX_EXPENSE_FILE = 4 * 1024 * 1024;
export const EXPENSE_FILE_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic';
