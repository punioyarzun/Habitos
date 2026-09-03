import { Flame, Trophy, MoreVertical, Check } from 'lucide-react';
import type { HabitWithStats } from '../../types/domain';
import { ProgressRing } from '../../components/ui/primitives';
import { HabitIcon } from './habitIcons';

interface Props {
  habit: HabitWithStats;
  onToggleToday: (id: string) => void;
  onOpenMenu?: (id: string) => void;
  categoryName?: string;
}

export function HabitCard({ habit, onToggleToday, onOpenMenu, categoryName }: Props) {
  const pct = Math.round(habit.completionRate30d * 100);

  return (
    <div
      className="card group relative flex flex-col p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderColor: habit.doneToday ? `color-mix(in srgb, ${habit.color} 45%, var(--border))` : undefined }}
    >
      {/* Acento superior sutil en el color del hábito */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-[var(--radius-card)] opacity-70"
        style={{ background: `linear-gradient(90deg, ${habit.color}, transparent)` }}
        aria-hidden="true"
      />

      <div className="flex items-start gap-3.5">
        {/* Anillo de constancia (30 días) + toggle de "hecho hoy" */}
        <button
          onClick={() => onToggleToday(habit.id)}
          aria-pressed={habit.doneToday}
          className="shrink-0 rounded-full transition-transform active:scale-95"
          title={habit.doneToday ? 'Hecho hoy — toca para desmarcar' : 'Marcar como hecho hoy'}
        >
          <ProgressRing pct={habit.completionRate30d} color={habit.color} size={52} stroke={3}>
            <span
              className="grid h-10 w-10 place-items-center rounded-full transition-colors"
              style={{
                background: habit.doneToday ? habit.color : `color-mix(in srgb, ${habit.color} 14%, transparent)`,
                color: habit.doneToday ? '#fff' : habit.color,
              }}
            >
              {habit.doneToday ? <Check size={20} strokeWidth={2.75} /> : <HabitIcon name={habit.icon} size={19} strokeWidth={2} />}
            </span>
          </ProgressRing>
        </button>

        <div className="min-w-0 flex-1 pt-1">
          <p className="truncate font-display font-semibold leading-snug text-[var(--text)]" title={habit.name}>
            {habit.name}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {categoryName && (
              <span className="truncate rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                {categoryName}
              </span>
            )}
            {habit.doneToday && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-brand-text)]">
                <Check size={11} strokeWidth={2.5} /> Hoy
              </span>
            )}
          </div>
        </div>

        {onOpenMenu && (
          <button
            onClick={() => onOpenMenu(habit.id)}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label={`Opciones de ${habit.name}`}
          >
            <MoreVertical size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* KPIs del hábito */}
      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 text-center">
        <div className="flex flex-col items-center gap-0.5 py-2">
          <span className="flex items-center gap-1 font-display text-base font-bold leading-none">
            <Flame size={13} strokeWidth={2} className="text-[var(--color-brand-text)]" />
            {habit.currentStreak}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">racha</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 border-x border-[var(--border)] py-2">
          <span className="flex items-center gap-1 font-display text-base font-bold leading-none">
            <Trophy size={12} strokeWidth={2} className="text-[var(--text-faint)]" />
            {habit.bestStreak}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">mejor</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2">
          <span className="font-display text-base font-bold leading-none" style={{ color: habit.color }}>{pct}%</span>
          <span className="text-[10px] text-[var(--text-muted)]">30 días</span>
        </div>
      </div>
    </div>
  );
}
