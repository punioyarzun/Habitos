import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';
import { HabitTile } from '../features/habits/HabitTile';
import { Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';

export function FocusPage() {
  const { activeHabits, loading, toggleToday } = useHabits();
  const pending = useMemo(() => activeHabits.filter((h) => !h.doneToday), [activeHabits]);
  const total = activeHabits.length;
  const done = total - pending.length;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={16} strokeWidth={2} /> Salir
        </Link>
        <span className="text-sm font-medium text-[var(--text-muted)]">{done}/{total} hoy</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : pending.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-money-in)]/15 text-[var(--color-money-in-text)]">
            <PartyPopper size={36} strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold">{total === 0 ? 'Sin hábitos para hoy' : '¡Listo por hoy!'}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{total === 0 ? 'Crea un hábito para empezar.' : 'Cumpliste todos tus hábitos. Buen trabajo.'}</p>
          </div>
          <Link to="/"><Button variant="secondary">Volver al inicio</Button></Link>
        </div>
      ) : (
        <>
          <div className="mb-2 text-center">
            <h1 className="font-display text-xl font-semibold">Modo foco</h1>
            <p className="text-sm text-[var(--text-muted)]">Toca para completar lo que falta hoy.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
            {pending.map((h) => (
              <div key={h.id} className="animate-pop-in">
                <HabitTile habit={h} onToggle={toggleToday} size={104} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
