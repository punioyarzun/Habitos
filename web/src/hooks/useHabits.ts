import { useCallback, useEffect, useMemo, useState } from 'react';
import { habitsService, type CreateHabitInput } from '../services/habitsService';
import { completionsService } from '../services/completionsService';
import { habitCategoriesService, type HabitCategory } from '../services/habitCategoriesService';
import type { Habit, HabitCompletion, HabitWithStats } from '../types/domain';
import { computeHabitStats, isoNow } from '../utils/streaks';
import { addDays } from '../utils/dates';
import { haptic } from '../utils/celebrate';
import { useToast } from './useToast';

const HISTORY_DAYS = 400; // suficiente para racha/mejor racha sin traer todo el historial

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = isoNow();
      const start = addDays(today, -HISTORY_DAYS);
      const [h, c, cats] = await Promise.all([
        habitsService.list(),
        completionsService.listInRange(start, today),
        habitCategoriesService.list(),
      ]);
      setHabits(h);
      setCompletions(c);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los hábitos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const habitsWithStats: HabitWithStats[] = useMemo(() => {
    const today = isoNow();
    const byHabit = new Map<string, string[]>();
    for (const c of completions) {
      const arr = byHabit.get(c.habit_id) ?? [];
      arr.push(c.completed_date);
      byHabit.set(c.habit_id, arr);
    }
    return habits.map((h) => {
      const dates = byHabit.get(h.id) ?? [];
      const stats = computeHabitStats(dates, h.active_days, h.start_date, today);
      return { ...h, ...stats };
    });
  }, [habits, completions]);

  const activeHabits = useMemo(() => habitsWithStats.filter((h) => h.status === 'active'), [habitsWithStats]);

  async function createHabit(input: CreateHabitInput) {
    try {
      const h = await habitsService.create(input);
      setHabits((prev) => [...prev, h]);
      push('Hábito creado.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo crear el hábito.', 'err');
      throw e;
    }
  }

  async function toggleToday(habitId: string) {
    const today = isoNow();
    const already = completions.some((c) => c.habit_id === habitId && c.completed_date === today);
    if (!already) haptic(25); // feedback háptico al marcar como hecho
    // Optimista: actualiza UI antes de esperar la red.
    setCompletions((prev) =>
      already
        ? prev.filter((c) => !(c.habit_id === habitId && c.completed_date === today))
        : [...prev, { id: `optimistic-${habitId}`, habit_id: habitId, user_id: '', completed_date: today, note: null, created_at: '' }]
    );
    try {
      if (already) await completionsService.markUndone(habitId, today);
      else await completionsService.markDone(habitId, today);
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo guardar el cambio.', 'err');
      load(); // revertir a estado real del servidor
    }
  }

  async function setStatus(habitId: string, status: Habit['status']) {
    try {
      await habitsService.setStatus(habitId, status);
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, status } : h)));
      push(status === 'archived' ? 'Hábito archivado.' : status === 'paused' ? 'Hábito pausado.' : 'Hábito reactivado.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo actualizar el hábito.', 'err');
    }
  }

  async function removeHabit(habitId: string) {
    try {
      await habitsService.remove(habitId);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      push('Hábito eliminado.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo eliminar el hábito.', 'err');
    }
  }

  return {
    loading,
    error,
    habits: habitsWithStats,
    activeHabits,
    completions,
    categoryNameById,
    reload: load,
    createHabit,
    toggleToday,
    setStatus,
    removeHabit,
  };
}
