import { addDays, toIsoDate } from './dates';

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=domingo … 6=sábado
}

function isScheduled(iso: string, activeDays: number[]): boolean {
  return activeDays.includes(weekdayOf(iso));
}

export interface HabitStatsResult {
  currentStreak: number;
  bestStreak: number;
  completionRate30d: number; // 0..1
  totalCompletions: number;
  lastCompletedDate: string | null;
  doneToday: boolean;
}

/**
 * Calcula racha actual, mejor racha histórica y % de cumplimiento de los
 * últimos 30 días, respetando los días programados del hábito (activeDays).
 * Días no programados no rompen ni suman racha — se saltan.
 */
export function computeHabitStats(
  completedDates: string[],
  activeDays: number[],
  startDateIso: string,
  todayIso: string
): HabitStatsResult {
  const completedSet = new Set(completedDates);
  const totalCompletions = completedSet.size;
  const lastCompletedDate = completedDates.length
    ? completedDates.reduce((a, b) => (a > b ? a : b))
    : null;
  const doneToday = completedSet.has(todayIso);

  // --- racha actual: retrocede desde hoy, salta días no programados ---
  let currentStreak = 0;
  let cursor = todayIso;
  if (isScheduled(cursor, activeDays) && !completedSet.has(cursor)) {
    // Hoy está programado pero aún no se marcó: no cuenta como falla todavía.
    cursor = addDays(cursor, -1);
  }
  // Límite de seguridad: no retroceder más allá de 2 años.
  for (let i = 0; i < 730 && cursor >= startDateIso; i++) {
    if (!isScheduled(cursor, activeDays)) { cursor = addDays(cursor, -1); continue; }
    if (completedSet.has(cursor)) { currentStreak++; cursor = addDays(cursor, -1); }
    else break;
  }

  // --- mejor racha histórica: recorre desde start_date hasta hoy ---
  let bestStreak = 0;
  let run = 0;
  let d = startDateIso;
  let guard = 0;
  while (d <= todayIso && guard < 3650) {
    if (isScheduled(d, activeDays)) {
      if (completedSet.has(d)) { run++; bestStreak = Math.max(bestStreak, run); }
      else run = 0;
    }
    d = addDays(d, 1);
    guard++;
  }

  // --- % de cumplimiento en los últimos 30 días ---
  let scheduled30 = 0;
  let done30 = 0;
  let c = addDays(todayIso, -29);
  for (let i = 0; i < 30; i++) {
    if (c >= startDateIso && isScheduled(c, activeDays)) {
      scheduled30++;
      if (completedSet.has(c)) done30++;
    }
    c = addDays(c, 1);
  }
  const completionRate30d = scheduled30 > 0 ? done30 / scheduled30 : 0;

  return { currentStreak, bestStreak, completionRate30d, totalCompletions, lastCompletedDate, doneToday };
}

export function isoNow(): string {
  return toIsoDate(new Date());
}

/** Días programados y días cumplidos de un hábito en un rango arbitrario (bloque base reutilizado abajo). */
export function scheduledAndDoneInRange(
  completedDates: string[],
  activeDays: number[],
  rangeStartIso: string,
  rangeEndIso: string,
  habitStartDateIso: string
): { scheduled: number; done: number } {
  const completedSet = new Set(completedDates);
  const effectiveStart = habitStartDateIso > rangeStartIso ? habitStartDateIso : rangeStartIso;
  if (effectiveStart > rangeEndIso) return { scheduled: 0, done: 0 };
  let scheduled = 0;
  let done = 0;
  let d = effectiveStart;
  let guard = 0;
  while (d <= rangeEndIso && guard < 3650) {
    if (isScheduled(d, activeDays)) {
      scheduled++;
      if (completedSet.has(d)) done++;
    }
    d = addDays(d, 1);
    guard++;
  }
  return { scheduled, done };
}

/** % de cumplimiento de un hábito en un rango arbitrario de fechas (para Estadísticas). */
export function completionRateInRange(
  completedDates: string[],
  activeDays: number[],
  rangeStartIso: string,
  rangeEndIso: string,
  habitStartDateIso: string
): number {
  const { scheduled, done } = scheduledAndDoneInRange(completedDates, activeDays, rangeStartIso, rangeEndIso, habitStartDateIso);
  return scheduled > 0 ? done / scheduled : 0;
}
