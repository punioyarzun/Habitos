import { useCallback, useEffect, useMemo, useState } from 'react';
import { remindersService, type ReminderInput } from '../services/remindersService';
import type { Reminder, ReminderCompletion } from '../types/domain';
import { addDays } from '../utils/dates';
import { isoNow } from '../utils/streaks';
import { isRecurring } from '../utils/reminders';
import { useToast } from './useToast';

const HISTORY_DAYS = 400;

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [completions, setCompletions] = useState<ReminderCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = isoNow();
      const start = addDays(today, -HISTORY_DAYS);
      const [rs, cs] = await Promise.all([
        remindersService.list(),
        remindersService.listCompletions(start, today),
      ]);
      setReminders(rs);
      setCompletions(cs);
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudieron cargar los recordatorios.', 'err');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  /** reminder_id → set de fechas ISO completadas (para recurrentes). */
  const completedDatesByReminder = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of completions) {
      const set = map.get(c.reminder_id) ?? new Set<string>();
      set.add(c.completed_date);
      map.set(c.reminder_id, set);
    }
    return map;
  }, [completions]);

  async function create(input: ReminderInput): Promise<Reminder> {
    try {
      const r = await remindersService.create(input);
      setReminders((prev) => [...prev, r]);
      push('Recordatorio creado.', 'ok');
      return r;
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo crear.', 'err');
      throw e;
    }
  }

  async function update(id: string, patch: Partial<ReminderInput>) {
    try {
      const r = await remindersService.update(id, patch);
      setReminders((prev) => prev.map((x) => (x.id === id ? r : x)));
      push('Recordatorio actualizado.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo actualizar.', 'err');
      throw e;
    }
  }

  async function remove(id: string) {
    const prev = reminders;
    setReminders((r) => r.filter((x) => x.id !== id));
    try {
      await remindersService.remove(id);
      push('Recordatorio eliminado.', 'ok');
    } catch (e) {
      setReminders(prev);
      push(e instanceof Error ? e.message : 'No se pudo eliminar.', 'err');
    }
  }

  /** Marca hecho/no-hecho para una fecha. Recurrente → completions; único → status. */
  async function toggleComplete(reminder: Reminder, dateIso: string) {
    if (isRecurring(reminder)) {
      const done = completedDatesByReminder.get(reminder.id)?.has(dateIso) ?? false;
      // optimista
      setCompletions((prev) =>
        done
          ? prev.filter((c) => !(c.reminder_id === reminder.id && c.completed_date === dateIso))
          : [...prev, { id: `optimistic-${reminder.id}-${dateIso}`, reminder_id: reminder.id, user_id: '', completed_date: dateIso, created_at: '' }]
      );
      try {
        if (done) await remindersService.uncompleteOccurrence(reminder.id, dateIso);
        else await remindersService.completeOccurrence(reminder.id, dateIso);
      } catch (e) {
        push(e instanceof Error ? e.message : 'No se pudo guardar.', 'err');
        load();
      }
    } else {
      const next = reminder.status === 'completed' ? 'pending' : 'completed';
      setReminders((prev) => prev.map((r) => (r.id === reminder.id ? { ...r, status: next, completed_at: next === 'completed' ? new Date().toISOString() : null } : r)));
      try {
        await remindersService.setStatus(reminder.id, next);
      } catch (e) {
        push(e instanceof Error ? e.message : 'No se pudo guardar.', 'err');
        load();
      }
    }
  }

  /** Posponer/reprogramar: cambia fecha (y opcionalmente hora). */
  async function reschedule(id: string, newDate: string, newTime?: string | null) {
    try {
      const patch: Partial<ReminderInput> = { remind_date: newDate };
      if (typeof newTime !== 'undefined') patch.remind_time = newTime;
      const r = await remindersService.update(id, patch);
      setReminders((prev) => prev.map((x) => (x.id === id ? r : x)));
      push('Recordatorio reprogramado.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo reprogramar.', 'err');
    }
  }

  return {
    reminders, completions, completedDatesByReminder, loading,
    reload: load, create, update, remove, toggleComplete, reschedule,
  };
}
