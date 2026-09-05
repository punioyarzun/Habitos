import { useMemo } from 'react';
import { Award, Lock } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';
import { Card, EmptyState, Skeleton, ProgressBar } from '../components/ui/primitives';
import { computeAchievements } from '../utils/achievements';

export function AchievementsPage() {
  const { habits, completions, loading } = useHabits();
  const achievements = useMemo(() => computeAchievements(habits, completions), [habits, completions]);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/12 text-[var(--color-brand-text)]"><Award size={17} strokeWidth={2} /></span>
        <div>
          <h1 className="font-display text-xl font-semibold">Logros</h1>
          <p className="text-sm text-[var(--text-muted)]">{unlocked} de {achievements.length} desbloqueados</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      ) : habits.length === 0 ? (
        <EmptyState icon={<Award size={26} strokeWidth={1.5} />} title="Aún no hay logros" description="Crea hábitos y empieza a marcarlos para desbloquear medallas." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a) => (
            <Card key={a.id} className={`flex flex-col items-center p-4 text-center transition-opacity ${a.unlocked ? '' : 'opacity-75'}`}>
              <span
                className="mb-2 grid h-12 w-12 place-items-center rounded-full"
                style={{
                  background: a.unlocked ? 'color-mix(in srgb, var(--color-brand-500) 16%, transparent)' : 'var(--surface-2)',
                  color: a.unlocked ? 'var(--color-brand-text)' : 'var(--text-faint)',
                }}
              >
                {a.unlocked ? <a.Icon size={22} strokeWidth={2} /> : <Lock size={18} strokeWidth={2} />}
              </span>
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{a.description}</p>
              {!a.unlocked && (
                <div className="mt-2 w-full">
                  <ProgressBar pct={a.progress * 100} />
                  <p className="mt-1 text-[10px] text-[var(--text-faint)]">{Math.min(a.value, a.target)}/{a.target}</p>
                </div>
              )}
              {a.unlocked && <p className="mt-2 text-[10px] font-medium text-[var(--color-brand-text)]">Desbloqueado</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
