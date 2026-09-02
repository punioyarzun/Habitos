import { useCallback, useEffect, useState } from 'react';
import { workoutService, type FinishWorkoutInput } from '../services/workoutService';
import type { WorkoutSession, WorkoutSetLog } from '../types/domain';
import { addDays } from '../utils/dates';
import { isoNow } from '../utils/streaks';
import { useToast } from './useToast';

const HISTORY_DAYS = 400;

/**
 * Carga las sesiones de entrenamiento (y sus series) de la última ventana de
 * ~13 meses. Suficiente para dashboard, historial, calendario y progreso sin
 * traer todo el historial completo.
 */
export function useWorkouts() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [setLogs, setSetLogs] = useState<WorkoutSetLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = isoNow();
      const start = addDays(today, -HISTORY_DAYS);
      const s = await workoutService.listSessions(start, today);
      setSessions(s);
      const logs = await workoutService.listSetLogsForSessions(s.map((x) => x.id));
      setSetLogs(logs);
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo cargar el historial.', 'err');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  async function finish(input: FinishWorkoutInput): Promise<WorkoutSession | null> {
    try {
      const session = await workoutService.finishWorkout(input);
      await load();
      push('Entrenamiento guardado.', 'ok');
      return session;
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo guardar el entrenamiento.', 'err');
      return null;
    }
  }

  async function removeSession(id: string) {
    const prevS = sessions;
    const prevL = setLogs;
    setSessions((s) => s.filter((x) => x.id !== id));
    setSetLogs((l) => l.filter((x) => x.session_id !== id));
    try {
      await workoutService.removeSession(id);
      push('Entrenamiento eliminado.', 'ok');
    } catch (e) {
      setSessions(prevS); setSetLogs(prevL);
      push(e instanceof Error ? e.message : 'No se pudo eliminar.', 'err');
    }
  }

  return { sessions, setLogs, loading, reload: load, finish, removeSession };
}
