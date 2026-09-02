import type { WorkoutSession, WorkoutSetLog } from '../types/domain';
import { addDays, toIsoDate } from './dates';

/** Inicio de semana (lunes) de una fecha ISO. */
export function weekStartIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const offset = (date.getDay() + 6) % 7; // 0 = lunes
  return toIsoDate(new Date(y, m - 1, d - offset));
}

export interface GymDashboardStats {
  workoutsThisWeek: number;
  weekTarget: number; // días distintos entrenados esperados (para la barra)
  currentStreakDays: number;
  totalWorkouts: number;
  lastWorkout: WorkoutSession | null;
  totalSeconds: number;
  avgSeconds: number;
  weekProgressPct: number; // 0..100
}

/**
 * Métricas del dashboard a partir de las sesiones realizadas.
 * `activeRoutineDayCount` = cuántos días de entrenamiento (no descanso) tiene la
 * rutina activa; se usa como meta semanal para la barra de progreso.
 */
export function computeGymStats(
  sessions: WorkoutSession[],
  todayIso: string,
  activeRoutineDayCount = 3
): GymDashboardStats {
  const sorted = [...sessions].sort((a, b) => (a.performed_date < b.performed_date ? 1 : -1));
  const lastWorkout = sorted[0] ?? null;

  const thisWeekStart = weekStartIso(todayIso);
  const trainedDaysThisWeek = new Set(
    sessions.filter((s) => s.performed_date >= thisWeekStart && s.performed_date <= todayIso).map((s) => s.performed_date)
  );
  const workoutsThisWeek = trainedDaysThisWeek.size;

  const totalWorkouts = sessions.length;
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const avgSeconds = totalWorkouts > 0 ? Math.round(totalSeconds / totalWorkouts) : 0;

  // Racha de días consecutivos entrenados (cuenta hacia atrás desde hoy; si hoy
  // aún no entrenas no rompe la racha todavía — empieza a contar desde ayer).
  const trainedDates = new Set(sessions.map((s) => s.performed_date));
  let currentStreakDays = 0;
  let cursor = todayIso;
  if (!trainedDates.has(cursor)) cursor = addDays(cursor, -1);
  for (let i = 0; i < 366; i++) {
    if (trainedDates.has(cursor)) {
      currentStreakDays++;
      cursor = addDays(cursor, -1);
    } else break;
  }

  const weekTarget = Math.max(1, activeRoutineDayCount);
  const weekProgressPct = Math.min(100, Math.round((workoutsThisWeek / weekTarget) * 100));

  return {
    workoutsThisWeek,
    weekTarget,
    currentStreakDays,
    totalWorkouts,
    lastWorkout,
    totalSeconds,
    avgSeconds,
    weekProgressPct,
  };
}

/** Volumen (sets × reps × peso) de una lista de series. */
export function totalVolume(sets: WorkoutSetLog[]): number {
  return sets.reduce((acc, s) => acc + (s.completed ? s.reps * s.weight : 0), 0);
}

/** Ejercicios más realizados (por número de sesiones que los incluyen). */
export function topExercises(sets: WorkoutSetLog[], limit = 6): { name: string; count: number }[] {
  const bySessionExercise = new Map<string, Set<string>>();
  for (const s of sets) {
    const set = bySessionExercise.get(s.exercise_name) ?? new Set<string>();
    set.add(s.session_id);
    bySessionExercise.set(s.exercise_name, set);
  }
  return Array.from(bySessionExercise.entries())
    .map(([name, sessions]) => ({ name, count: sessions.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Evolución del peso máximo por sesión para un ejercicio dado (para la gráfica
 * temporal de progreso). Une set logs con la fecha de su sesión.
 */
export function exerciseProgress(
  sets: WorkoutSetLog[],
  sessions: WorkoutSession[],
  exerciseName: string
): { date: string; maxWeight: number; volume: number }[] {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.performed_date]));
  const byDate = new Map<string, { maxWeight: number; volume: number }>();
  for (const s of sets) {
    if (s.exercise_name !== exerciseName || !s.completed) continue;
    const date = dateBySession.get(s.session_id);
    if (!date) continue;
    const cur = byDate.get(date) ?? { maxWeight: 0, volume: 0 };
    cur.maxWeight = Math.max(cur.maxWeight, s.weight);
    cur.volume += s.reps * s.weight;
    byDate.set(date, cur);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }));
}
