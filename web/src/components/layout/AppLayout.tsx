import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutGrid, CheckCircle2, CalendarDays, Wallet, BarChart3, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: LayoutGrid, end: true },
  { to: '/habitos', label: 'Hábitos', Icon: CheckCircle2 },
  { to: '/calendario', label: 'Calendario', Icon: CalendarDays },
  { to: '/finanzas', label: 'Finanzas', Icon: Wallet },
  { to: '/estadisticas', label: 'Estadísticas', Icon: BarChart3 },
  { to: '/configuracion', label: 'Configuración', Icon: Settings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-500/12 text-[var(--color-brand-text)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
            )
          }
        >
          <item.Icon size={17} strokeWidth={2} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout() {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg)] lg:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] p-5 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 font-display text-sm font-bold text-[var(--color-brand-ink)]">B</span>
          <span className="font-display text-lg font-semibold">Bitácora</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavItems />
        </nav>
        <div className="mt-6 flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
          <span className="truncate text-xs text-[var(--text-muted)]" title={user?.email ?? ''}>{user?.email}</span>
          <button onClick={() => signOut()} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--color-money-out-text)]" aria-label="Cerrar sesión">
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar — mobile + theme toggle */}
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 lg:justify-end lg:border-b-0 lg:bg-transparent lg:px-6 lg:py-4">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500 font-display text-xs font-bold text-[var(--color-brand-ink)]">B</span>
            <span className="font-display text-base font-semibold">Bitácora</span>
          </div>
          <button
            onClick={toggleTheme}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
          </button>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pt-6">
          <Outlet />
        </main>

        {/* Bottom nav — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--border)] bg-[var(--bg-elevated)] px-1 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium',
                  isActive ? 'text-[var(--color-brand-text)]' : 'text-[var(--text-muted)]'
                )
              }
            >
              <item.Icon size={18} strokeWidth={2} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
