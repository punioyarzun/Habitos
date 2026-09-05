import type { HabitWithStats, HabitCompletion } from '../types/domain';
import { Sparkles, Flame, Trophy, Crown, Target, CalendarCheck, Medal, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  value: number;
  target: number;
  unlocked: boolean;
  progress: number; // 0..1
}

/** Calcula logros a partir de los hábitos (con stats) y los cumplimientos.
 *  Todo se deriva de datos existentes — no hay tabla de logros. */
export function computeAchievements(habits: HabitWithStats[], completions: HabitCompletion[]): Achievement[] {
  const active = habits.filter((h) => h.status !== 'archived');
  const habitCount = active.length;
  const totalCompletions = completions.length;
  const bestStreakEver = habits.reduce((m, h) => Math.max(m, h.bestStreak, h.currentStreak), 0);

  // Días perfectos: fechas donde se cumplieron todos los hábitos activos.
  const byDate = new Map<string, number>();
  for (const c of completions) byDate.set(c.completed_date, (byDate.get(c.completed_date) ?? 0) + 1);
  let perfectDays = 0;
  if (habitCount > 0) for (const n of byDate.values()) if (n >= habitCount) perfectDays++;

  const defs: Omit<Achievement, 'unlocked' | 'progress'>[] = [
    { id: 'first', title: 'Primer paso', description: 'Crea tu primer hábito', Icon: Sparkles, value: habitCount, target: 1 },
    { id: 'builder', title: 'Constructor', description: 'Ten 5 hábitos', Icon: Target, value: habitCount, target: 5 },
    { id: 'streak7', title: 'Una semana', description: 'Alcanza una racha de 7 días', Icon: Flame, value: bestStreakEver, target: 7 },
    { id: 'streak30', title: 'Imparable', description: 'Alcanza una racha de 30 días', Icon: Zap, value: bestStreakEver, target: 30 },
    { id: 'streak100', title: 'Centurión', description: 'Alcanza una racha de 100 días', Icon: Crown, value: bestStreakEver, target: 100 },
    { id: 'comp50', title: '50 marcas', description: 'Completa 50 hábitos', Icon: Medal, value: totalCompletions, target: 50 },
    { id: 'comp250', title: '250 marcas', description: 'Completa 250 hábitos', Icon: Trophy, value: totalCompletions, target: 250 },
    { id: 'perfect1', title: 'Día perfecto', description: 'Cumple todos tus hábitos en un día', Icon: CalendarCheck, value: perfectDays, target: 1 },
    { id: 'perfect10', title: 'Diez perfectos', description: 'Diez días con todo cumplido', Icon: Trophy, value: perfectDays, target: 10 },
  ];

  return defs.map((d) => ({
    ...d,
    unlocked: d.value >= d.target,
    progress: Math.max(0, Math.min(1, d.value / d.target)),
  }));
}
