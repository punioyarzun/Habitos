import clsx from 'clsx';

export interface TabItem<T extends string> {
  key: T;
  label: string;
}

/** Barra de pestañas reutilizable — mismo look que los filtros de Hábitos/Estadísticas. */
export function Tabs<T extends string>({
  items, value, onChange, className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx('flex gap-1 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-1 text-sm scrollbar-thin', className)}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={clsx(
            'shrink-0 rounded-md px-3 py-1.5 font-medium transition-colors',
            value === it.key ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
