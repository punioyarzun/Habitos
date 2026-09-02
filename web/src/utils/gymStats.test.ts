import { describe, it, expect } from 'vitest';
import { computeGymStats, weekStartIso, topExercises, exerciseProgress, totalVolume } from './gymStats';
import type { WorkoutSession, WorkoutSetLog } from '../types/domain';

function session(id: string, date: string, duration = 3600): WorkoutSession {
  return { id, user_id: 'u', routine_id: null, day_id: null, name: 'W', performed_date: date, duration_seconds: duration, notes: null, created_at: '' };
}
function setLog(sessionId: string, name: string, weight: number, reps: number, completed = true): WorkoutSetLog {
  return { id: `${sessionId}-${name}-${weight}`, session_id: sessionId, user_id: 'u', exercise_name: name, muscle_group: null, set_number: 1, reps, weight, completed, created_at: '' };
}

describe('weekStartIso', () => {
  it('devuelve el lunes de la semana', () => {
    expect(weekStartIso('2026-01-07')).toBe('2026-01-05'); // miércoles → lunes 5
    expect(weekStartIso('2026-01-05')).toBe('2026-01-05'); // lunes → mismo
    expect(weekStartIso('2026-01-11')).toBe('2026-01-05'); // domingo → lunes previo
  });
});

describe('computeGymStats', () => {
  it('cuenta entrenamientos de la semana y racha de días', () => {
    const today = '2026-01-07'; // miércoles
    const sessions = [
      session('a', '2026-01-05'), // lunes
      session('b', '2026-01-06'), // martes
      session('c', '2026-01-07'), // hoy
      session('d', '2025-12-20'), // vieja
    ];
    const stats = computeGymStats(sessions, today, 4);
    expect(stats.workoutsThisWeek).toBe(3);
    expect(stats.currentStreakDays).toBe(3); // lun, mar, mié consecutivos
    expect(stats.totalWorkouts).toBe(4);
    expect(stats.lastWorkout?.performed_date).toBe('2026-01-07');
    expect(stats.weekProgressPct).toBe(75); // 3/4
  });

  it('la racha no se rompe si hoy aún no entrenas', () => {
    const today = '2026-01-07';
    const sessions = [session('a', '2026-01-05'), session('b', '2026-01-06')];
    const stats = computeGymStats(sessions, today, 3);
    expect(stats.currentStreakDays).toBe(2); // cuenta desde ayer
  });

  it('sin sesiones devuelve ceros', () => {
    const stats = computeGymStats([], '2026-01-07');
    expect(stats.totalWorkouts).toBe(0);
    expect(stats.currentStreakDays).toBe(0);
    expect(stats.lastWorkout).toBe(null);
  });
});

describe('volumen y progreso', () => {
  it('totalVolume solo cuenta series completadas', () => {
    const logs = [setLog('a', 'Press', 50, 10), setLog('a', 'Press', 60, 8, false)];
    expect(totalVolume(logs)).toBe(500); // 50*10, la de 60 no cuenta
  });

  it('topExercises rankea por nº de sesiones', () => {
    const logs = [
      setLog('a', 'Press', 50, 10), setLog('b', 'Press', 55, 10),
      setLog('a', 'Remo', 40, 10),
    ];
    const top = topExercises(logs);
    expect(top[0].name).toBe('Press');
    expect(top[0].count).toBe(2);
  });

  it('exerciseProgress da el peso máximo por fecha (solo completadas)', () => {
    const sessions = [session('a', '2026-01-05'), session('b', '2026-01-12')];
    const logs = [
      setLog('a', 'Press', 50, 10), setLog('a', 'Press', 55, 8),
      setLog('b', 'Press', 60, 8), setLog('b', 'Press', 70, 1, false),
    ];
    const prog = exerciseProgress(logs, sessions, 'Press');
    expect(prog).toHaveLength(2);
    expect(prog[0]).toMatchObject({ date: '2026-01-05', maxWeight: 55 });
    expect(prog[1]).toMatchObject({ date: '2026-01-12', maxWeight: 60 }); // la de 70 no completada se ignora
  });
});
