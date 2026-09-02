import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Dumbbell } from 'lucide-react';

const SUB_NAV = [
  { to: '/gimnasio', label: 'Resumen', end: true },
  { to: '/gimnasio/rutinas', label: 'Rutinas', end: false },
  { to: '/gimnasio/progreso', label: 'Progreso', end: false },
  { to: '/gimnasio/calendario', label: 'Calendario', end: false },
];

export function GymPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/12 text-[var(--color-brand-text)]">
          <Dumbbell size={18} strokeWidth={2} />
        </span>
        <h1 className="font-display text-xl font-semibold">Gimnasio</h1>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-1 text-sm scrollbar-thin">
        {SUB_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'shrink-0 rounded-md px-3 py-1.5 font-medium transition-colors',
                isActive ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
