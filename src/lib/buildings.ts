export const MANAGEMENT_TYPES = ['Profesionalni upravnik', 'Upravnik iz reda stanara', 'Prinudna uprava'] as const;
export const HEATING_TYPES = ['Daljinsko (toplana)', 'Etažno – gas', 'Etažno – struja', 'Toplotna pumpa', 'Kotlarnica zgrade', 'Ostalo'] as const;

/** Pun prikaz adrese: "Sazonova 75, 11000 Beograd (Vračar)" */
export function fullAddress(b: { address?: string | null; postal_code?: string | null; city?: string | null; municipality?: string | null }) {
  const place = [b.postal_code, b.city].filter(Boolean).join(' ');
  const main = [b.address, place].filter(Boolean).join(', ');
  return b.municipality ? `${main}${main ? ' ' : ''}(${b.municipality})` : main;
}
