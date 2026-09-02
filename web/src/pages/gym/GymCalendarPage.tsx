import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Trash2, ChevronDown } from 'lucide-react';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useRoutines } from '../../hooks/useRoutines';
import { gymService } from '../../services/gymService';
import { workoutService } from '../../services/workoutService';
import type { WorkoutSessionWithSets } from '../../types/domain';
import { Card, EmptyState } from '../../components/ui/primitives';
import { toIsoDate, todayIso, formatDayLabel } from '../../utils/dates';
import { formatDuration } from '../../utils/time';

function daysInMonth(year: number, month0: number) { return new Date(year, month0 + 1, 0).getDate(); }

export function GymCalendarPage() {
  const { sessions, removeSession } = useWorkouts();
  const { activeRoutine } = useRoutines();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, WorkoutSessionWithSets>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restWeekdays, setRestWeekdays] = useState<Set<number>>(new Set());
  const [trainWeekdays, setTrainWeekdays] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!activeRoutine) { setRestWeekdays(new Set()); setTrainWeekdays(new Set()); return; }
    gymService.getRoutineWithDays(activeRoutine.id).then((r) => {
      if (!r) return;
      const rest = new Set<number>(); const train = new Set<number>();
      for (const d of r.days) if (d.weekday !== null) (d.is_rest ? rest : train).add(d.weekday);
      setRestWeekdays(rest); setTrainWeekdays(train);
    }).catch(() => {});
  }, [activeRoutine]);

  const monthLabel = new Date(cursor.year, cursor.month0, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const firstWeekday = new Date(cursor.year, cursor.month0, 1).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month0);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const arr = map.get(s.performed_date) ?? [];
      arr.push(s);
      map.set(s.performed_date, arr);
    }
    return map;
  }, [sessions]);

  function cells() {
    const out: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= totalDays; d++) out.push(toIsoDate(new Date(cursor.year, cursor.month0, d)));
    return out;
  }

  async function toggleExpand(sessionId: string) {
    if (expanded === sessionId) { setExpanded(null); return; }
    setExpanded(sessionId);
    if (!details[sessionId]) {
      const full = await workoutService.getSessionWithSets(sessionId);
      if (full) setDetails((prev) => ({ ...prev, [sessionId]: full }));
    }
  }

  const selectedSessions = selected ? sessionsByDate.get(selected) ?? [] : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold capitalize">{monthLabel}</h2>
        <div className="flex gap-1">
          <button onClick={() => setCursor((c) => c.month0 === 0 ? { year: c.year - 1, month0: 11 } : { year: c.year, month0: c.month0 - 1 })} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">‹</button>
          <button onClick={() => { const d = new Date(); setCursor({ year: d.getFullYear(), month0: d.getMonth() }); }} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)]">Hoy</button>
          <button onClick={() => setCursor((c) => c.month0 === 11 ? { year: c.year + 1, month0: 0 } : { year: c.year, month0: c.month0 + 1 })} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">›</button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-faint)]">
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells().map((iso, i) => {
            if (!iso) return <div key={`e-${i}`} />;
            const trained = (sessionsByDate.get(iso)?.length ?? 0) > 0;
            const wd = new Date(cursor.year, cursor.month0, Number(iso.slice(-2))).getDay();
            const scheduled = !trained && trainWeekdays.has(wd) && iso >= todayIso();
            const rest = !trained && restWeekdays.has(wd);
            return (
              <button
                key={iso}
                onClick={() => { setSelected(iso); setExpanded(null); }}
                className={`relative aspect-square rounded-lg text-xs font-medium transition-transform hover:scale-105 ${iso === todayIso() ? 'ring-2 ring-brand-500' : ''} ${selected === iso ? 'ring-2 ring-[var(--color-brand-text)]' : ''}`}
                style={{
                  background: trained ? 'var(--color-brand-500)' : 'var(--surface-2)',
                  color: trained ? 'var(--color-brand-ink)' : 'var(--text-muted)',
                }}
              >
                {Number(iso.slice(-2))}
                {scheduled && <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-[var(--color-brand-text)]" />}
                {rest && <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-[var(--text-faint)]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-500" /> Entrenado</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-text)]" /> Programado</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--text-faint)]" /> Descanso</span>
        </div>
      </Card>

      {selected && (
        <Card className="mt-4 p-4">
          <h3 className="font-display text-sm font-semibold capitalize">{formatDayLabel(selected)}</h3>
          {selectedSessions.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Sin entrenamientos este día.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {selectedSessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-[var(--border)]">
                  <div className="flex items-center gap-2 p-3">
                    <button onClick={() => toggleExpand(s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <ChevronDown size={15} strokeWidth={2} className={`shrink-0 text-[var(--text-faint)] transition-transform ${expanded === s.id ? 'rotate-180' : ''}`} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]"><Clock size={11} strokeWidth={2} /> {formatDuration(s.duration_seconds)}</span>
                      </span>
                    </button>
                    <button onClick={() => removeSession(s.id)} className="shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--color-danger-text)]" aria-label="Eliminar entrenamiento"><Trash2 size={14} strokeWidth={2} /></button>
                  </div>
                  {expanded === s.id && details[s.id] && (
                    <div className="border-t border-[var(--border)] p-3 text-sm">
                      {(() => {
                        const byEx = new Map<string, { reps: number; weight: number }[]>();
                        for (const set of details[s.id].sets) {
                          const arr = byEx.get(set.exercise_name) ?? [];
                          arr.push({ reps: set.reps, weight: set.weight });
                          byEx.set(set.exercise_name, arr);
                        }
                        return Array.from(byEx.entries()).map(([name, sets]) => (
                          <div key={name} className="mb-2 last:mb-0">
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{sets.map((x) => `${x.weight || 0}kg×${x.reps}`).join('  ·  ')}</p>
                          </div>
                        ));
                      })()}
                      {details[s.id].notes && <p className="mt-2 text-xs italic text-[var(--text-muted)]">{details[s.id].notes}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {sessions.length === 0 && !selected && (
        <div className="mt-4"><EmptyState icon={<CalendarDays size={26} strokeWidth={1.5} />} title="Aún no hay entrenamientos registrados" /></div>
      )}
    </div>
  );
}
