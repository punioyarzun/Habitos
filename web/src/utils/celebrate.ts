const COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#8b5cf6'];

/**
 * Ráfaga de confeti ligera (sin dependencias): crea piezas absolutas animadas por
 * CSS (keyframe `confetti-fall`) y las limpia sola. Respeta prefers-reduced-motion.
 */
export function celebrate(): void {
  if (typeof document === 'undefined') return;
  try { if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; } catch { /* ignore */ }

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden';
  document.body.appendChild(container);

  const pieces = 40;
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('div');
    const size = 6 + Math.random() * 7;
    const dx = (Math.random() * 2 - 1) * 240;
    const dy = 240 + Math.random() * 300;
    const rot = (Math.random() * 2 - 1) * 720;
    const dur = 0.9 + Math.random() * 0.7;
    p.style.cssText =
      `position:absolute;left:50%;top:30%;width:${size}px;height:${size * 0.5 + 3}px;` +
      `background:${COLORS[i % COLORS.length]};border-radius:2px;` +
      `--dx:${dx}px;--dy:${dy}px;--r:${rot}deg;` +
      `animation:confetti-fall ${dur}s cubic-bezier(0.2,0.7,0.3,1) forwards`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 1900);
}

/** Vibración háptica corta si el dispositivo la soporta. */
export function haptic(pattern: number | number[] = 25): void {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
