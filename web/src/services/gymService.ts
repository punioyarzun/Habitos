import { supabase } from '../lib/supabaseClient';
import type {
  WorkoutRoutine, RoutineDay, RoutineExercise, RoutineType,
  RoutineWithDays, RoutineDayWithExercises,
} from '../types/domain';
import type { RoutinePreset } from '../utils/routinePresets';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export interface ExerciseInput {
  name: string;
  muscle_group?: string | null;
  target_sets?: number;
  target_reps?: number;
  target_weight?: number | null;
  rest_seconds?: number;
  notes?: string | null;
}

export const gymService = {
  // ---- Rutinas ----
  async listRoutines(): Promise<WorkoutRoutine[]> {
    const { data, error } = await supabase
      .from('workout_routines')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as WorkoutRoutine[];
  },

  /** Trae una rutina con sus días y ejercicios anidados y ordenados. */
  async getRoutineWithDays(routineId: string): Promise<RoutineWithDays | null> {
    const { data: routine, error: rErr } = await supabase
      .from('workout_routines').select('*').eq('id', routineId).maybeSingle();
    if (rErr) throw rErr;
    if (!routine) return null;

    const [{ data: days, error: dErr }, { data: exs, error: eErr }] = await Promise.all([
      supabase.from('routine_days').select('*').eq('routine_id', routineId).order('sort_order', { ascending: true }),
      supabase.from('routine_exercises').select('*').eq('routine_id', routineId).order('sort_order', { ascending: true }),
    ]);
    if (dErr) throw dErr;
    if (eErr) throw eErr;

    const exByDay = new Map<string, RoutineExercise[]>();
    for (const e of (exs as RoutineExercise[])) {
      const arr = exByDay.get(e.day_id) ?? [];
      arr.push(e);
      exByDay.set(e.day_id, arr);
    }
    const daysWithEx: RoutineDayWithExercises[] = (days as RoutineDay[]).map((d) => ({
      ...d, exercises: exByDay.get(d.id) ?? [],
    }));
    return { ...(routine as WorkoutRoutine), days: daysWithEx };
  },

  /** Un día concreto con sus ejercicios y el nombre de su rutina (para el modo entrenamiento). */
  async getDayWithExercises(dayId: string): Promise<{ day: RoutineDay; routine: WorkoutRoutine | null; exercises: RoutineExercise[] } | null> {
    const { data: day, error: dErr } = await supabase.from('routine_days').select('*').eq('id', dayId).maybeSingle();
    if (dErr) throw dErr;
    if (!day) return null;
    const [{ data: routine }, { data: exs, error: eErr }] = await Promise.all([
      supabase.from('workout_routines').select('*').eq('id', (day as RoutineDay).routine_id).maybeSingle(),
      supabase.from('routine_exercises').select('*').eq('day_id', dayId).order('sort_order', { ascending: true }),
    ]);
    if (eErr) throw eErr;
    return { day: day as RoutineDay, routine: (routine as WorkoutRoutine) ?? null, exercises: exs as RoutineExercise[] };
  },

  async createRoutine(input: { name: string; description?: string; type?: RoutineType }): Promise<WorkoutRoutine> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('workout_routines')
      .insert({
        user_id,
        name: input.name.trim().slice(0, 80),
        description: input.description?.slice(0, 300) ?? null,
        type: input.type ?? 'custom',
      })
      .select('*').single();
    if (error) throw error;
    return data as WorkoutRoutine;
  },

  async updateRoutine(id: string, patch: Partial<Pick<WorkoutRoutine, 'name' | 'description' | 'type'>>): Promise<void> {
    const { error } = await supabase.from('workout_routines').update(patch).eq('id', id);
    if (error) throw error;
  },

  async removeRoutine(id: string): Promise<void> {
    const { error } = await supabase.from('workout_routines').delete().eq('id', id);
    if (error) throw error;
  },

  /** Marca una rutina como activa y desactiva el resto del usuario. */
  async setActive(id: string): Promise<void> {
    const user_id = await requireUserId();
    const { error: e1 } = await supabase.from('workout_routines').update({ is_active: false }).eq('user_id', user_id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('workout_routines').update({ is_active: true }).eq('id', id);
    if (e2) throw e2;
  },

  // ---- Días ----
  async addDay(routineId: string, input: { name: string; weekday?: number | null; is_rest?: boolean; sort_order: number }): Promise<RoutineDay> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('routine_days')
      .insert({
        routine_id: routineId, user_id,
        name: input.name.trim().slice(0, 60) || 'Día',
        weekday: input.weekday ?? null,
        is_rest: input.is_rest ?? false,
        sort_order: input.sort_order,
      })
      .select('*').single();
    if (error) throw error;
    return data as RoutineDay;
  },

  async updateDay(id: string, patch: Partial<Pick<RoutineDay, 'name' | 'weekday' | 'is_rest' | 'sort_order'>>): Promise<void> {
    const { error } = await supabase.from('routine_days').update(patch).eq('id', id);
    if (error) throw error;
  },

  async removeDay(id: string): Promise<void> {
    const { error } = await supabase.from('routine_days').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Ejercicios ----
  async addExercise(dayId: string, routineId: string, input: ExerciseInput, sortOrder: number): Promise<RoutineExercise> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('routine_exercises')
      .insert({
        day_id: dayId, routine_id: routineId, user_id,
        name: input.name.trim().slice(0, 80),
        muscle_group: input.muscle_group ?? null,
        target_sets: input.target_sets ?? 3,
        target_reps: input.target_reps ?? 10,
        target_weight: input.target_weight ?? null,
        rest_seconds: input.rest_seconds ?? 90,
        notes: input.notes ?? null,
        sort_order: sortOrder,
      })
      .select('*').single();
    if (error) throw error;
    return data as RoutineExercise;
  },

  async updateExercise(id: string, patch: Partial<ExerciseInput & { sort_order: number }>): Promise<void> {
    const { error } = await supabase.from('routine_exercises').update(patch).eq('id', id);
    if (error) throw error;
  },

  async removeExercise(id: string): Promise<void> {
    const { error } = await supabase.from('routine_exercises').delete().eq('id', id);
    if (error) throw error;
  },

  async reorderExercises(idsInOrder: string[]): Promise<void> {
    await Promise.all(idsInOrder.map((id, i) => supabase.from('routine_exercises').update({ sort_order: i }).eq('id', id)));
  },

  /** Crea una rutina completa (días + ejercicios) a partir de un preset. */
  async createFromPreset(preset: RoutinePreset): Promise<WorkoutRoutine> {
    const user_id = await requireUserId();
    const { data: routine, error: rErr } = await supabase
      .from('workout_routines')
      .insert({ user_id, name: preset.name, description: preset.description, type: preset.type })
      .select('*').single();
    if (rErr) throw rErr;
    const routineId = (routine as WorkoutRoutine).id;

    const dayRows = preset.days.map((d, i) => ({
      routine_id: routineId, user_id, name: d.name,
      weekday: d.weekday ?? null, is_rest: d.is_rest ?? false, sort_order: i,
    }));
    const { data: days, error: dErr } = await supabase.from('routine_days').insert(dayRows).select('*');
    if (dErr) throw dErr;

    // Mapea preset.day → id insertado por sort_order (único y controlado por nosotros).
    const dayIdByOrder = new Map<number, string>();
    for (const d of (days as RoutineDay[])) dayIdByOrder.set(d.sort_order, d.id);

    const exerciseRows: Record<string, unknown>[] = [];
    preset.days.forEach((d, i) => {
      const dayId = dayIdByOrder.get(i);
      if (!dayId) return;
      d.exercises.forEach((ex, j) => {
        exerciseRows.push({
          day_id: dayId, routine_id: routineId, user_id,
          name: ex.name, muscle_group: ex.muscle_group,
          target_sets: ex.target_sets, target_reps: ex.target_reps,
          rest_seconds: ex.rest_seconds, sort_order: j,
        });
      });
    });
    if (exerciseRows.length) {
      const { error: eErr } = await supabase.from('routine_exercises').insert(exerciseRows);
      if (eErr) throw eErr;
    }
    return routine as WorkoutRoutine;
  },

  /** Duplica una rutina existente (con todos sus días y ejercicios). */
  async duplicateRoutine(routineId: string): Promise<WorkoutRoutine> {
    const source = await this.getRoutineWithDays(routineId);
    if (!source) throw new Error('Rutina no encontrada.');
    const user_id = await requireUserId();

    const { data: routine, error: rErr } = await supabase
      .from('workout_routines')
      .insert({ user_id, name: `${source.name} (copia)`.slice(0, 80), description: source.description, type: source.type })
      .select('*').single();
    if (rErr) throw rErr;
    const newRoutineId = (routine as WorkoutRoutine).id;

    const dayRows = source.days.map((d, i) => ({
      routine_id: newRoutineId, user_id, name: d.name,
      weekday: d.weekday, is_rest: d.is_rest, sort_order: i,
    }));
    if (dayRows.length) {
      const { data: days, error: dErr } = await supabase.from('routine_days').insert(dayRows).select('*');
      if (dErr) throw dErr;
      const dayIdByOrder = new Map<number, string>();
      for (const d of (days as RoutineDay[])) dayIdByOrder.set(d.sort_order, d.id);

      const exerciseRows: Record<string, unknown>[] = [];
      source.days.forEach((d, i) => {
        const dayId = dayIdByOrder.get(i);
        if (!dayId) return;
        d.exercises.forEach((ex, j) => {
          exerciseRows.push({
            day_id: dayId, routine_id: newRoutineId, user_id,
            name: ex.name, muscle_group: ex.muscle_group,
            target_sets: ex.target_sets, target_reps: ex.target_reps,
            target_weight: ex.target_weight, rest_seconds: ex.rest_seconds,
            notes: ex.notes, sort_order: j,
          });
        });
      });
      if (exerciseRows.length) {
        const { error: eErr } = await supabase.from('routine_exercises').insert(exerciseRows);
        if (eErr) throw eErr;
      }
    }
    return routine as WorkoutRoutine;
  },
};
