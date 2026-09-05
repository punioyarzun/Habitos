import { Link } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../hooks/useAuth';
import { HabitTile } from '../features/habits/HabitTile';
import { DailyGoalRing } from '../features/habits/DailyGoalRing';
import { EmptyState, Skeleton, StatCard } from '../components/ui/primitives';
import { Sparkles, Flame, Wallet, ListChecks, Target } from 'lucide-react';
import { formatCLP } from '../utils/currency';
import { formatDayLabel, todayIso } from '../utils/dates';

export function DashboardPage() {
  const { user } = useAuth();
  const { activeHabits, loading, toggleToday } = useHabits();
  const now = new Date();
  const { summary, loading: loadingTx } = useTransactions(now.getFullYear(), now.getMonth());
  const today = todayIso();

  const doneCount = activeHabits.filter((h) => h.doneToday).length;
  const total = activeHabits.length;
  const bestStreak = activeHabits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const name = user?.email?.split('@')[0] ?? '';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b border-[var(--border)] pb-5">
        <h1 className="font-display text-2xl font-semibold capitalize tracking-tight">Hola{name ? `, ${name}` : ''}</h1>
        <p className="mt-0.5 text-sm capitalize text-[var(--text-muted)]">{formatDayLabel(today)}</p>
      </div>

      <div className="mt-5">
        <DailyGoalRing done={doneCount} total={total} streak={bestStreak} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatCard icon={<Flame size={18} strokeWidth={2} className="text-[var(--color-brand-text)]" />} value={bestStreak} label="Mejor racha" />
        <StatCard icon={<ListChecks size={17} strokeWidth={2} className="text-[var(--text-muted)]" />} value={total} label="Hábitos activos" />
        <StatCard
          icon={<Wallet size={16} strokeWidth={2} className="text-[var(--text-muted)]" />}
          value={<span className={summary.balance >= 0 ? 'text-[var(--color-money-in-text)]' : 'text-[var(--color-money-out-text)]'}>{loadingTx ? '···' : formatCLP(summary.balance)}</span>}
          label="Balance"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Hoy</h2>
        <div className="flex items-center gap-3">
          <Link to="/enfoque" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand-text)] hover:underline"><Target size={13} strokeWidth={2} /> Modo foco</Link>
          <Link to="/habitos" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">Ver todos →</Link>
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </div>
        ) : activeHabits.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} strokeWidth={1.5} />}
            title="Aún no tienes hábitos"
            description="Crea tu primer hábito para empezar a construir constancia."
            action={<Link to="/habitos" className="text-sm font-medium text-[var(--color-brand-text)] hover:underline">Crear hábito →</Link>}
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {activeHabits.map((h) => (
              <HabitTile key={h.id} habit={h} onToggle={toggleToday} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
