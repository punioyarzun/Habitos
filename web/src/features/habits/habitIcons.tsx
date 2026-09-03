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

/** Mapa de emojis antiguos → clave de ícono de línea. Cubre los hábitos creados
 *  antes de migrar a lucide, para que jamás se muestre un emoji. */
const EMOJI_TO_ICON: Record<string, string> = {
  '⭐': 'spark', '🌟': 'spark', '✨': 'spark',
  '🏃': 'run', '🏃‍♂️': 'run', '🏃‍♀️': 'run', '👟': 'run',
  '🏋': 'dumbbell', '🏋️': 'dumbbell', '💪': 'dumbbell', '🤸': 'dumbbell',
  '🚴': 'bike', '🚲': 'bike',
  '📚': 'book', '📖': 'book', '📓': 'book', '🎓': 'study', '✏️': 'write', '✍️': 'write', '📝': 'write', '🖊️': 'write',
  '💧': 'water', '🚰': 'water', '💦': 'water',
  '🧘': 'meditate', '🧠': 'meditate',
  '💻': 'code', '🖥️': 'laptop', '⌨️': 'code', '💼': 'work',
  '🚭': 'nosmoke', '🚫': 'nosmoke', '⛔': 'nosmoke', '🛑': 'nosmoke', '🚬': 'nosmoke',
  '🥗': 'salad', '🥦': 'salad', '🍎': 'apple', '🍏': 'apple', '🍽️': 'salad',
  '☕': 'coffee', '🍵': 'coffee',
  '🌙': 'moon', '🌛': 'moon', '☀️': 'sun', '🌞': 'sun', '🛏️': 'sleep', '😴': 'sleep', '💤': 'sleep',
  '💰': 'money', '💵': 'money', '💸': 'money', '🏦': 'savings', '🐷': 'savings',
  '🎯': 'target', '✅': 'target', '☑️': 'target', '🔥': 'target',
  '🎵': 'music', '🎶': 'music', '🎸': 'music',
  '❤️': 'heart', '💓': 'heart', '🩺': 'heart',
  '🌱': 'leaf', '🌿': 'leaf', '🍃': 'leaf',
};

/** Resuelve el nombre a un componente de ícono de línea. Si es una clave conocida
 *  o un emoji mapeado, lo usa; en cualquier otro caso cae a un ícono neutro
 *  (nunca renderiza el emoji como texto). */
function resolveIcon(name: string): LucideIcon {
  if (HABIT_ICONS[name]) return HABIT_ICONS[name];
  const stripped = name.replace(/️/g, '');
  const key = EMOJI_TO_ICON[name] ?? EMOJI_TO_ICON[stripped];
  if (key && HABIT_ICONS[key]) return HABIT_ICONS[key];
  return HABIT_ICONS.target;
}

/** Renderiza el ícono de un hábito como ícono de línea (lucide), migrando en
 *  caliente cualquier emoji antiguo. */
export function HabitIcon({ name, size = 18, strokeWidth = 2, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const Icon = resolveIcon(name);
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
