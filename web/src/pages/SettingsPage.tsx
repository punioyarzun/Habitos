import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 font-display text-xl font-semibold">Configuración</h1>

      <Card className="p-4">
        <p className="text-sm font-medium">Cuenta</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{user?.email}</p>
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
