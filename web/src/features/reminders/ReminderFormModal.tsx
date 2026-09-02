import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Reminder, ReminderPriority, ReminderRepeat } from '../../types/domain';
import type { ReminderInput } from '../../services/remindersService';
import { REMINDER_CATEGORIES, REPEAT_LABELS, WEEKDAY_LABELS } from '../../utils/reminders';
import { todayIso } from '../../utils/dates';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: ReminderInput) => Promise<void> | void;
  initial?: Reminder | null;
}

const PRIORITIES: { key: ReminderPriority; label: string; color: string }[] = [
  { key: 'baja', label: 'Baja', color: 'var(--color-money-in-text)' },
  { key: 'media', label: 'Media', color: 'var(--color-brand-text)' },
  { key: 'alta', label: 'Alta', color: 'var(--color-danger-text)' },
];

const field = 'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm';
const label = 'text-xs font-medium text-[var(--text-muted)]';

export function ReminderFormModal({ open, onClose, onSave, initial }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('personal');
  const [priority, setPriority] = useState<ReminderPriority>('media');
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? '');
      setDate(initial.remind_date);
      setTime(initial.remind_time ? initial.remind_time.slice(0, 5) : '');
      setCategory(initial.category);
      setPriority(initial.priority);
      setRepeat(initial.repeat);
      setRepeatDays(initial.repeat_days ?? []);
      setDayOfMonth(initial.repeat_day_of_month ? String(initial.repeat_day_of_month) : '');
    } else {
      setTitle(''); setDescription(''); setDate(todayIso()); setTime('');
      setCategory('personal'); setPriority('media'); setRepeat('none'); setRepeatDays([]); setDayOfMonth('');
    }
    setError(null);
  }, [open, initial]);

  function toggleDay(d: number) {
    setRepeatDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  async function handleSave() {
    if (!title.trim()) { setError('Ponle un título al recordatorio.'); return; }
    if (repeat === 'weekly' && repeatDays.length === 0) { setError('Elige al menos un día de la semana.'); return; }
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || 'personal',
        priority,
        remind_date: date,
        remind_time: time || null,
        repeat,
        repeat_days: repeat === 'weekly' ? repeatDays : [],
        repeat_day_of_month: repeat === 'monthly' ? (Number(dayOfMonth) || Number(date.slice(8, 10))) : null,
      });
      onClose();
    } catch {
      setError('No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSave} loading={busy}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="flex flex-col gap-3">
        <label className={label}>Título
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ej: Tomar agua, Pagar cuenta…" className={`mt-1 w-full ${field}`} />
        </label>

        <label className={label}>Descripción
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="Opcional" className={`mt-1 w-full ${field}`} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className={label}>Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 w-full ${field}`} />
          </label>
          <label className={label}>Hora
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`mt-1 w-full ${field}`} />
          </label>
        </div>

        <label className={label}>Categoría
          <input list="reminder-categories" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} className={`mt-1 w-full ${field}`} />
          <datalist id="reminder-categories">
            {REMINDER_CATEGORIES.map((c) => <option key={c} value={c[0].toUpperCase() + c.slice(1)} />)}
          </datalist>
        </label>

        <div>
          <span className={label}>Prioridad</span>
          <div className="mt-1 flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPriority(p.key)}
                className={clsx('flex-1 rounded-lg border py-2 text-sm font-medium transition-colors', priority === p.key ? 'border-current' : 'border-[var(--border)] text-[var(--text-muted)]')}
                style={priority === p.key ? { color: p.color, background: `color-mix(in srgb, ${p.color} 12%, transparent)` } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className={label}>Repetición
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)} className={`mt-1 w-full ${field}`}>
            {(Object.keys(REPEAT_LABELS) as ReminderRepeat[]).map((r) => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
          </select>
        </label>

        {repeat === 'weekly' && (
          <div>
            <span className={label}>Días</span>
            <div className="mt-1 flex gap-1.5">
              {WEEKDAY_LABELS.map((l, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={clsx('h-9 w-9 rounded-lg border text-sm font-medium', repeatDays.includes(i) ? 'border-brand-500 bg-brand-500 text-[var(--color-brand-ink)]' : 'border-[var(--border)] text-[var(--text-muted)]')}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {repeat === 'monthly' && (
          <label className={label}>Día del mes
            <input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder={date.slice(8, 10)} className={`mt-1 w-full ${field}`} />
          </label>
        )}

        {error && <p className="text-xs text-[var(--color-danger-text)]">{error}</p>}
      </div>
    </Modal>
  );
}
