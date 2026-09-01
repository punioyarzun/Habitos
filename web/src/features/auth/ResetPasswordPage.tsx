import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (password !== password2) return setErr('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await updatePassword(password);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="font-display text-lg font-semibold">Crea tu nueva contraseña</h1>
        {err && <p className="mt-3 text-xs text-[var(--color-danger-text)]">{err}</p>}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="text-xs font-medium text-[var(--text-muted)]">
            Contraseña nueva
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]" />
          </label>
          <label className="text-xs font-medium text-[var(--text-muted)]">
            Confirmar contraseña
            <input type="password" required value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]" />
          </label>
          <Button type="submit" loading={busy} className="mt-1 w-full">Guardar contraseña</Button>
        </form>
      </div>
    </div>
  );
}
