import { Sun, Moon, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useReminderCenter } from '../hooks/reminderCenter';
import { Card } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { permission, notificationsEnabled, setNotificationsEnabled, requestPermission } = useReminderCenter();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 font-display text-xl font-semibold">Configuración</h1>

      <Card className="p-4">
        <p className="text-sm font-medium">Cuenta</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{user?.email}</p>
      </Card>

      <Card className="mt-3 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-medium">
          {notificationsEnabled && permission === 'granted' ? <Bell size={15} strokeWidth={2} /> : <BellOff size={15} strokeWidth={2} />}
          Notificaciones
        </p>
        {permission === 'unsupported' ? (
          <p className="text-sm text-[var(--text-muted)]">Tu navegador no admite notificaciones.</p>
        ) : permission === 'denied' ? (
          <p className="text-sm text-[var(--text-muted)]">Las notificaciones están bloqueadas. Habilítalas desde los ajustes de tu navegador para este sitio.</p>
        ) : permission === 'default' ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--text-muted)]">Recibe un aviso del navegador a la hora de tus recordatorios (mientras la app esté abierta).</p>
            <Button variant="secondary" onClick={() => requestPermission()} className="w-fit">Activar notificaciones</Button>
          </div>
        ) : (
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--text-muted)]">Avisos del navegador a la hora de tus recordatorios.</span>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              role="switch"
              aria-checked={notificationsEnabled}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${notificationsEnabled ? 'bg-brand-500' : 'bg-[var(--surface-2)]'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>
        )}
        <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-faint)]">
          Las notificaciones en segundo plano (con la app cerrada) requieren notificaciones push, disponibles como mejora futura. Ver <span className="font-mono">NOTIFICACIONES.md</span>.
        </p>
      </Card>

      <Card className="mt-3 p-4">
        <p className="mb-3 text-sm font-medium">Apariencia</p>
        <div className="flex gap-2">
          <button onClick={() => setTheme('dark')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium ${theme === 'dark' ? 'border-[var(--color-brand-text)] bg-brand-500/10 text-[var(--color-brand-text)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
            <Moon size={15} strokeWidth={2} /> Oscuro
          </button>
          <button onClick={() => setTheme('light')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium ${theme === 'light' ? 'border-[var(--color-brand-text)] bg-brand-500/10 text-[var(--color-brand-text)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
            <Sun size={15} strokeWidth={2} /> Claro
          </button>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <p className="mb-3 text-sm font-medium">Sesión</p>
        <Button variant="secondary" onClick={() => signOut()}>Cerrar sesión</Button>
      </Card>
    </div>
  );
}
