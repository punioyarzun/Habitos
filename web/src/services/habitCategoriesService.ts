import { supabase } from '../lib/supabaseClient';

export interface HabitCategory {
  id: string;
  user_id: string;
  name: string;
  kind: 'vicio' | 'habito';
  created_at: string;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export const habitCategoriesService = {
  async list(): Promise<HabitCategory[]> {
    const { data, error } = await supabase.from('habit_categories').select('*').order('name');
    if (error) throw error;
    return data as HabitCategory[];
  },

  async create(name: string, kind: 'vicio' | 'habito'): Promise<HabitCategory> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('habit_categories')
      .insert({ user_id, name: name.trim().slice(0, 40), kind })
      .select('*')
      .single();
    if (error) throw error;
    return data as HabitCategory;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('habit_categories').delete().eq('id', id);
    if (error) throw error;
  },
};
