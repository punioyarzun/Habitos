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
