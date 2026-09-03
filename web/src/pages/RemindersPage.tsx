import { useMemo, useState } from 'react';
import { BellRing, Pencil, Trash2, CalendarClock, Clock3, Check } from 'lucide-react';
import { useReminderCenter } from '../hooks/reminderCenter';
import type { Reminder } from '../types/domain';
import type { ReminderInput } from '../services/remindersService';
import { Card, EmptyState, Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { MonthNav } from '../components/ui/MonthNav';
import { ReminderItem } from '../features/reminders/ReminderItem';
import { ReminderFormModal } from '../features/reminders/ReminderFormModal';
import { occursOn, isCompletedOn, nextOccurrence, isRecurring, PRIORITY_ORDER } from '../utils/reminders';
import { timeToMinutes } from '../utils/time';
import { addDays, toIsoDate, todayIso, formatDayLabel, formatDateShort } from '../utils/dates';

type View = 'hoy' | 'proximos' | 'lista' | 'calendario' | 'completados';
const VIEWS = [
  { key: 'hoy' as const, label: 'Hoy' },
  { key: 'proximos' as const, label: 'Próximos' },
  { key: 'lista' as const, label: 'Lista' },
  { key: 'calendario' as const, label: 'Calendario' },
  { key: 'completados' as const, label: 'Completados' },
];

function daysInMonth(year: number, month0: number) { return new Date(year, month0 + 1, 0).getDate(); }

export function RemindersPage() {
  const {
    reminders, completedDatesByReminder, loading, dueToday, overdue,
    create, update, remove, toggleComplete, reschedule, announceCreated,
  } = useReminderCenter();

  const [view, setView] = useState<View>('hoy');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [calSelected, setCalSelected] = useState<string | null>(todayIso());

  const today = todayIso();
  const menuReminder = reminders.find((r) => r.id === menuFor) ?? null;

  function isDone(r: Reminder, refDate: string) {
    return isCompletedOn(r, completedDatesByReminder.get(r.id) ?? new Set(), refDate);
  }
  function sortByTimePriority(a: Reminder, b: Reminder) {
    const t = timeToMinutes(a.remind_time) - timeToMinutes(b.remind_time);
    return t !== 0 ? t : PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  }

  // Próximos: siguiente ocurrencia futura (mañana → +60 días) de cada recordatorio.
  const upcoming = useMemo(() => {
    const from = addDays(today, 1);
    const limit = addDays(today, 60);
    const rows: { reminder: Reminder; date: string }[] = [];
    for (const r of reminders) {
      if (r.repeat === 'none' && r.status === 'completed') continue;
      const next = nextOccurrence(r, from);
      if (next && next <= limit) rows.push({ reminder: r, date: next });
    }
    return rows.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : sortByTimePriority(a.reminder, b.reminder)));
  }, [reminders, today]);

  // Lista: todos, ordenados por fecha.
  const allSorted = useMemo(
    () => [...reminders].sort((a, b) => (a.remind_date !== b.remind_date ? (a.remind_date < b.remind_date ? 1 : -1) : sortByTimePriority(a, b))),
    [reminders]
  );

  // Completados: no-recurrentes completados + ocurrencias completadas de recurrentes.
  const completedRows = useMemo(() => {
    const rows: { reminder: Reminder; date: string }[] = [];
    for (const r of reminders) {
      if (isRecurring(r)) {
        for (const d of completedDatesByReminder.get(r.id) ?? []) rows.push({ reminder: r, date: d });
      } else if (r.status === 'completed') {
        rows.push({ reminder: r, date: r.completed_at ? r.completed_at.slice(0, 10) : r.remind_date });
      }
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 100);
  }, [reminders, completedDatesByReminder]);

  // Calendario
  const firstWeekday = new Date(calCursor.year, calCursor.month0, 1).getDay();
  const totalDays = daysInMonth(calCursor.year, calCursor.month0);
  const monthLabel = new Date(calCursor.year, calCursor.month0, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  function calCells() {
    const out: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= totalDays; d++) out.push(toIsoDate(new Date(calCursor.year, calCursor.month0, d)));
    return out;
  }
  const remindersOnSelected = useMemo(() => {
    if (!calSelected) return [];
    return reminders.filter((r) => occursOn(r, calSelected)).sort(sortByTimePriority);
  }, [reminders, calSelected]);

  async function handleSave(input: ReminderInput) {
    if (editing) {
      await update(editing.id, input);
    } else {
      const created = await create(input);
      if (created) await announceCreated(created);
    }
    setEditing(null);
  }

  function openEdit(r: Reminder) { setEditing(r); setShowForm(true); setMenuFor(null); }
  function openCreate() { setEditing(null); setShowForm(true); }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/12 text-[var(--color-brand-text)]"><BellRing size={17} strokeWidth={2} /></span>
          <h1 className="font-display text-xl font-semibold">Recordatorios</h1>
        </div>
        <Button onClick={openCreate}>+ Nuevo</Button>
      </div>

      <Tabs items={VIEWS} value={view} onChange={setView} className="mb-4" />

      {loading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      ) : (
        <>
          {view === 'hoy' && (
            <div className="flex flex-col gap-4">
              {overdue.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-danger-text)]">Vencidos</p>
                  <div className="flex flex-col gap-2">
                    {overdue.map((r) => (
                      <ReminderItem key={r.id} reminder={r} done={false} showDate onToggle={() => toggleComplete(r, today)} onOpenMenu={() => setMenuFor(r.id)} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Hoy · {formatDayLabel(today).replace(/^\w/, (c) => c.toUpperCase())}</p>
                {dueToday.length === 0 ? (
                  <EmptyState icon={<Check size={26} strokeWidth={1.5} />} title="Todo al día" description="No tienes recordatorios pendientes para hoy." />
                ) : (
                  <div className="flex flex-col gap-2">
                    {dueToday.map((r) => (
                      <ReminderItem key={r.id} reminder={r} done={false} onToggle={() => toggleComplete(r, today)} onOpenMenu={() => setMenuFor(r.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'proximos' && (
            upcoming.length === 0 ? (
              <EmptyState icon={<CalendarClock size={26} strokeWidth={1.5} />} title="Nada próximo" description="No hay recordatorios en los próximos 60 días." />
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map(({ reminder, date }) => (
                  <ReminderItem key={`${reminder.id}-${date}`} reminder={{ ...reminder, remind_date: date }} done={false} showDate onToggle={() => toggleComplete(reminder, date)} onOpenMenu={() => setMenuFor(reminder.id)} />
                ))}
              </div>
            )
          )}

          {view === 'lista' && (
            allSorted.length === 0 ? (
              <EmptyState icon={<BellRing size={26} strokeWidth={1.5} />} title="Sin recordatorios" description="Crea tu primer recordatorio." action={<Button onClick={openCreate}>Crear recordatorio</Button>} />
            ) : (
              <div className="flex flex-col gap-2">
                {allSorted.map((r) => {
                  const ref = isRecurring(r) ? today : r.remind_date;
                  return <ReminderItem key={r.id} reminder={r} done={isDone(r, ref)} showDate onToggle={() => toggleComplete(r, ref)} onOpenMenu={() => setMenuFor(r.id)} />;
                })}
              </div>
            )
          )}

          {view === 'calendario' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold capitalize">{monthLabel}</h2>
                <MonthNav
                  onPrev={() => setCalCursor((c) => c.month0 === 0 ? { year: c.year - 1, month0: 11 } : { year: c.year, month0: c.month0 - 1 })}
                  onToday={() => { const d = new Date(); setCalCursor({ year: d.getFullYear(), month0: d.getMonth() }); setCalSelected(todayIso()); }}
                  onNext={() => setCalCursor((c) => c.month0 === 11 ? { year: c.year + 1, month0: 0 } : { year: c.year, month0: c.month0 + 1 })}
                />
              </div>
              <Card className="p-4">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-faint)]">
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                  {calCells().map((iso, i) => {
                    if (!iso) return <div key={`e-${i}`} />;
                    const count = reminders.filter((r) => occursOn(r, iso)).length;
                    return (
                      <button
                        key={iso}
                        onClick={() => setCalSelected(iso)}
                        className={`relative aspect-square rounded-lg text-xs font-medium transition-transform hover:scale-105 ${iso === todayIso() ? 'ring-2 ring-brand-500' : ''} ${calSelected === iso ? 'ring-2 ring-[var(--color-brand-text)]' : ''}`}
                        style={{ background: count > 0 ? 'color-mix(in srgb, var(--color-brand-500) 22%, var(--surface-2))' : 'var(--surface-2)', color: 'var(--text-muted)' }}
                      >
                        {Number(iso.slice(-2))}
                        {count > 0 && <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-[var(--color-brand-text)]" />}
                      </button>
                    );
                  })}
                </div>
              </Card>
              {calSelected && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold capitalize">{formatDayLabel(calSelected)}</p>
                  {remindersOnSelected.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">Sin recordatorios este día.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {remindersOnSelected.map((r) => (
                        <ReminderItem key={r.id} reminder={r} done={isDone(r, calSelected)} onToggle={() => toggleComplete(r, calSelected)} onOpenMenu={() => setMenuFor(r.id)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'completados' && (
            completedRows.length === 0 ? (
              <EmptyState icon={<Check size={26} strokeWidth={1.5} />} title="Nada completado aún" />
            ) : (
              <div className="flex flex-col gap-2">
                {completedRows.map(({ reminder, date }) => (
                  <div key={`${reminder.id}-${date}`} className="card flex items-center gap-3 p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-[var(--color-brand-ink)]"><Check size={16} strokeWidth={2.5} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-muted)] line-through">{reminder.title}</p>
                      <p className="text-xs text-[var(--text-faint)]">{formatDateShort(date)}</p>
                    </div>
                    {isRecurring(reminder)
                      ? <button onClick={() => toggleComplete(reminder, date)} className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Deshacer</button>
                      : <button onClick={() => toggleComplete(reminder, date)} className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Reabrir</button>}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Form crear/editar */}
      <ReminderFormModal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} initial={editing} />

      {/* Menú de recordatorio */}
      <Modal
        open={!!menuReminder}
        onClose={() => setMenuFor(null)}
        title={menuReminder?.title ?? ''}
        footer={<Button variant="ghost" onClick={() => setMenuFor(null)}>Cerrar</Button>}
      >
        <div className="flex flex-col gap-2">
          <Button variant="secondary" icon={<Pencil size={16} strokeWidth={2} />} onClick={() => openEdit(menuReminder!)}>Editar</Button>
          {menuReminder?.repeat === 'none' && (
            <>
              <Button variant="secondary" icon={<Clock3 size={16} strokeWidth={2} />} onClick={() => { reschedule(menuReminder.id, addDays(menuReminder.remind_date < today ? today : menuReminder.remind_date, 1)); setMenuFor(null); }}>Posponer 1 día</Button>
              <Button variant="secondary" icon={<CalendarClock size={16} strokeWidth={2} />} onClick={() => { reschedule(menuReminder.id, addDays(today, 7)); setMenuFor(null); }}>Posponer 1 semana</Button>
            </>
          )}
          <Button variant="danger" icon={<Trash2 size={16} strokeWidth={2} />} onClick={() => { setConfirmDelete(menuReminder!.id); setMenuFor(null); }}>Eliminar</Button>
        </div>
      </Modal>

      {/* Confirmar borrado */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar recordatorio?"
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button><Button variant="danger" onClick={() => { remove(confirmDelete!); setConfirmDelete(null); }}>Eliminar</Button></>}
      >
        Esto elimina el recordatorio y su historial de completados.
      </Modal>
    </div>
  );
}
