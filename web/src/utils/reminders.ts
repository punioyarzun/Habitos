import type { Reminder, ReminderPriority } from '../types/domain';
import { addDays } from './dates';

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=domingo … 6=sábado
}
function dayOfMonthOf(iso: string): number {
  return Number(iso.slice(8, 10));
}
function daysInMonthOf(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** ¿El recordatorio ocurre en la fecha `iso`? (respeta fecha de inicio y recurrencia) */
export function occursOn(reminder: Reminder, iso: string): boolean {
  if (iso < reminder.remind_date) return false;
  switch (reminder.repeat) {
    case 'none':
      return iso === reminder.remind_date;
    case 'daily':
      return true;
    case 'weekdays': {
      const wd = weekdayOf(iso);
      return wd >= 1 && wd <= 5;
    }
    case 'weekly': {
      const days = reminder.repeat_days.length ? reminder.repeat_days : [weekdayOf(reminder.remind_date)];
      return days.includes(weekdayOf(iso));
    }
    case 'monthly': {
      const target = reminder.repeat_day_of_month ?? dayOfMonthOf(reminder.remind_date);
      const dim = daysInMonthOf(iso);
      const effective = Math.min(target, dim); // si el mes es más corto, cae el último día
      return dayOfMonthOf(iso) === effective;
    }
    default:
      return false;
  }
}

/** Próxima fecha (>= fromIso) en que ocurre el recordatorio, o null si no hay. */
export function nextOccurrence(reminder: Reminder, fromIso: string): string | null {
  if (reminder.repeat === 'none') {
    return reminder.remind_date >= fromIso ? reminder.remind_date : null;
  }
  let cursor = fromIso < reminder.remind_date ? reminder.remind_date : fromIso;
  for (let i = 0; i < 400; i++) {
    if (occursOn(reminder, cursor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return null;
}

export function isRecurring(reminder: Reminder): boolean {
  return reminder.repeat !== 'none';
}

/** ¿Está completado para la fecha dada? (no-recurrente usa status; recurrente usa el set de completions). */
export function isCompletedOn(reminder: Reminder, completedDates: Set<string>, iso: string): boolean {
  if (isRecurring(reminder)) return completedDates.has(iso);
  return reminder.status === 'completed';
}

export const PRIORITY_ORDER: Record<ReminderPriority, number> = { alta: 0, media: 1, baja: 2 };

export const REMINDER_CATEGORIES = ['personal', 'trabajo', 'gimnasio', 'finanzas', 'salud', 'otro'] as const;

export const REPEAT_LABELS: Record<Reminder['repeat'], string> = {
  none: 'Una vez',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  weekdays: 'Días de semana',
};

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const WEEKDAY_LABELS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Resumen legible de la recurrencia para mostrar en las tarjetas. */
export function repeatSummary(reminder: Reminder): string {
  switch (reminder.repeat) {
    case 'none':
      return 'Una vez';
    case 'daily':
      return 'Todos los días';
    case 'weekdays':
      return 'Lun a Vie';
    case 'weekly': {
      const days = reminder.repeat_days.length ? reminder.repeat_days : [weekdayOf(reminder.remind_date)];
      return days.slice().sort((a, b) => a - b).map((d) => WEEKDAY_LABELS_LONG[d].slice(0, 3)).join(', ');
    }
    case 'monthly': {
      const target = reminder.repeat_day_of_month ?? dayOfMonthOf(reminder.remind_date);
      return `Día ${target} de cada mes`;
    }
    default:
      return '';
  }
}
