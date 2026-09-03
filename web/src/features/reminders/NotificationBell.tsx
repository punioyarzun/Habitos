import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, AlertCircle } from 'lucide-react';
import { useReminderCenter } from '../../hooks/reminderCenter';
import { formatTimeShort } from '../../utils/time';

export function NotificationBell() {
  const { dueToday, overdue, todayCount, toggleComplete, permission, notificationsEnabled, requestPermission } = useReminderCenter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const items = [...overdue.map((r) => ({ r, overdue: true })), ...dueToday.map((r) => ({ r, overdue: false }))].slice(0, 8);
  const showPermissionPrompt = permission === 'default' || (permission === 'granted' && !notificationsEnabled);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
        aria-label="Recordatorios de hoy"
      >
        <Bell size={15} strokeWidth={2} />
        {todayCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
            {todayCount > 9 ? '9+' : todayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
            <p className="text-sm font-semibold">Recordatorios de hoy</p>
            <Link to="/recordatorios" onClick={() => setOpen(false)} className="text-xs text-[var(--color-brand-text)] hover:underline">Ver todos</Link>
          </div>

          {showPermissionPrompt && (
            <button
              onClick={() => requestPermission()}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] bg-brand-500/[0.06] px-3 py-2 text-left text-xs text-[var(--color-brand-text)]"
            >
              <Bell size={13} strokeWidth={2} /> Activar notificaciones del navegador
            </button>
          )}

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">Nada pendiente para hoy.</p>
            ) : (
              items.map(({ r, overdue: isOver }) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)]">
                  <button
                    onClick={() => toggleComplete(r, today)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-[var(--border)] text-transparent hover:border-[var(--color-brand-text)]/60 hover:text-[var(--color-brand-text)]"
                    aria-label="Completar"
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.title}</p>
                    <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      {isOver && <AlertCircle size={11} strokeWidth={2} className="text-[var(--color-danger-text)]" />}
                      {isOver ? 'Vencido' : (r.remind_time ? formatTimeShort(r.remind_time) : 'Hoy')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
