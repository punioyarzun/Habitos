import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'ok' | 'err' | 'info';
interface ToastItem { id: number; message: string; kind: ToastKind; }

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[90vw] sm:max-w-sm"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={
              'rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ' +
              (t.kind === 'ok'
                ? 'bg-brand-500/10 border-brand-500/40 text-[var(--color-brand-text)]'
                : t.kind === 'err'
                ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/40 text-[var(--color-danger-text)]'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)]')
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
