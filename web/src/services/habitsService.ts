import { supabase } from '../lib/supabaseClient';
import type { Habit, HabitFrequency } from '../types/domain';

export interface CreateHabitInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency?: HabitFrequency;
  active_days?: number[];
  category_id?: string | null;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export const habitsService = {
  async list(status?: Habit['status']): Promise<Habit[]> {
    let query = supabase.from('habits').select('*').order('sort_order', { ascending: true });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data as Habit[];
  },

  async create(input: CreateHabitInput): Promise<Habit> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id,
        name: input.name.trim().slice(0, 60),
        description: input.description?.slice(0, 300) ?? null,
        icon: input.icon,
        color: input.color,
        frequency: input.frequency ?? 'daily',
        active_days: input.active_days ?? [0, 1, 2, 3, 4, 5, 6],
        category_id: input.category_id ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Habit;
  },

  async update(id: string, patch: Partial<CreateHabitInput>): Promise<Habit> {
    const { data, error } = await supabase.from('habits').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return data as Habit;
  },

  async setStatus(id: string, status: Habit['status']): Promise<void> {
    const { error } = await supabase.from('habits').update({ status }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) throw error;
  },

  async reorder(idsInOrder: string[]): Promise<void> {
    // Actualiza sort_order en lote. No es transaccional (PostgREST no expone
    // transacciones multi-fila desde el cliente), pero un reorder parcial
    // fallido es de bajo impacto: en el peor caso el orden queda inconsistente
    // y el usuario puede volver a arrastrar.
    await Promise.all(
      idsInOrder.map((id, i) => supabase.from('habits').update({ sort_order: i }).eq('id', id))
    );
  },
};
