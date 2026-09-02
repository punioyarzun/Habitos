/** Utilidades de tiempo: duración de entrenamientos y horas de recordatorios. */

/** Segundos → "45 min" / "1 h 12 min" / "38 s". Para tarjetas y resúmenes. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

/** Segundos → "MM:SS" (para el cronómetro en vivo y el timer de descanso). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** "HH:MM:SS" o "HH:MM" → "HH:MM". Devuelve '' si viene vacío/nulo. */
export function formatTimeShort(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5);
}

/** Minutos desde medianoche de una hora "HH:MM[:SS]". null → un valor alto para ordenar al final. */
export function timeToMinutes(time: string | null | undefined): number {
  if (!time) return 24 * 60 + 1;
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
