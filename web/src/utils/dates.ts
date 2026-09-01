export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return toIsoDate(dt);
}

export function monthRange(year: number, month0: number): { start: string; end: string } {
  const start = toIsoDate(new Date(year, month0, 1));
  const end = toIsoDate(new Date(year, month0 + 1, 0));
  return { start, end };
}

export function formatMonthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split('-').map(Number);
  const [by, bm, bd] = bIso.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}

/** Formatea una fecha para mostrar en listas (acepta "YYYY-MM-DD" o un timestamp ISO completo). */
export function formatDateShort(isoOrTimestamp: string): string {
  const datePart = isoOrTimestamp.slice(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return datePart;
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
