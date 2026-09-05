import { Check, Flame } from 'lucide-react';
import type { HabitWithStats } from '../../types/domain';
import { ProgressRing } from '../../components/ui/primitives';
import { HabitIcon } from './habitIcons';

/** Tile estilo Streaks: un aro grande que es el botón. El aro muestra la
 *  constancia de 30 días y se llena al color del hábito cuando está hecho hoy. */
export function HabitTile({ habit, onToggle, size = 88 }: { habit: HabitWithStats; onToggle: (id: string) => void; size?: number }) {
  const done = habit.doneToday;
  const ringPct = done ? 1 : habit.completionRate30d;

  return (
    <button
      onClick={() => onToggle(habit.id)}
      aria-pressed={done}
      className="group flex flex-col items-center gap-2 rounded-xl p-1.5 transition-transform active:scale-95"
      title={done ? 'Hecho hoy — toca para desmarcar' : 'Marcar como hecho hoy'}
    >
      <ProgressRing pct={ringPct} size={size} stroke={6} color={habit.color}>
        <span
          className={`grid place-items-center rounded-full transition-colors ${done ? 'animate-pop' : ''}`}
          style={{
            width: size - 26,
            height: size - 26,
            background: done ? habit.color : `color-mix(in srgb, ${habit.color} 14%, transparent)`,
            color: done ? '#fff' : habit.color,
          }}
        >
          {done ? <Check size={Math.round(size / 3)} strokeWidth={2.75} /> : <HabitIcon name={habit.icon} size={Math.round(size / 3.2)} strokeWidth={2} />}
        </span>
      </ProgressRing>

      <div className="w-full text-center">
        <p className="truncate text-xs font-medium text-[var(--text)]">{habit.name}</p>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)]">
          <Flame size={11} strokeWidth={2} className={habit.currentStreak > 0 ? 'text-[var(--color-brand-text)]' : ''} />
          {habit.currentStreak}
        </p>
      </div>
    </button>
  );
}
