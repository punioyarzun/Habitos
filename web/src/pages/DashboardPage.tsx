import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../hooks/useAuth';
import { HabitCard } from '../features/habits/HabitCard';
import { Card, EmptyState, Skeleton } from '../components/ui/primitives';
import { Sparkles, Flame, Feather } from 'lucide-react';
import { formatCLP } from '../utils/currency';
import { formatDayLabel, todayIso } from '../utils/dates';

const TIPS = [
  'La constancia vence a la intensidad. Un día a la vez.',
  'No necesitas ser perfecto, necesitas ser constante.',
  'Cada hábito que marcas hoy es un voto por la persona que quieres ser.',
  'El progreso no siempre se ve, pero se acumula.',
  'Menos motivación, más sistema.',
];

function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  const cur = Date.UTC(y, m - 1, d);
  return Math.round((cur - start) / 86400000) + 1;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { activeHabits, loading, toggleToday, categoryNameById } = useHabits();
  const now = new Date();
  const { summary, loading: loadingTx } = useTransactions(now.getFullYear(), now.getMonth());
  const today = todayIso();

  const tip = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return TIPS[dayIndex % TIPS.length];
  }, []);

  const doneCount = activeHabits.filter((h) => h.doneToday).length;
  const total = activeHabits.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const bestStreak = activeHabits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const name = user?.email?.split('@')[0] ?? '';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold capitalize">Hola{name ? `, ${name}` : ''}</h1>
          <p className="text-sm text-[var(--text-muted)] capitalize">{formatDayLabel(today)}</p>
        </div>
        <span className="shrink-0 font-mono text-xs text-[var(--text-faint)]">entrada nº {dayOfYear(today)}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-2xl font-display font-bold text-[var(--color-brand-text)]">{doneCount}/{total}</p>
          <p className="text-xs text-[var(--text-muted)]">Hábitos hoy</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-display font-bold">{pct}%</p>
          <p className="text-xs text-[var(--text-muted)]">Progreso diario</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-2xl font-display font-bold"><Flame size={20} strokeWidth={2} className="text-[var(--color-brand-text)]" />{bestStreak}</p>
          <p className="text-xs text-[var(--text-muted)]">Mejor racha activa</p>
        </Card>
        <Card className="p-4">
          <p className={`text-2xl font-display font-bold ${summary.balance >= 0 ? 'text-[var(--color-money-in-text)]' : 'text-[var(--color-money-out-text)]'}`}>
            {loadingTx ? '···' : formatCLP(summary.balance)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Balance del mes</p>
        </Card>
      </div>

      <div className="mt-4 flex gap-3 border-l-2 border-[var(--color-brand-text)] py-1 pl-4">
        <Feather size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--color-brand-text)]" />
        <p className="text-sm italic leading-relaxed text-[var(--text-muted)]">{tip}</p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Hoy</h2>
        <Link to="/habitos" className="text-xs text-[var(--color-brand-text)] hover:underline">Ver todos →</Link>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {loading ? (
          <><Skeleton className="h-20" /><Skeleton className="h-20" /></>
        ) : activeHabits.length === 0 ? (
          <EmptyState icon={<Sparkles size={26} strokeWidth={1.5} />} title="Aún no tienes hábitos" description="Crea tu primer hábito para empezar a construir constancia." action={<Link to="/habitos" className="text-sm font-medium text-[var(--color-brand-text)] hover:underline">Crear hábito →</Link>} />
        ) : (
          activeHabits.map((h) => <HabitCard key={h.id} habit={h} onToggleToday={toggleToday} categoryName={h.category_id ? categoryNameById.get(h.category_id) : undefined} />)
        )}
      </div>
    </div>
  );
}
