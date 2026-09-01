import { Flame, Trophy, MoreVertical } from 'lucide-react';
import type { HabitWithStats } from '../../types/domain';

interface Props {
  habit: HabitWithStats;
  onToggleToday: (id: string) => void;
  onOpenMenu?: (id: string) => void;
  categoryName?: string;
}

export function HabitCard({ habit, onToggleToday, onOpenMenu, categoryName }: Props) {
  const pct = Math.round(habit.completionRate30d * 100);

  return (
    <div className="card flex items-center gap-4 p-4">
      <button
        onClick={() => onToggleToday(habit.id)}
        aria-pressed={habit.doneToday}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 text-xl transition-transform active:scale-95"
        style={{
          borderColor: habit.color,
          background: habit.doneToday ? habit.color : 'transparent',
          color: habit.doneToday ? '#fff' : habit.color,
        }}
        title={habit.doneToday ? 'Marcado hoy — click para desmarcar' : 'Marcar como hecho hoy'}
      >
        {habit.icon}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-[var(--text)]">{habit.name}</p>
          {categoryName && (
            <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {categoryName}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1"><Flame size={13} strokeWidth={2} /> {habit.currentStreak} {habit.currentStreak === 1 ? 'día' : 'días'}</span>
          <span className="inline-flex items-center gap-1"><Trophy size={13} strokeWidth={2} /> mejor: {habit.bestStreak}</span>
          <span>{pct}% últ. 30 días</span>
        </div>
      </div>

      {onOpenMenu && (
        <button onClick={() => onOpenMenu(habit.id)} className="shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label={`Opciones de ${habit.name}`}>
          <MoreVertical size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
