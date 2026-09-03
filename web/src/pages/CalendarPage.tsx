import { useMemo, useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';
import { completionsService } from '../services/completionsService';
import { Card, EmptyState } from '../components/ui/primitives';
import { toIsoDate, todayIso, formatDayLabel } from '../utils/dates';
import { HabitIcon } from '../features/habits/habitIcons';
import { MonthNav } from '../components/ui/MonthNav';

function startOfMonth(year: number, month0: number) { return new Date(year, month0, 1); }
function daysInMonth(year: number, month0: number) { return new Date(year, month0 + 1, 0).getDate(); }

export function CalendarPage() {
  const { activeHabits, completions, reload } = useHabits();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [selected, setSelected] = useState<string | null>(null);

  const monthLabel = startOfMonth(cursor.year, cursor.month0).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const firstWeekday = startOfMonth(cursor.year, cursor.month0).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month0);

  const completionsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!map.has(c.completed_date)) map.set(c.completed_date, new Set());
      map.get(c.completed_date)!.add(c.habit_id);
    }
    return map;
  }, [completions]);

  function cellsForMonth() {
    const cells: { iso: string | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ iso: null });
    for (let day = 1; day <= totalDays; day++) {
      cells.push({ iso: toIsoDate(new Date(cursor.year, cursor.month0, day)) });
    }
    return cells;
  }

  function intensity(iso: string): number {
    if (activeHabits.length === 0) return 0;
    const done = completionsByDate.get(iso)?.size ?? 0;
    return Math.min(1, done / activeHabits.length);
  }

  async function toggleHabitOnDay(habitId: string, iso: string) {
    const done = completionsByDate.get(iso)?.has(habitId) ?? false;
    if (done) await completionsService.markUndone(habitId, iso);
    else await completionsService.markDone(habitId, iso);
    reload();
  }

  const selectedDoneSet = selected ? completionsByDate.get(selected) ?? new Set<string>() : new Set<string>();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold capitalize">{monthLabel}</h1>
        <MonthNav
          onPrev={() => setCursor((c) => c.month0 === 0 ? { year: c.year - 1, month0: 11 } : { year: c.year, month0: c.month0 - 1 })}
          onToday={() => { const d = new Date(); setCursor({ year: d.getFullYear(), month0: d.getMonth() }); }}
          onNext={() => setCursor((c) => c.month0 === 11 ? { year: c.year + 1, month0: 0 } : { year: c.year, month0: c.month0 + 1 })}
        />
      </div>

      {activeHabits.length === 0 ? (
        <EmptyState icon={<CalendarPlus size={26} strokeWidth={1.5} />} title="Crea un hábito para ver tu calendario" />
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-faint)]">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {cellsForMonth().map((cell, i) =>
              cell.iso ? (
                <button
                  key={cell.iso}
                  onClick={() => setSelected(cell.iso)}
                  className={`aspect-square rounded-lg text-xs font-medium transition-transform hover:scale-105 ${cell.iso === todayIso() ? 'ring-2 ring-brand-500' : ''}`}
                  style={{
                    background: `color-mix(in srgb, var(--color-brand-500) ${Math.round(intensity(cell.iso) * 85)}%, var(--surface-2))`,
                    color: intensity(cell.iso) > 0.5 ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {Number(cell.iso.slice(-2))}
                </button>
              ) : (
                <div key={`empty-${i}`} />
              )
            )}
          </div>
        </Card>
      )}

      {selected && (
        <Card className="mt-4 p-4">
          <h2 className="font-display text-sm font-semibold capitalize">{formatDayLabel(selected)}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {activeHabits.map((h) => {
              const done = selectedDoneSet.has(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabitOnDay(h.id, selected)}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                  style={{ borderColor: done ? h.color : 'var(--border)', background: done ? `color-mix(in srgb, ${h.color} 15%, transparent)` : 'transparent' }}
                >
                  <span style={{ color: h.color }}><HabitIcon name={h.icon} size={16} strokeWidth={2} /></span>
                  <span className="flex-1">{h.name}</span>
                  <span>{done ? <Check size={16} strokeWidth={2.5} /> : <span className="text-[var(--text-faint)]">—</span>}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
