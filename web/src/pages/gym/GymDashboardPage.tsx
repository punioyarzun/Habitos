import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, Flame, Clock, CalendarClock, Play, History, ListChecks, TrendingUp } from 'lucide-react';
import { useRoutines } from '../../hooks/useRoutines';
import { useWorkouts } from '../../hooks/useWorkouts';
import { gymService } from '../../services/gymService';
import type { RoutineWithDays } from '../../types/domain';
import { Card, EmptyState, Skeleton, StatCard, ProgressBar } from '../../components/ui/primitives';
import { Button } from '../../components/ui/Button';
import { computeGymStats } from '../../utils/gymStats';
import { formatDuration } from '../../utils/time';
import { formatDateShort, todayIso } from '../../utils/dates';
import { WEEKDAY_LABELS_LONG } from '../../utils/reminders';
import { ROUTINE_TYPE_LABELS } from '../../features/gym/gymConstants';

export function GymDashboardPage() {
  const navigate = useNavigate();
  const { activeRoutine, loading: loadingRoutines } = useRoutines();
  const { sessions, loading: loadingSessions } = useWorkouts();
  const [activeDetail, setActiveDetail] = useState<RoutineWithDays | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (activeRoutine) {
      gymService.getRoutineWithDays(activeRoutine.id).then((r) => { if (!cancelled) setActiveDetail(r); }).catch(() => {});
    } else {
      setActiveDetail(null);
    }
    return () => { cancelled = true; };
  }, [activeRoutine]);

  const trainingDays = useMemo(() => (activeDetail?.days ?? []).filter((d) => !d.is_rest), [activeDetail]);
  const stats = useMemo(() => computeGymStats(sessions, todayIso(), trainingDays.length || 3), [sessions, trainingDays.length]);

  // Día programado para hoy (según weekday de la rutina activa).
  const todayWeekday = new Date().getDay();
  const todaysDay = useMemo(
    () => (activeDetail?.days ?? []).find((d) => d.weekday === todayWeekday) ?? null,
    [activeDetail, todayWeekday]
  );
  // Próximo día de entrenamiento programado (no descanso).
  const nextDay = useMemo(() => {
    if (trainingDays.length === 0) return null;
    for (let i = 0; i < 7; i++) {
      const wd = (todayWeekday + i) % 7;
      const d = trainingDays.find((x) => x.weekday === wd);
      if (d) return { day: d, inDays: i };
    }
    return null;
  }, [trainingDays, todayWeekday]);

  const loading = loadingRoutines || loadingSessions;

  if (loading) {
    return <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  }

  if (!activeRoutine && sessions.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={28} strokeWidth={1.5} />}
        title="Empieza tu entrenamiento"
        description="Elige una rutina prediseñada o crea la tuya para registrar tu progreso deportivo."
        action={<Link to="/gimnasio/rutinas"><Button icon={<ListChecks size={16} strokeWidth={2} />}>Ver rutinas</Button></Link>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* CTA principal — entrenar */}
      <Card className="flex flex-col gap-3 border-brand-500/30 bg-brand-500/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Entrenar hoy</p>
          <p className="mt-0.5 font-display text-lg font-semibold">
            {todaysDay && !todaysDay.is_rest ? todaysDay.name : todaysDay?.is_rest ? 'Día de descanso' : nextDay ? `Toca: ${nextDay.day.name}` : 'Entrenamiento libre'}
          </p>
          {activeRoutine && <p className="truncate text-sm text-[var(--text-muted)]">Rutina activa: {activeRoutine.name}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {todaysDay && !todaysDay.is_rest ? (
            <Button icon={<Play size={16} strokeWidth={2} />} onClick={() => navigate(`/gimnasio/entrenar/${todaysDay.id}`)}>Empezar</Button>
          ) : nextDay ? (
            <Button icon={<Play size={16} strokeWidth={2} />} onClick={() => navigate(`/gimnasio/entrenar/${nextDay.day.id}`)}>Empezar {nextDay.day.name}</Button>
          ) : (
            <Button icon={<Play size={16} strokeWidth={2} />} onClick={() => navigate('/gimnasio/entrenar')}>Entrenamiento libre</Button>
          )}
        </div>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard accent icon={<Dumbbell size={18} strokeWidth={2} />} value={stats.workoutsThisWeek} label="Esta semana" />
        <StatCard icon={<Flame size={18} strokeWidth={2} className="text-[var(--color-brand-text)]" />} value={stats.currentStreakDays} label="Días seguidos" />
        <StatCard value={stats.totalWorkouts} label="Entrenamientos totales" />
        <StatCard icon={<Clock size={16} strokeWidth={2} className="text-[var(--text-muted)]" />} value={formatDuration(stats.avgSeconds)} label="Duración media" />
      </div>

      {/* Progreso semanal */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Progreso semanal</span>
          <span className="text-[var(--text-muted)]">{stats.workoutsThisWeek} / {stats.weekTarget} días</span>
        </div>
        <ProgressBar pct={stats.weekProgressPct} />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Último entrenamiento */}
        <Card className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium"><History size={15} strokeWidth={2} className="text-[var(--text-muted)]" /> Último entrenamiento</p>
          {stats.lastWorkout ? (
            <div>
              <p className="font-display font-semibold">{stats.lastWorkout.name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {formatDateShort(stats.lastWorkout.performed_date)} · {formatDuration(stats.lastWorkout.duration_seconds)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Aún no registras entrenamientos.</p>
          )}
        </Card>

        {/* Próximo programado */}
        <Card className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium"><CalendarClock size={15} strokeWidth={2} className="text-[var(--text-muted)]" /> Próximo programado</p>
          {nextDay ? (
            <div>
              <p className="font-display font-semibold">{nextDay.day.name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {nextDay.inDays === 0 ? 'Hoy' : nextDay.inDays === 1 ? 'Mañana' : nextDay.day.weekday !== null ? WEEKDAY_LABELS_LONG[nextDay.day.weekday] : `En ${nextDay.inDays} días`}
              </p>
            </div>
          ) : activeRoutine ? (
            <p className="text-sm text-[var(--text-muted)]">Sin días con horario. Asigna días a tu rutina.</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No hay rutina activa.</p>
          )}
        </Card>
      </div>

      {/* Rutina activa resumen */}
      {activeRoutine && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display font-semibold">
                {activeRoutine.name}
                <span className="rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand-text)]">Activa</span>
              </p>
              <p className="text-sm text-[var(--text-muted)]">{ROUTINE_TYPE_LABELS[activeRoutine.type]} · {trainingDays.length} días de entrenamiento</p>
            </div>
            <Link to={`/gimnasio/rutinas/${activeRoutine.id}`} className="shrink-0 text-sm text-[var(--color-brand-text)] hover:underline">Editar →</Link>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/gimnasio/rutinas"><Button variant="secondary" icon={<ListChecks size={16} strokeWidth={2} />}>Rutinas</Button></Link>
        <Link to="/gimnasio/progreso"><Button variant="secondary" icon={<TrendingUp size={16} strokeWidth={2} />}>Ver progreso</Button></Link>
      </div>
    </div>
  );
}
