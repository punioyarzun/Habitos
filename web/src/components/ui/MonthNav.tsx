import { ChevronLeft, ChevronRight } from 'lucide-react';

const btn = 'grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]';

/** Navegación mes anterior / hoy / siguiente. Reutilizada en Calendario,
 *  Finanzas, Recordatorios y el calendario de Gimnasio. */
export function MonthNav({ onPrev, onNext, onToday }: { onPrev: () => void; onNext: () => void; onToday?: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onPrev} className={btn} aria-label="Mes anterior"><ChevronLeft size={16} strokeWidth={2} /></button>
      {onToday && (
        <button onClick={onToday} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
          Hoy
        </button>
      )}
      <button onClick={onNext} className={btn} aria-label="Mes siguiente"><ChevronRight size={16} strokeWidth={2} /></button>
    </div>
  );
}
