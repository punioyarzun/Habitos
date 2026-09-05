import { Flame, PartyPopper, Sunrise } from 'lucide-react';
import { ProgressRing } from '../../components/ui/primitives';

/** Hero del día: un anillo grande con el progreso de hoy (estilo Streaks /
 *  Apple Activity). El confeti al llegar al 100% lo dispara toggleToday. */
export function DailyGoalRing({ done, total, streak }: { done: number; total: number; streak: number }) {
  const pct = total > 0 ? done / total : 0;
  const complete = total > 0 && done >= total;
  const remaining = Math.max(0, total - done);

  const ringColor = complete ? 'var(--color-money-in)' : 'var(--color-brand-500)';
  let title: string;
  if (total === 0) title = 'Sin hábitos para hoy';
  else if (complete) title = '¡Día completo!';
  else if (done === 0) title = 'Empieza tu día';
  else title = remaining === 1 ? 'Falta 1 hábito' : `Faltan ${remaining} hábitos`;

  return (
    <div className="card animate-pop-in flex items-center gap-5 p-5">
      <div className="shrink-0">
        <ProgressRing pct={pct} size={104} stroke={9} color={ringColor}>
          <div className="text-center">
            <p className="font-display text-2xl font-bold leading-none tabular-nums">
              {done}<span className="text-[var(--text-faint)]">/{total}</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">hoy</p>
          </div>
        </ProgressRing>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          {complete ? <PartyPopper size={18} strokeWidth={2} className="shrink-0 text-[var(--color-money-in-text)]" /> : <Sunrise size={18} strokeWidth={2} className="shrink-0 text-[var(--color-brand-text)]" />}
          <span className="truncate">{title}</span>
        </p>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {complete ? 'Cumpliste todos tus hábitos de hoy.' : `${Math.round(pct * 100)}% completado`}
        </p>
        {streak > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-[var(--color-brand-text)]">
            <Flame size={13} strokeWidth={2} className="animate-flame" /> {streak} {streak === 1 ? 'día' : 'días'} de racha
          </p>
        )}
      </div>
    </div>
  );
}
