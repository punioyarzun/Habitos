import { useState, type FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff, CircleCheck, Dumbbell, BellRing, Wallet, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

type Mode = 'login' | 'register' | 'forgot';

const COPY: Record<Mode, { title: string; subtitle: string }> = {
  login: { title: 'Bienvenido de vuelta', subtitle: 'Ingresa a tu cuenta para continuar.' },
  register: { title: 'Crea tu cuenta', subtitle: 'Empieza a organizar tu progreso hoy.' },
  forgot: { title: 'Recuperar contraseña', subtitle: 'Te enviaremos un enlace para crear una nueva.' },
};

const FEATURES = [
  { Icon: CircleCheck, text: 'Hábitos con rachas y calendario' },
  { Icon: Dumbbell, text: 'Rutinas y progreso de gimnasio' },
  { Icon: BellRing, text: 'Recordatorios inteligentes' },
  { Icon: Wallet, text: 'Finanzas y estadísticas' },
];

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.85-.07-1.47-.22-2.12H12.24v3.86h6.2c-.12 1.03-.8 2.58-2.3 3.62l-.02.14 3.34 2.58.23.02c2.12-1.96 3.35-4.85 3.35-8.1z" />
      <path fill="#34A853" d="M12.24 24c3.04 0 5.59-1 7.45-2.72l-3.55-2.75c-.95.66-2.22 1.12-3.9 1.12-2.98 0-5.5-1.96-6.4-4.67l-.13.01-3.47 2.68-.05.13C3.99 21.3 7.83 24 12.24 24z" />
      <path fill="#FBBC05" d="M5.84 14.28a7.4 7.4 0 0 1-.4-2.28c0-.8.14-1.57.38-2.28l-.01-.15-3.51-2.72-.12.05A11.98 11.98 0 0 0 .84 12c0 1.94.47 3.77 1.29 5.4l3.71-3.12z" />
      <path fill="#EB4335" d="M12.24 4.75c2.11 0 3.54.91 4.35 1.67l3.18-3.1C17.82 1.19 15.28 0 12.24 0 7.83 0 3.99 2.7 2.13 6.6l3.7 3.12c.9-2.71 3.42-4.97 6.41-4.97z" />
    </svg>
  );
}
export function AuthPage() {
  const { signInWithPassword, signUpWithPassword, signInWithProvider, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
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

  const inputBase = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--color-brand-text)]';
  const iconCls = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]';

  return (
    <div className="min-h-screen bg-[var(--bg)] lg:grid lg:grid-cols-2">
      {/* Panel de marca — solo desktop */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{
          color: '#e7e8ff',
          background:
            'radial-gradient(120% 100% at 20% 15%, rgba(99,102,241,0.45), transparent 55%), linear-gradient(160deg, #1a1a3d 0%, #0b0e14 90%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(100% 80% at 30% 20%, #000 30%, transparent 75%)',
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-display text-base font-bold text-white">B</span>
          <span className="font-display text-lg font-semibold text-white">Bitácora</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-[2rem] font-semibold leading-[1.15] text-white">
            Todo tu progreso, en un solo lugar.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#b9bce6]">
            Hábitos, entrenamientos, recordatorios y finanzas — sincronizados en la nube, con rachas y estadísticas.
          </p>
          <ul className="mt-8 flex flex-col gap-3.5">
            {FEATURES.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-[#d7d9f5]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}>
                  <Icon size={16} strokeWidth={2} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-[#8f93c9]">
          <ShieldCheck size={14} strokeWidth={2} />
          Datos cifrados y aislados por usuario (RLS).
        </div>
      </aside>

      {/* Panel del formulario */}
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Logo — solo móvil */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 font-display text-xl font-bold text-white">B</span>
            <span className="font-display text-xl font-semibold">Bitácora</span>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{COPY[mode].title}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{COPY[mode].subtitle}</p>
          </div>

          {mode !== 'forgot' && (
            <div className="mb-5 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
              <button type="button" onClick={() => { setMode('login'); setMsg(null); }} className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                Iniciar sesión
              </button>
              <button type="button" onClick={() => { setMode('register'); setMsg(null); }} className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                Crear cuenta
              </button>
            </div>
          )}

          {msg && (
            <p role="status" className={`mb-3 rounded-lg border px-3 py-2 text-xs ${msg.kind === 'ok' ? 'border-[var(--color-brand-text)]/30 bg-brand-500/10 text-[var(--color-brand-text)]' : 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger-text)]'}`}>
              {msg.text}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} strokeWidth={2} className={iconCls} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" className={inputBase} />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Contraseña</label>
                <div className="relative">
                  <Lock size={16} strokeWidth={2} className={iconCls} />
                  <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={`${inputBase} pr-9`} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={16} strokeWidth={2} className={iconCls} />
                  <input type={showPw ? 'text' : 'password'} required value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={inputBase} />
                </div>
              </div>
            )}

            <Button type="submit" loading={busy} className="mt-1 w-full">
              {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
            </Button>
          </form>

          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('forgot'); setMsg(null); }} className="mt-3 w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" onClick={() => { setMode('login'); setMsg(null); }} className="mt-3 w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
              ← Volver a iniciar sesión
            </button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
                <span className="h-px flex-1 bg-[var(--border)]" /> o continúa con <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <button onClick={() => signInWithProvider('google')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]">
                <GoogleIcon /> Continuar con Google
              </button>
            </>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--text-faint)]">
            Al continuar aceptas guardar tus datos en la nube, sincronizados entre dispositivos.
          </p>
        </div>
      </main>
    </div>
  );
}
