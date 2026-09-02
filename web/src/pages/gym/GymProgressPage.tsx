import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { TrendingUp, Dumbbell, Flame, Layers } from 'lucide-react';
import { useWorkouts } from '../../hooks/useWorkouts';
import { Card, EmptyState, Skeleton, StatCard } from '../../components/ui/primitives';
import { computeGymStats, topExercises, exerciseProgress, weekStartIso, totalVolume } from '../../utils/gymStats';
import { addDays, todayIso } from '../../utils/dates';

export function GymProgressPage() {
  const { sessions, setLogs, loading } = useWorkouts();
  const [exercise, setExercise] = useState<string>('');

  const stats = useMemo(() => computeGymStats(sessions, todayIso()), [sessions]);

  const monthCount = useMemo(() => {
    const monthStart = todayIso().slice(0, 7);
    return sessions.filter((s) => s.performed_date.startsWith(monthStart)).length;
  }, [sessions]);

  const volume = useMemo(() => totalVolume(setLogs), [setLogs]);

  // Entrenamientos por semana (últimas 12 semanas).
  const weekly = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sessions) {
      const wk = weekStartIso(s.performed_date);
      const set = map.get(wk) ?? new Set<string>();
      set.add(s.performed_date);
      map.set(wk, set);
    }
    const weeks: { label: string; count: number }[] = [];
    let cursor = weekStartIso(addDays(todayIso(), -7 * 11));
    const end = weekStartIso(todayIso());
    for (let i = 0; i < 52 && cursor <= end; i++) {
      weeks.push({ label: cursor.slice(5), count: map.get(cursor)?.size ?? 0 });
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [sessions]);

  const top = useMemo(() => topExercises(setLogs, 6), [setLogs]);
  const exerciseNames = useMemo(() => Array.from(new Set(setLogs.map((s) => s.exercise_name))).sort(), [setLogs]);
  const selected = exercise || top[0]?.name || exerciseNames[0] || '';
  const progressData = useMemo(() => exerciseProgress(setLogs, sessions, selected).map((p) => ({ ...p, label: p.date.slice(5) })), [setLogs, sessions, selected]);

  if (loading) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-24" /><Skeleton className="h-52" /></div>;
  }
  if (sessions.length === 0) {
    return <EmptyState icon={<TrendingUp size={26} strokeWidth={1.5} />} title="Sin datos de progreso todavía" description="Registra tu primer entrenamiento para ver tu evolución aquí." />;
  }

  const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard accent icon={<Dumbbell size={18} strokeWidth={2} />} value={stats.totalWorkouts} label="Entrenamientos" />
        <StatCard value={monthCount} label="Este mes" />
        <StatCard icon={<Flame size={18} strokeWidth={2} className="text-[var(--color-brand-text)]" />} value={stats.currentStreakDays} label="Días seguidos" />
        <StatCard icon={<Layers size={16} strokeWidth={2} className="text-[var(--text-muted)]" />} value={`${Math.round(volume).toLocaleString('es-CL')} kg`} label="Volumen total" />
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Entrenamientos por semana</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} width={28} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}`, 'Días'] as [string, string]} />
            <Bar dataKey="count" name="Días" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {exerciseNames.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--text-muted)]">Evolución por ejercicio</p>
            <select value={selected} onChange={(e) => setExercise(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm">
              {exerciseNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {progressData.length < 2 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Necesitas al menos 2 sesiones con «{selected}» para ver la evolución.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} width={40} unit=" kg" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)} kg`, 'Peso máx.'] as [string, string]} />
                <Line type="monotone" dataKey="maxWeight" stroke="var(--color-brand-500)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Ejercicios más realizados</p>
        {top.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Sin datos.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {top.map((t) => {
              const max = top[0].count || 1;
              return (
                <div key={t.name} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate">{t.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((t.count / max) * 100)}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-[var(--text-muted)]">{t.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
