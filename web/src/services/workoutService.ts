import { supabase } from '../lib/supabaseClient';
import type { WorkoutSession, WorkoutSetLog, WorkoutSessionWithSets } from '../types/domain';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export interface FinishSetInput {
  exercise_name: string;
  muscle_group?: string | null;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface FinishWorkoutInput {
  routine_id?: string | null;
  day_id?: string | null;
  name: string;
  performed_date: string; // ISO
  duration_seconds: number;
  notes?: string | null;
  sets: FinishSetInput[];
}

export const workoutService = {
  async listSessions(startIso?: string, endIso?: string): Promise<WorkoutSession[]> {
    let query = supabase.from('workout_sessions').select('*').order('performed_date', { ascending: false });
    if (startIso) query = query.gte('performed_date', startIso);
    if (endIso) query = query.lte('performed_date', endIso);
    const { data, error } = await query;
    if (error) throw error;
    return data as WorkoutSession[];
  },

  async getSessionWithSets(sessionId: string): Promise<WorkoutSessionWithSets | null> {
    const { data: session, error: sErr } = await supabase
      .from('workout_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (sErr) throw sErr;
    if (!session) return null;
    const { data: sets, error: lErr } = await supabase
      .from('workout_set_logs').select('*').eq('session_id', sessionId).order('set_number', { ascending: true });
    if (lErr) throw lErr;
    return { ...(session as WorkoutSession), sets: sets as WorkoutSetLog[] };
  },

  /** Series de un conjunto de sesiones (para las gráficas de progreso). */
  async listSetLogsForSessions(sessionIds: string[]): Promise<WorkoutSetLog[]> {
    if (sessionIds.length === 0) return [];
    const { data, error } = await supabase
      .from('workout_set_logs').select('*').in('session_id', sessionIds);
    if (error) throw error;
    return data as WorkoutSetLog[];
  },

  /** Guarda un entrenamiento completo: crea la sesión y todas sus series. */
  async finishWorkout(input: FinishWorkoutInput): Promise<WorkoutSession> {
    const user_id = await requireUserId();
    const { data: session, error: sErr } = await supabase
      .from('workout_sessions')
      .insert({
        user_id,
        routine_id: input.routine_id ?? null,
        day_id: input.day_id ?? null,
        name: input.name.trim().slice(0, 80) || 'Entrenamiento',
        performed_date: input.performed_date,
        duration_seconds: Math.max(0, Math.round(input.duration_seconds)),
        notes: input.notes?.slice(0, 500) ?? null,
      })
      .select('*').single();
    if (sErr) throw sErr;
    const sessionId = (session as WorkoutSession).id;

    if (input.sets.length) {
      const rows = input.sets.map((s) => ({
        session_id: sessionId, user_id,
        exercise_name: s.exercise_name.slice(0, 80),
        muscle_group: s.muscle_group ?? null,
        set_number: s.set_number,
        reps: Math.max(0, Math.round(s.reps)),
        weight: Math.max(0, s.weight),
        completed: s.completed,
      }));
      const { error: lErr } = await supabase.from('workout_set_logs').insert(rows);
      if (lErr) throw lErr;
    }
    return session as WorkoutSession;
  },

  async updateSessionNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase.from('workout_sessions').update({ notes: notes.slice(0, 500) }).eq('id', id);
    if (error) throw error;
  },

  async removeSession(id: string): Promise<void> {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
    if (error) throw error;
  },
};
