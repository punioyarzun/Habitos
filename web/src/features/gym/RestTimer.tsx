import { useEffect, useRef, useState } from 'react';
import { X, Plus, Timer } from 'lucide-react';
import { formatClock } from '../../utils/time';

/** Temporizador de descanso flotante entre series. Cuenta atrás y se cierra solo. */
export function RestTimer({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (ref.current) clearInterval(ref.current);
          // Vibración suave si el dispositivo lo soporta.
          try { navigator.vibrate?.(200); } catch { /* ignore */ }
          onClose();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-brand-500/40 bg-[var(--surface)] px-4 py-3 shadow-2xl lg:bottom-6">
      <Timer size={18} strokeWidth={2} className="shrink-0 text-[var(--color-brand-text)]" />
      <div className="flex-1">
        <p className="text-xs text-[var(--text-muted)]">Descanso</p>
        <p className="font-mono text-lg font-semibold tabular-nums">{formatClock(remaining)}</p>
      </div>
      <button onClick={() => setRemaining((r) => r + 15)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium hover:text-[var(--text)]">
        <Plus size={13} strokeWidth={2} /> 15s
      </button>
      <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label="Saltar descanso">
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
