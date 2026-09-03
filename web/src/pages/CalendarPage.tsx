import { useMemo, useState } from 'react';
import { CalendarPlus, Check, Flame, CalendarCheck } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';
import { completionsService } from '../services/completionsService';
import { Card, EmptyState, StatCard } from '../components/ui/primitives';
import { toIsoDate, todayIso, formatDayLabel } from '../utils/dates';
import { HabitIcon } from '../features/habits/habitIcons';
import { MonthNav } from '../components/ui/MonthNav';

function startOfMonth(year: number, month0: number) { return new Date(year, month0, 1); }
function daysInMonth(year: number, month0: number) { return new Date(year, month0 + 1, 0).getDate(); }

export function CalendarPage() {
  const { activeHabits, completions, reload } = useHabits();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [selected, setSelected] = useState<string | null>(todayIso());
  const today = todayIso();

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

  const bestStreak = useMemo(() => activeHabits.reduce((m, h) => Math.max(m, h.currentStreak), 0), [activeHabits]);

  // Días del mes (hasta hoy) con actividad y días "perfectos" (todos cumplidos).
  const monthStats = useMemo(() => {
    let active = 0, perfect = 0;
    for (let day = 1; day <= totalDays; day++) {
      const iso = toIsoDate(new Date(cursor.year, cursor.month0, day));
      if (iso > today) break;
      const done = completionsByDate.get(iso)?.size ?? 0;
      if (done > 0) active++;
      if (activeHabits.length > 0 && done >= activeHabits.length) perfect++;
    }
    return { active, perfect };
  }, [cursor, totalDays, completionsByDate, activeHabits.length, today]);

  function cellsForMonth() {
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= totalDays; day++) cells.push(toIsoDate(new Date(cursor.year, cursor.month0, day)));
    return cells;
  }

  function stats(iso: string) {
    const done = completionsByDate.get(iso)?.size ?? 0;
    const total = activeHabits.length;
    const pct = total > 0 ? done / total : 0;
    return { done, total, pct, perfect: total > 0 && done >= total };
  }

  async function toggleHabitOnDay(habitId: string, iso: string) {
    const done = completionsByDate.get(iso)?.has(habitId) ?? false;
    if (done) await completionsService.markUndone(habitId, iso);
    else await completionsService.markDone(habitId, iso);
    reload();
  }

  const selectedDoneSet = selected ? completionsByDate.get(selected) ?? new Set<string>() : new Set<string>();
  const selectedStats = selected ? stats(selected) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold capitalize">{monthLabel}</h1>
          <p className="text-sm text-[var(--text-muted)]">Tu constancia, día a día.</p>
        </div>
        <MonthNav
          onPrev={() => setCursor((c) => c.month0 === 0 ? { year: c.year - 1, month0: 11 } : { year: c.year, month0: c.month0 - 1 })}
          onToday={() => { const d = new Date(); setCursor({ year: d.getFullYear(), month0: d.getMonth() }); setSelected(todayIso()); }}
          onNext={() => setCursor((c) => c.month0 === 11 ? { year: c.year + 1, month0: 0 } : { year: c.year, month0: c.month0 + 1 })}
        />
      </div>

      {activeHabits.length === 0 ? (
        <EmptyState icon={<CalendarPlus size={26} strokeWidth={1.5} />} title="Crea un hábito para ver tu calendario" />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <StatCard icon={<CalendarCheck size={17} strokeWidth={2} className="text-[var(--text-muted)]" />} value={monthStats.active} label="Días activos" />
            <StatCard accent icon={<Check size={17} strokeWidth={2.5} />} value={monthStats.perfect} label="Días perfectos" />
            <StatCard icon={<Flame size={17} strokeWidth={2} className="text-[var(--color-brand-text)]" />} value={bestStreak} label="Mejor racha" />
          </div>

          <Card className="p-4">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-faint)]">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {cellsForMonth().map((iso, i) => {
                if (!iso) return <div key={`empty-${i}`} />;
                const s = stats(iso);
                const isToday = iso === today;
                const isSel = iso === selected;
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={`relative grid aspect-square place-items-center rounded-lg text-xs font-medium transition-transform hover:scale-105 ${isToday ? 'ring-2 ring-brand-500' : ''} ${isSel && !isToday ? 'ring-2 ring-[var(--color-brand-text)]' : ''}`}
                    style={{
                      background: s.done > 0
                        ? `color-mix(in srgb, var(--color-brand-500) ${Math.round(20 + s.pct * 80)}%, var(--surface-2))`
                        : 'var(--surface-2)',
                      color: s.pct > 0.45 ? '#fff' : 'var(--text-muted)',
                    }}
                    title={`${s.done}/${s.total} hábitos`}
                  >
                    {Number(iso.slice(-2))}
                    {s.perfect && <span className="absolute bottom-1 right-1 grid h-3 w-3 place-items-center rounded-full bg-white/90"><Check size={9} strokeWidth={3} className="text-[var(--color-brand-600)]" /></span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-[var(--surface-2)]" /> Sin actividad</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: 'color-mix(in srgb, var(--color-brand-500) 55%, var(--surface-2))' }} /> Parcial</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-500" /> Completo</span>
            </div>
          </Card>
        </>
      )}

      {selected && activeHabits.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold capitalize">{formatDayLabel(selected)}</h2>
            {selectedStats && <span className="text-xs text-[var(--text-muted)]">{selectedStats.done}/{selectedStats.total} cumplidos</span>}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {activeHabits.map((h) => {
              const done = selectedDoneSet.has(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabitOnDay(h.id, selected)}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  style={{ borderColor: done ? h.color : 'var(--border)', background: done ? `color-mix(in srgb, ${h.color} 15%, transparent)` : 'transparent' }}
                >
                  <span style={{ color: h.color }}><HabitIcon name={h.icon} size={16} strokeWidth={2} /></span>
                  <span className="flex-1">{h.name}</span>
                  {done
                    ? <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: h.color }}><Check size={13} strokeWidth={3} /></span>
                    : <span className="text-[var(--text-faint)]">—</span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
