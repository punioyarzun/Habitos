import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
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

  const inputBase = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-9 pr-9 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--color-brand-text)]';
  const iconCls = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 font-display text-xl font-bold text-white">B</span>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Elige una contraseña nueva para tu cuenta.</p>
        </div>

        {err && (
          <p role="status" className="mb-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger-text)]">{err}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Contraseña nueva</label>
            <div className="relative">
              <Lock size={16} strokeWidth={2} className={iconCls} />
              <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={inputBase} />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Confirmar contraseña</label>
            <div className="relative">
              <Lock size={16} strokeWidth={2} className={iconCls} />
              <input type={showPw ? 'text' : 'password'} required value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={inputBase} />
            </div>
          </div>
          <Button type="submit" loading={busy} className="mt-1 w-full">Guardar contraseña</Button>
        </form>
      </div>
    </div>
  );
}
