import { useEffect, useRef, useState } from 'react';
import { X, Plus, Timer } from 'lucide-react';
import { formatClock } from '../../utils/time';

/** Tres pitidos cortos con Web Audio (el último más agudo). Se llama al llegar a 0. */
function playBeeps() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.28, 0.56].forEach((offset, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + offset);
      o.stop(now + offset + 0.24);
    });
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1000);
  } catch { /* audio no disponible */ }
}

/** Temporizador de descanso flotante entre series/ejercicios. Cuenta atrás,
 *  al llegar a 0 suena + vibra y se cierra solo para retomar la rutina. */
export function RestTimer({ seconds, label = 'Descanso', onClose }: { seconds: number; label?: string; onClose: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const total = useRef(seconds);
  const ref = useRef<number | null>(null);

  useEffect(() => { setRemaining(seconds); total.current = seconds; }, [seconds]);

  useEffect(() => {
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (ref.current) clearInterval(ref.current);
          try { navigator.vibrate?.([300, 120, 300]); } catch { /* ignore */ }
          playBeeps();
          onClose();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = total.current > 0 ? Math.max(0, Math.min(100, (remaining / total.current) * 100)) : 0;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4 lg:bottom-6">
      <div className="rounded-2xl border border-brand-500/50 bg-[var(--surface)] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-[var(--color-brand-text)]">
            <Timer size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-[var(--text-muted)]">{label}</p>
            <p className="font-mono text-3xl font-bold leading-none tabular-nums">{formatClock(remaining)}</p>
          </div>
          <button onClick={() => { setRemaining((r) => r + 15); total.current += 15; }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-2 text-xs font-medium hover:text-[var(--text)]">
            <Plus size={13} strokeWidth={2} /> 15s
          </button>
          <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Saltar descanso">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
