import {
  Dumbbell, Activity, HeartPulse, Footprints, Bike, BookOpen, GraduationCap,
  Code, Laptop, Briefcase, PenLine, Droplet, Salad, Apple, Coffee, CigaretteOff,
  Moon, Sun, Bed, Brain, Music, Target, Wallet, PiggyBank, Sparkles, Leaf,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Set curado de íconos de línea para hábitos. La clave (string) es lo que se
 *  guarda en `habit.icon`. Reemplaza el picker de emojis por algo uniforme. */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  target: Target,
  dumbbell: Dumbbell,
  activity: Activity,
  run: Footprints,
  bike: Bike,
  heart: HeartPulse,
  book: BookOpen,
  study: GraduationCap,
  code: Code,
  laptop: Laptop,
  work: Briefcase,
  write: PenLine,
  water: Droplet,
  salad: Salad,
  apple: Apple,
  coffee: Coffee,
  nosmoke: CigaretteOff,
  sleep: Bed,
  moon: Moon,
  sun: Sun,
  meditate: Brain,
  music: Music,
  money: Wallet,
  savings: PiggyBank,
  spark: Sparkles,
  leaf: Leaf,
};

export const HABIT_ICON_NAMES = Object.keys(HABIT_ICONS);

/**
 * Renderiza el ícono de un hábito. Si `name` es una clave conocida usa el ícono
 * de línea (lucide); si no (p. ej. un emoji de un hábito antiguo), lo muestra
 * como texto para no romper datos existentes.
 */
export function HabitIcon({ name, size = 18, strokeWidth = 2, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const Icon = HABIT_ICONS[name];
  if (Icon) return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
  return <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">{name}</span>;
}
