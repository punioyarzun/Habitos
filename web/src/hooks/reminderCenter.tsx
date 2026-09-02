import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReminders } from './useReminders';
import type { Reminder } from '../types/domain';
import { isoNow } from '../utils/streaks';
import { occursOn, isCompletedOn, PRIORITY_ORDER } from '../utils/reminders';
import { timeToMinutes } from '../utils/time';

const NOTIF_PREF_KEY = 'bitacora:notifications';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

function currentPermission(): Permission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as Permission;
}

interface ReminderCenterValue extends ReturnType<typeof useReminders> {
  dueToday: Reminder[];
  overdue: Reminder[];
  todayCount: number; // due today (no completados) + vencidos
  permission: Permission;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  requestPermission: () => Promise<void>;
}

const Ctx = createContext<ReminderCenterValue | null>(null);

export function ReminderCenterProvider({ children }: { children: ReactNode }) {
  const rc = useReminders();
  const { reminders, completedDatesByReminder } = rc;
  const today = isoNow();

  const [permission, setPermission] = useState<Permission>(currentPermission);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(NOTIF_PREF_KEY);
      if (stored === 'on') return true;
      if (stored === 'off') return false;
    } catch { /* ignore */ }
    return currentPermission() === 'granted';
  });

  function setNotificationsEnabled(v: boolean) {
    setNotificationsEnabledState(v);
    try { localStorage.setItem(NOTIF_PREF_KEY, v ? 'on' : 'off'); } catch { /* ignore */ }
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as Permission);
      if (result === 'granted') setNotificationsEnabled(true);
    } catch { /* ignore */ }
  }

  // Recordatorios que ocurren hoy y no están completados, ordenados por hora y prioridad.
  const dueToday = useMemo(() => {
    const completedSets = completedDatesByReminder;
    return reminders
      .filter((r) => occursOn(r, today) && !isCompletedOn(r, completedSets.get(r.id) ?? new Set(), today))
      .sort((a, b) => {
        const t = timeToMinutes(a.remind_time) - timeToMinutes(b.remind_time);
        if (t !== 0) return t;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });
  }, [reminders, completedDatesByReminder, today]);

  // Vencidos: recordatorios de una sola vez, con fecha pasada y aún pendientes.
  const overdue = useMemo(
    () => reminders
      .filter((r) => r.repeat === 'none' && r.status === 'pending' && r.remind_date < today)
      .sort((a, b) => (a.remind_date < b.remind_date ? 1 : -1)),
    [reminders, today]
  );

  const todayCount = dueToday.length + overdue.length;

  // ----- Notificaciones locales del navegador (mientras la app está abierta) -----
  // Programa un setTimeout por cada recordatorio de hoy con hora futura. No hay
  // backend ni push: es real pero solo dispara con la pestaña abierta. El push
  // en segundo plano queda documentado como paso futuro (requiere Service Worker
  // + servidor VAPID).
  const timers = useRef<number[]>([]);
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    if (!notificationsEnabled || permission !== 'granted' || typeof Notification === 'undefined') return;

    const now = new Date();
    for (const r of dueToday) {
      if (!r.remind_time) continue;
      const [h, m] = r.remind_time.slice(0, 5).split(':').map(Number);
      const fireAt = new Date();
      fireAt.setHours(h || 0, m || 0, 0, 0);
      const delay = fireAt.getTime() - now.getTime();
      if (delay <= 0 || delay > 12 * 3600 * 1000) continue; // solo próximas 12 h
      const key = `${r.id}:${today}`;
      if (notifiedIds.current.has(key)) continue;
      const timerId = window.setTimeout(() => {
        try {
          new Notification(r.title, {
            body: r.description || 'Recordatorio de Bitácora',
            icon: '/icon-192.png',
            tag: key,
          });
          notifiedIds.current.add(key);
        } catch { /* ignore */ }
      }, delay);
      timers.current.push(timerId);
    }

    return () => {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    };
  }, [dueToday, notificationsEnabled, permission, today]);

  // Mantener el estado de permiso sincronizado si cambia en otra pestaña/ajustes.
  useEffect(() => {
    const onFocus = () => setPermission(currentPermission());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const value: ReminderCenterValue = {
    ...rc,
    dueToday,
    overdue,
    todayCount,
    permission,
    notificationsEnabled,
    setNotificationsEnabled,
    requestPermission,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReminderCenter(): ReminderCenterValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReminderCenter debe usarse dentro de <ReminderCenterProvider>');
  return ctx;
}
