import { supabase } from '../lib/supabaseClient';
import type { HabitCompletion } from '../types/domain';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export const completionsService = {
  /** Trae todos los cumplimientos entre dos fechas ISO (inclusive), para el calendario/estadísticas. */
  async listInRange(startIso: string, endIso: string): Promise<HabitCompletion[]> {
    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .gte('completed_date', startIso)
      .lte('completed_date', endIso)
      .order('completed_date', { ascending: true });
    if (error) throw error;
    return data as HabitCompletion[];
  },

  /** Todos los cumplimientos de un hábito (para calcular racha completa). */
  async listForHabit(habitId: string): Promise<HabitCompletion[]> {
    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('habit_id', habitId)
      .order('completed_date', { ascending: true });
    if (error) throw error;
    return data as HabitCompletion[];
  },

  async markDone(habitId: string, dateIso: string, note?: string): Promise<void> {
    const user_id = await requireUserId();
    const { error } = await supabase
      .from('habit_completions')
      .upsert(
        { habit_id: habitId, user_id, completed_date: dateIso, note: note ?? null },
        { onConflict: 'habit_id,completed_date' }
      );
    if (error) throw error;
  },

  async markUndone(habitId: string, dateIso: string): Promise<void> {
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_date', dateIso);
    if (error) throw error;
  },

  async setNote(habitId: string, dateIso: string, note: string): Promise<void> {
    const user_id = await requireUserId();
    const { error } = await supabase
      .from('habit_completions')
      .upsert(
        { habit_id: habitId, user_id, completed_date: dateIso, note },
        { onConflict: 'habit_id,completed_date' }
      );
    if (error) throw error;
  },
};
