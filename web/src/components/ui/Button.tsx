import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-500 text-[var(--color-brand-ink)] font-semibold hover:bg-brand-600 disabled:bg-brand-500/50',
  secondary: 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--color-brand-text)]/60',
  ghost: 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
  danger: 'bg-transparent text-[var(--color-danger-text)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/10',
};

export function Button({ variant = 'primary', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}
