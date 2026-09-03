import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-5', className)}>{children}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
      {icon && <div className="text-3xl opacity-70">{icon}</div>}
      <p className="font-display text-base font-semibold text-[var(--text)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-[var(--surface-2)]', className)} />;
}

/** Tarjeta de métrica: ícono opcional + valor grande + etiqueta. Consistente
 *  con las tarjetas de stats del Dashboard/Finanzas existentes. */
export function StatCard({
  value, label, icon, accent = false, className,
}: {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('card p-4', className)}>
      <p className={clsx('flex items-center gap-1.5 font-display text-2xl font-bold', accent && 'text-[var(--color-brand-text)]')}>
        {icon}
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

/** Barra de progreso simple (0..100). El color por defecto es el de marca. */
export function ProgressBar({ pct, color, className }: { pct: number; color?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%`, background: color ?? 'var(--color-brand-500)' }}
      />
    </div>
  );
}

/** Anillo de progreso circular (SVG). `pct` va de 0 a 1. El contenido central
 *  (ícono, número…) se pasa como children. */
export function ProgressRing({
  pct, size = 48, stroke = 3, color, children, className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const offset = circumference * (1 - clamped);
  return (
    <span className={clsx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color ?? 'var(--color-brand-500)'} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
