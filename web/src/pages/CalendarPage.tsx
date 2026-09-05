import { useMemo, useState } from 'react';
import { CalendarPlus, Check, Flame, CalendarCheck } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';
import { completionsService } from '../services/completionsService';
import { Card, EmptyState, StatCard } from '../components/ui/primitives';
import { Tabs } from '../components/ui/Tabs';
import { MonthNav } from '../components/ui/MonthNav';
import { toIsoDate, todayIso, formatDayLabel, addDays } from '../utils/dates';
import { HabitIcon } from '../features/habits/habitIcons';

function parse(iso: string) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function weekdayOf(iso: string) { return parse(iso).getDay(); }
function daysInMonth(year: number, month0: number) { return new Date(year, month0 + 1, 0).getDate(); }
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

type View = 'semana' | 'mes';

export function CalendarPage() {
  const { activeHabits, completions, reload } = useHabits();
  const [view, setView] = useState<View>('semana');
  const [anchor, setAnchor] = useState(todayIso()); // día de referencia (semana/mes)
  const [selected, setSelected] = useState(todayIso());
  const today = todayIso();

  const completionsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!map.has(c.completed_date)) map.set(c.completed_date, new Set());
      map.get(c.completed_date)!.add(c.habit_id);
    }
    return map;
  }, [completions]);

  const bestStreak = useMemo(() => activeHabits.reduce((m, h) => Math.max(m, h.currentStreak), 0), [activeHabits]);

  async function toggle(habitId: string, iso: string) {
    if (iso > today) return; // no se marcan días futuros
    const done = completionsByDate.get(iso)?.has(habitId) ?? false;
    if (done) await completionsService.markUndone(habitId, iso);
    else await completionsService.markDone(habitId, iso);
    reload();
  }

  // ---------- Semana ----------
  const weekDays = useMemo(() => {
    const sunday = addDays(anchor, -weekdayOf(anchor));
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  }, [anchor]);

  const weekLabel = `${parse(weekDays[0]).toLocaleDateString('es-CL', { day: 'numeric' })} – ${parse(weekDays[6]).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`;

  function dayDoneCount(iso: string) { return activeHabits.filter((h) => completionsByDate.get(iso)?.has(h.id)).length; }

  // ---------- Mes ----------
  const cursor = { year: parse(anchor).getFullYear(), month0: parse(anchor).getMonth() };
  const monthLabel = new Date(cursor.year, cursor.month0, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const firstWeekday = new Date(cursor.year, cursor.month0, 1).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month0);

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
  }, [cursor.year, cursor.month0, totalDays, completionsByDate, activeHabits.length, today]);

  function monthCells() {
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= totalDays; day++) cells.push(toIsoDate(new Date(cursor.year, cursor.month0, day)));
    return cells;
  }
  function dayStats(iso: string) {
    const done = completionsByDate.get(iso)?.size ?? 0;
    const total = activeHabits.length;
    return { done, total, pct: total > 0 ? done / total : 0, perfect: total > 0 && done >= total };
  }

  const selectedStats = dayStats(selected);
  const selectedDoneSet = completionsByDate.get(selected) ?? new Set<string>();

  if (activeHabits.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 font-display text-xl font-semibold">Calendario</h1>
        <EmptyState icon={<CalendarPlus size={26} strokeWidth={1.5} />} title="Crea un hábito para ver tu avance" description="Aquí verás, día a día, qué hábitos cumpliste." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="font-display text-xl font-semibold">Calendario</h1>
        <p className="text-sm text-[var(--text-muted)]">Tu constancia, día a día.</p>
      </div>

      <Tabs
        items={[{ key: 'semana', label: 'Semana' }, { key: 'mes', label: 'Mes' }]}
        value={view}
        onChange={setView}
        className="mb-4 w-fit"
      />

      {view === 'semana' ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-base font-semibold capitalize">{weekLabel}</p>
            <MonthNav onPrev={() => setAnchor((a) => addDays(a, -7))} onToday={() => setAnchor(today)} onNext={() => setAnchor((a) => addDays(a, 7))} />
          </div>

          <Card className="overflow-x-auto p-3 scrollbar-thin">
            <div className="min-w-[320px]">
              {/* Encabezado de días */}
              <div className="flex items-stretch gap-1.5 pb-2">
                <div className="w-24 shrink-0 sm:w-44" />
                <div className="grid flex-1 grid-cols-7 gap-1">
                  {weekDays.map((iso) => {
                    const isToday = iso === today;
                    return (
                      <div key={iso} className="flex flex-col items-center">
                        <span className="text-[10px] font-medium text-[var(--text-faint)]">{DOW[weekdayOf(iso)]}</span>
                        <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${isToday ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)]'}`}>
                          {Number(iso.slice(-2))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="w-9 shrink-0 self-end pb-1 text-center text-[10px] font-medium text-[var(--text-faint)]">Racha</div>
              </div>

              {/* Filas de hábitos con checkboxes */}
              <div className="flex flex-col divide-y divide-[var(--border)]">
                {activeHabits.map((h) => (
                  <div key={h.id} className="flex items-center gap-1.5 py-2">
                    <div className="flex w-24 shrink-0 sm:w-44 items-center gap-1.5">
                      <span className="shrink-0" style={{ color: h.color }}><HabitIcon name={h.icon} size={15} strokeWidth={2} /></span>
                      <span className="truncate text-xs font-medium" title={h.name}>{h.name}</span>
                    </div>
                    <div className="grid flex-1 grid-cols-7 gap-1">
                      {weekDays.map((iso) => {
                        const done = completionsByDate.get(iso)?.has(h.id) ?? false;
                        const disabled = iso > today || iso < h.start_date;
                        return (
                          <button
                            key={iso}
                            disabled={disabled}
                            onClick={() => toggle(h.id, iso)}
                            aria-label={`${h.name} · ${iso}`}
                            aria-pressed={done}
                            className={`grid h-9 w-full place-items-center rounded-md border transition-colors sm:h-10 ${disabled ? 'cursor-default border-transparent' : ''}`}
                            style={{
                              borderColor: done ? h.color : disabled ? 'transparent' : 'var(--border)',
                              background: done ? h.color : disabled ? 'color-mix(in srgb, var(--surface-2) 50%, transparent)' : 'transparent',
                              color: '#fff',
                            }}
                          >
                            {done ? <Check size={13} strokeWidth={3} /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex w-9 shrink-0 items-center justify-center gap-0.5 text-xs font-semibold" style={{ color: h.currentStreak > 0 ? 'var(--color-brand-text)' : 'var(--text-faint)' }}>
                      <Flame size={12} strokeWidth={2} className={h.currentStreak > 0 ? 'animate-flame' : ''} />{h.currentStreak}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales por día */}
              <div className="flex items-center gap-1.5 border-t border-[var(--border)] pt-2">
                <div className="w-24 shrink-0 sm:w-44 text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Total</div>
                <div className="grid flex-1 grid-cols-7 gap-1">
                  {weekDays.map((iso) => {
                    const n = dayDoneCount(iso);
                    const perfect = n >= activeHabits.length;
                    return (
                      <div key={iso} className={`text-center text-[11px] font-semibold tabular-nums ${iso > today ? 'text-[var(--text-faint)]' : perfect ? 'text-[var(--color-brand-text)]' : 'text-[var(--text-muted)]'}`}>
                        {iso > today ? '·' : `${n}/${activeHabits.length}`}
                      </div>
                    );
                  })}
                </div>
                <div className="w-9 shrink-0" />
              </div>
            </div>
          </Card>

          <p className="mt-3 text-center text-xs text-[var(--text-muted)]">Toca una casilla para marcar o desmarcar el hábito ese día.</p>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-base font-semibold capitalize">{monthLabel}</p>
            <MonthNav
              onPrev={() => setAnchor(toIsoDate(new Date(cursor.year, cursor.month0 - 1, 1)))}
              onToday={() => { setAnchor(today); setSelected(today); }}
              onNext={() => setAnchor(toIsoDate(new Date(cursor.year, cursor.month0 + 1, 1)))}
            />
          </div>

          <div className="mb-3 grid grid-cols-3 gap-3">
            <StatCard icon={<CalendarCheck size={17} strokeWidth={2} className="text-[var(--text-muted)]" />} value={monthStats.active} label="Días activos" />
            <StatCard accent icon={<Check size={17} strokeWidth={2.5} />} value={monthStats.perfect} label="Días perfectos" />
            <StatCard icon={<Flame size={17} strokeWidth={2} className="text-[var(--color-brand-text)]" />} value={bestStreak} label="Mejor racha" />
          </div>

          <Card className="p-4">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-faint)]">
              {DOW.map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {monthCells().map((iso, i) => {
                if (!iso) return <div key={`empty-${i}`} />;
                const s = dayStats(iso);
                const isToday = iso === today;
                const isSel = iso === selected;
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={`relative grid aspect-square place-items-center rounded-lg text-xs font-medium transition-transform hover:scale-105 ${isToday ? 'ring-2 ring-brand-500' : ''} ${isSel && !isToday ? 'ring-2 ring-[var(--color-brand-text)]' : ''}`}
                    style={{
                      background: s.done > 0 ? `color-mix(in srgb, var(--color-brand-500) ${Math.round(20 + s.pct * 80)}%, var(--surface-2))` : 'var(--surface-2)',
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
          </Card>

          <Card className="mt-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold capitalize">{formatDayLabel(selected)}</h2>
              <span className="text-xs text-[var(--text-muted)]">{selectedStats.done}/{selectedStats.total} cumplidos</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {activeHabits.map((h) => {
                const done = selectedDoneSet.has(h.id);
                const disabled = selected > today || selected < h.start_date;
                return (
                  <button
                    key={h.id}
                    disabled={disabled}
                    onClick={() => toggle(h.id, selected)}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50"
                    style={{ borderColor: done ? h.color : 'var(--border)', background: done ? `color-mix(in srgb, ${h.color} 15%, transparent)` : 'transparent' }}
                  >
                    <span style={{ color: h.color }}><HabitIcon name={h.icon} size={16} strokeWidth={2} /></span>
                    <span className="flex-1">{h.name}</span>
                    {done
                      ? <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: h.color }}><Check size={13} strokeWidth={3} /></span>
                      : <span className="grid h-5 w-5 place-items-center rounded-full border border-[var(--border)]" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
