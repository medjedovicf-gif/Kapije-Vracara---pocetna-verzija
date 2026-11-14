export const EXPENSE_CATEGORIES = ['Održavanje', 'Čišćenje', 'Struja', 'Voda', 'Lift', 'Popravke', 'Osiguranje', 'Upravljanje', 'Ostalo'] as const;
export const PLANNED_WORK_STATUSES = ['Planirano', 'U toku', 'Završeno', 'Otkazano'] as const;

export const formatRsd = (n: number) => `${Math.round(n).toLocaleString('de-DE')} RSD`;

export { formatDate } from '@/lib/format';

/** Fakture koje mogu da se učitaju: PDF ili slika, najviše 4 MB (limit server akcije). */
export const MAX_EXPENSE_FILE = 4 * 1024 * 1024;
export const EXPENSE_FILE_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic';
