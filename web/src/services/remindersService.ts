import { supabase } from '../lib/supabaseClient';
import type { Reminder, ReminderCompletion, ReminderPriority, ReminderRepeat } from '../types/domain';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export interface ReminderInput {
  title: string;
  description?: string | null;
  category?: string;
  priority?: ReminderPriority;
  remind_date: string;
  remind_time?: string | null;
  repeat?: ReminderRepeat;
  repeat_days?: number[];
  repeat_day_of_month?: number | null;
}

export const remindersService = {
  async list(): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('remind_date', { ascending: true });
    if (error) throw error;
    return data as Reminder[];
  },

  async listCompletions(startIso: string, endIso: string): Promise<ReminderCompletion[]> {
    const { data, error } = await supabase
      .from('reminder_completions')
      .select('*')
      .gte('completed_date', startIso)
      .lte('completed_date', endIso);
    if (error) throw error;
    return data as ReminderCompletion[];
  },

  async create(input: ReminderInput): Promise<Reminder> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id,
        title: input.title.trim().slice(0, 120),
        description: input.description?.slice(0, 500) ?? null,
        category: (input.category ?? 'personal').trim().slice(0, 40) || 'personal',
        priority: input.priority ?? 'media',
        remind_date: input.remind_date,
        remind_time: input.remind_time || null,
        repeat: input.repeat ?? 'none',
        repeat_days: input.repeat_days ?? [],
        repeat_day_of_month: input.repeat_day_of_month ?? null,
      })
      .select('*').single();
    if (error) throw error;
    return data as Reminder;
  },

  async update(id: string, patch: Partial<ReminderInput>): Promise<Reminder> {
    const clean: Record<string, unknown> = { ...patch };
    if (typeof patch.title === 'string') clean.title = patch.title.trim().slice(0, 120);
    if (typeof patch.remind_time !== 'undefined') clean.remind_time = patch.remind_time || null;
    const { data, error } = await supabase.from('reminders').update(clean).eq('id', id).select('*').single();
    if (error) throw error;
    return data as Reminder;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw error;
  },

  /** Marca un recordatorio NO recurrente como completado / pendiente. */
  async setStatus(id: string, status: 'pending' | 'completed'): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) throw error;
  },

  /** Marca una ocurrencia (fecha) de un recordatorio recurrente como hecha. */
  async completeOccurrence(reminderId: string, dateIso: string): Promise<void> {
    const user_id = await requireUserId();
    const { error } = await supabase
      .from('reminder_completions')
      .upsert({ reminder_id: reminderId, user_id, completed_date: dateIso }, { onConflict: 'reminder_id,completed_date' });
    if (error) throw error;
  },

  async uncompleteOccurrence(reminderId: string, dateIso: string): Promise<void> {
    const { error } = await supabase
      .from('reminder_completions')
      .delete()
      .eq('reminder_id', reminderId)
      .eq('completed_date', dateIso);
    if (error) throw error;
  },
};
