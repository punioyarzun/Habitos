import { supabase } from '../lib/supabaseClient';

export interface ReminderEmailInput {
  title: string;
  description?: string | null;
  when?: string | null;
}

/**
 * Llama a la Edge Function `send-reminder-email`. Best-effort: si la función no
 * está desplegada o falta la API key, se resuelve en `false` sin romper el flujo
 * (la app igual muestra la notificación del navegador).
 */
export const emailService = {
  async sendReminderEmail(input: ReminderEmailInput): Promise<boolean> {
    try {
      // El cliente "mock" (sin credenciales) no expone `functions`.
      const fns = (supabase as { functions?: { invoke: (name: string, opts: { body: unknown }) => Promise<{ error: unknown }> } }).functions;
      if (!fns?.invoke) return false;
      const { error } = await fns.invoke('send-reminder-email', { body: input });
      return !error;
    } catch {
      return false;
    }
  },
};
