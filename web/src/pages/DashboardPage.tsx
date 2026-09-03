import { Link } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../hooks/useAuth';
import { HabitCard } from '../features/habits/HabitCard';
import { EmptyState, Skeleton, StatCard, ProgressBar } from '../components/ui/primitives';
import { Sparkles, Flame, Wallet, CircleCheck, TrendingUp } from 'lucide-react';
import { formatCLP } from '../utils/currency';
import { formatDayLabel, todayIso } from '../utils/dates';

export function DashboardPage() {
  const { user } = useAuth();
  const { activeHabits, loading, toggleToday, categoryNameById } = useHabits();
  const now = new Date();
  const { summary, loading: loadingTx } = useTransactions(now.getFullYear(), now.getMonth());
  const today = todayIso();

  const doneCount = activeHabits.filter((h) => h.doneToday).length;
  const total = activeHabits.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const bestStreak = activeHabits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const name = user?.email?.split('@')[0] ?? '';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b border-[var(--border)] pb-5">
        <h1 className="font-display text-2xl font-semibold capitalize tracking-tight">Hola{name ? `, ${name}` : ''}</h1>
        <p className="mt-0.5 text-sm capitalize text-[var(--text-muted)]">{formatDayLabel(today)}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard accent icon={<CircleCheck size={18} strokeWidth={2} />} value={`${doneCount}/${total}`} label="Hábitos hoy" />
        <StatCard icon={<TrendingUp size={17} strokeWidth={2} className="text-[var(--text-muted)]" />} value={`${pct}%`} label="Progreso de hoy" />
        <StatCard icon={<Flame size={18} strokeWidth={2} className="text-[var(--color-brand-text)]" />} value={bestStreak} label="Mejor racha activa" />
        <StatCard
          icon={<Wallet size={16} strokeWidth={2} className="text-[var(--text-muted)]" />}
          value={<span className={summary.balance >= 0 ? 'text-[var(--color-money-in-text)]' : 'text-[var(--color-money-out-text)]'}>{loadingTx ? '···' : formatCLP(summary.balance)}</span>}
          label="Balance del mes"
        />
      </div>

      {total > 0 && (
        <div className="card mt-3 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progreso de hoy</span>
            <span className="text-[var(--text-muted)]">{doneCount} de {total} completados</span>
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Hoy</h2>
        <Link to="/habitos" className="text-xs font-medium text-[var(--color-brand-text)] hover:underline">Ver todos →</Link>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
        ) : activeHabits.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} strokeWidth={1.5} />}
            title="Aún no tienes hábitos"
            description="Crea tu primer hábito para empezar a construir constancia."
            action={<Link to="/habitos" className="text-sm font-medium text-[var(--color-brand-text)] hover:underline">Crear hábito →</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeHabits.map((h) => (
              <HabitCard key={h.id} habit={h} onToggleToday={toggleToday} categoryName={h.category_id ? categoryNameById.get(h.category_id) : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
