import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

type Mode = 'login' | 'register' | 'forgot';

export function AuthPage() {
  const { signInWithPassword, signUpWithPassword, signInWithProvider, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithPassword(email, password);
      } else if (mode === 'register') {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (password !== password2) throw new Error('Las contraseñas no coinciden.');
        await signUpWithPassword(email, password);
        setMsg({ text: 'Cuenta creada. Revisa tu correo para confirmarla.', kind: 'ok' });
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setMsg({ text: 'Listo. Revisa tu correo y abre el enlace para crear una contraseña nueva.', kind: 'ok' });
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Ocurrió un error.', kind: 'err' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--color-brand-500)_18%,transparent),transparent_55%)]" />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 font-display text-xl font-bold text-[var(--color-brand-ink)]">B</div>
          <h1 className="font-display text-2xl font-semibold">Bitácora</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Hábitos y control de gastos, sincronizados en la nube.</p>
        </div>

        <div className="card p-6">
          {mode !== 'forgot' && (
            <div className="mb-5 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setMsg(null); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)]'}`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setMsg(null); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)]'}`}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Ingresa tu correo y te enviaremos un enlace para crear una contraseña nueva.
            </p>
          )}

          {msg && (
            <p role="status" className={`mb-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--color-brand-text)]' : 'text-[var(--color-danger-text)]'}`}>
              {msg.text}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Correo electrónico
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]"
              />
            </label>

            {mode !== 'forgot' && (
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Contraseña
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]"
                />
              </label>
            )}

            {mode === 'register' && (
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Confirmar contraseña
                <input
                  type="password"
                  required
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]"
                />
              </label>
            )}

            <Button type="submit" loading={busy} className="mt-1 w-full">
              {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
            </Button>
          </form>

          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('forgot'); setMsg(null); }} className="mt-3 w-full text-center text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)]">
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" onClick={() => { setMode('login'); setMsg(null); }} className="mt-3 w-full text-center text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)]">
              Volver a iniciar sesión
            </button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
                <span className="h-px flex-1 bg-[var(--border)]" /> o continúa con <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => signInWithProvider('google')} className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]">
                  Google
                </button>
                <button onClick={() => signInWithProvider('github')} className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]">
                  GitHub
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--text-faint)]">
          Tus datos se guardan en la nube y se sincronizan entre dispositivos.
        </p>
      </div>
    </div>
  );
}
