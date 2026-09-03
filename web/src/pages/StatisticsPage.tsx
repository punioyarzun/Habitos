import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useHabits } from '../hooks/useHabits';
import { financeService } from '../services/financeService';
import type { FinancialTransaction, FinancialCategory } from '../types/domain';
import { Card, EmptyState, Skeleton } from '../components/ui/primitives';
import { BarChart3, Receipt, Trophy } from 'lucide-react';
import { formatCLP } from '../utils/currency';
import { addDays, todayIso } from '../utils/dates';
import { completionRateInRange, scheduledAndDoneInRange } from '../utils/streaks';
import { HabitIcon } from '../features/habits/habitIcons';

type Period = '30d' | '3m' | '6m' | '1y';
const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '30d', label: '30 días', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
  { key: '1y', label: '1 año', days: 365 },
];

const PIE_COLORS = ['#c9564f', '#c98a2e', '#6f8fae', '#8b7bb0', '#4f9d6e', '#b9713f', '#7a9aa8', '#a874a8'];

export function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('3m');
  const { habits, completions, loading: loadingHabits } = useHabits();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  const days = PERIODS.find((p) => p.key === period)!.days;
  const end = todayIso();
  const start = addDays(end, -(days - 1));

  useEffect(() => {
    setLoadingTx(true);
    Promise.all([financeService.listTransactions(start, end), financeService.listCategories()])
      .then(([tx, cats]) => { setTransactions(tx); setCategories(cats); })
      .finally(() => setLoadingTx(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // ---- Hábitos: evolución semanal de % de cumplimiento (todos los hábitos activos combinados) ----
  // Usa suma(cumplidos)/suma(programados) por semana, no un promedio simple
  // de porcentajes — así una semana con pocos días programados no pesa igual
  // que una con muchos, y semanas anteriores a que el hábito existiera
  // (0 programados) no cuentan como "0% de cumplimiento".
  const weeklyHabitData = useMemo(() => {
    const active = habits.filter((h) => h.status === 'active');
    if (active.length === 0) return [];
    const completedByHabit = new Map<string, string[]>();
    for (const c of completions) {
      const arr = completedByHabit.get(c.habit_id) ?? [];
      arr.push(c.completed_date);
      completedByHabit.set(c.habit_id, arr);
    }
    const weeks: { label: string; rate: number }[] = [];
    let cursor = start;
    while (cursor <= end) {
      const weekEnd = addDays(cursor, 6) > end ? end : addDays(cursor, 6);
      let scheduled = 0, done = 0;
      for (const h of active) {
        const r = scheduledAndDoneInRange(completedByHabit.get(h.id) ?? [], h.active_days, cursor, weekEnd, h.start_date);
        scheduled += r.scheduled;
        done += r.done;
      }
      weeks.push({ label: cursor.slice(5), rate: scheduled > 0 ? Math.round((done / scheduled) * 100) : 0 });
      cursor = addDays(weekEnd, 1);
    }
    return weeks;
  }, [habits, completions, start, end]);

  const habitRanking = useMemo(() => {
    const active = habits.filter((h) => h.status === 'active');
    const completedByHabit = new Map<string, string[]>();
    for (const c of completions) {
      const arr = completedByHabit.get(c.habit_id) ?? [];
      arr.push(c.completed_date);
      completedByHabit.set(c.habit_id, arr);
    }
    return active
      .map((h) => ({
        ...h,
        periodRate: completionRateInRange(completedByHabit.get(h.id) ?? [], h.active_days, start, end, h.start_date),
      }))
      .sort((a, b) => b.periodRate - a.periodRate);
  }, [habits, completions, start, end]);

  // % general del período completo: mismo criterio suma(cumplidos)/suma(programados),
  // consistente con el ranking de arriba (antes se promediaban los % semanales ya
  // diluidos, lo que subestimaba mucho el cumplimiento de hábitos recientes).
  const overallHabitPct = useMemo(() => {
    const active = habits.filter((h) => h.status === 'active');
    const completedByHabit = new Map<string, string[]>();
    for (const c of completions) {
      const arr = completedByHabit.get(c.habit_id) ?? [];
      arr.push(c.completed_date);
      completedByHabit.set(c.habit_id, arr);
    }
    let scheduled = 0, done = 0;
    for (const h of active) {
      const r = scheduledAndDoneInRange(completedByHabit.get(h.id) ?? [], h.active_days, start, end, h.start_date);
      scheduled += r.scheduled;
      done += r.done;
    }
    return scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
  }, [habits, completions, start, end]);

  // ---- Finanzas ----
  const finTotals = useMemo(() => {
    let ingresos = 0, gastos = 0;
    for (const t of transactions) {
      if (t.type === 'ingreso') ingresos += Number(t.amount);
      else gastos += Number(t.amount);
    }
    return { ingresos, gastos, balance: ingresos - gastos };
  }, [transactions]);

  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'gasto') continue;
      const name = categories.find((c) => c.id === t.category_id)?.name ?? 'Otro gasto';
      map.set(name, (map.get(name) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  const monthlyFinance = useMemo(() => {
    const map = new Map<string, { ingreso: number; gasto: number }>();
    for (const t of transactions) {
      const key = t.transaction_date.slice(0, 7); // YYYY-MM
      const cur = map.get(key) ?? { ingreso: 0, gasto: 0 };
      if (t.type === 'ingreso') cur.ingreso += Number(t.amount); else cur.gasto += Number(t.amount);
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, v]) => ({ month, ...v }));
  }, [transactions]);

  const topCategory = gastosPorCategoria[0];
  const avgGasto = transactions.filter((t) => t.type === 'gasto').length
    ? finTotals.gastos / transactions.filter((t) => t.type === 'gasto').length
    : 0;

  const loading = loadingHabits || loadingTx;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">Estadísticas</h1>
        <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1 text-sm">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className={`rounded-md px-3 py-1.5 font-medium ${period === p.key ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)]'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <>
          <h2 className="mb-2 font-display text-base font-semibold">Hábitos</h2>
          {habits.filter((h) => h.status === 'active').length === 0 ? (
            <EmptyState icon={<BarChart3 size={26} strokeWidth={1.5} />} title="Crea hábitos para ver estadísticas" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-4"><p className="text-xl font-display font-bold text-[var(--color-brand-text)]">{overallHabitPct}%</p><p className="text-xs text-[var(--text-muted)]">Cumplimiento general</p></Card>
                <Card className="p-4"><p className="text-xl font-display font-bold">{habitRanking[0]?.name ?? '—'}</p><p className="text-xs text-[var(--text-muted)]">Hábito más consistente</p></Card>
                <Card className="p-4"><p className="text-xl font-display font-bold">{habitRanking.at(-1)?.name ?? '—'}</p><p className="text-xs text-[var(--text-muted)]">Le cuesta más</p></Card>
                <Card className="p-4"><p className="flex items-center gap-1.5 text-xl font-display font-bold"><Trophy size={17} strokeWidth={2} className="text-[var(--color-brand-text)]" />{Math.max(0, ...habits.map((h) => h.bestStreak))}</p><p className="text-xs text-[var(--text-muted)]">Mejor racha histórica</p></Card>
              </div>

              <Card className="mt-3 p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Evolución semanal de cumplimiento</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weeklyHabitData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} unit="%" width={38} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${Number(v)}%`, 'Cumplimiento'] as [string, string]} />
                    <Line type="monotone" dataKey="rate" stroke="var(--color-brand-500)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="mt-3 p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Ranking de consistencia</p>
                <div className="flex flex-col gap-2">
                  {habitRanking.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 text-sm">
                      <span style={{ color: h.color }}><HabitIcon name={h.icon} size={16} strokeWidth={2} /></span>
                      <span className="w-32 shrink-0 truncate">{h.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(h.periodRate * 100)}%`, background: h.color }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-[var(--text-muted)]">{Math.round(h.periodRate * 100)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          <h2 className="mb-2 mt-8 font-display text-base font-semibold">Finanzas</h2>
          {transactions.length === 0 ? (
            <EmptyState icon={<Receipt size={26} strokeWidth={1.5} />} title="Sin movimientos en este período" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-4"><p className="text-lg font-display font-bold text-[var(--color-money-in-text)]">{formatCLP(finTotals.ingresos)}</p><p className="text-xs text-[var(--text-muted)]">Ingresos totales</p></Card>
                <Card className="p-4"><p className="text-lg font-display font-bold text-[var(--color-money-out-text)]">{formatCLP(finTotals.gastos)}</p><p className="text-xs text-[var(--text-muted)]">Gastos totales</p></Card>
                <Card className="p-4"><p className="text-lg font-display font-bold">{formatCLP(avgGasto)}</p><p className="text-xs text-[var(--text-muted)]">Gasto promedio</p></Card>
                <Card className="p-4"><p className="text-lg font-display font-bold truncate">{topCategory?.name ?? '—'}</p><p className="text-xs text-[var(--text-muted)]">Mayor gasto: {topCategory ? formatCLP(topCategory.value) : '—'}</p></Card>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Card className="p-4">
                  <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Gastos por categoría</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={gastosPorCategoria} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {gastosPorCategoria.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCLP(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4">
                  <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Ingresos vs. gastos por mes</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyFinance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} width={50} />
                      <Tooltip formatter={(v) => formatCLP(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="ingreso" name="Ingresos" fill="var(--color-money-in)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gasto" name="Gastos" fill="var(--color-money-out)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
