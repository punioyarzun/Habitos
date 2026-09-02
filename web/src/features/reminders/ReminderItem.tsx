import { Check, MoreVertical, Clock, Repeat } from 'lucide-react';
import clsx from 'clsx';
import type { Reminder, ReminderPriority } from '../../types/domain';
import { formatTimeShort } from '../../utils/time';
import { repeatSummary, isRecurring } from '../../utils/reminders';
import { formatDateShort } from '../../utils/dates';

const PRIORITY_COLOR: Record<ReminderPriority, string> = {
  alta: 'var(--color-danger-text)',
  media: 'var(--color-brand-text)',
  baja: 'var(--color-money-in-text)',
};

interface Props {
  reminder: Reminder;
  done: boolean;
  onToggle: () => void;
  onOpenMenu: () => void;
  showDate?: boolean;
}

export function ReminderItem({ reminder, done, onToggle, onOpenMenu, showDate }: Props) {
  const color = PRIORITY_COLOR[reminder.priority];
  const meta: string[] = [];
  if (reminder.remind_time) meta.push(formatTimeShort(reminder.remind_time));
  if (showDate) meta.push(formatDateShort(reminder.remind_date));
  meta.push(reminder.category[0].toUpperCase() + reminder.category.slice(1));

  return (
    <div className="card flex items-center gap-3 p-3">
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      <button
        onClick={onToggle}
        aria-pressed={done}
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 transition-colors',
          done ? 'border-brand-500 bg-brand-500 text-[var(--color-brand-ink)]' : 'border-[var(--border)] text-transparent hover:border-[var(--color-brand-text)]/60'
        )}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como completado'}
      >
        <Check size={16} strokeWidth={2.5} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={clsx('truncate text-sm font-medium', done && 'text-[var(--text-muted)] line-through')}>{reminder.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
          {reminder.remind_time && <span className="inline-flex items-center gap-1"><Clock size={11} strokeWidth={2} />{formatTimeShort(reminder.remind_time)}</span>}
          {showDate && <span>{formatDateShort(reminder.remind_date)}</span>}
          <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px]">{reminder.category[0].toUpperCase() + reminder.category.slice(1)}</span>
          {isRecurring(reminder) && <span className="inline-flex items-center gap-1"><Repeat size={10} strokeWidth={2} />{repeatSummary(reminder)}</span>}
        </div>
      </div>

      <button onClick={onOpenMenu} className="shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label={`Opciones de ${reminder.title}`}>
        <MoreVertical size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
