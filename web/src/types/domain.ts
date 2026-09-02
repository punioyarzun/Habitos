export type HabitStatus = 'active' | 'paused' | 'archived';
export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  active_days: number[]; // 0=domingo … 6=sábado
  start_date: string; // ISO date
  status: HabitStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string; // ISO date
  note: string | null;
  created_at: string;
}

export type TransactionType = 'ingreso' | 'gasto';

export interface FinancialCategory {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  transaction_date: string; // ISO date
  created_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

/** Hábito con su racha y métricas calculadas en el cliente. */
export interface HabitWithStats extends Habit {
  currentStreak: number;
  bestStreak: number;
  completionRate30d: number; // 0..1
  totalCompletions: number;
  lastCompletedDate: string | null;
  doneToday: boolean;
}

// ===========================================================================
// GIMNASIO
// ===========================================================================
export type RoutineType = 'fullbody' | 'ppl' | 'upper_lower' | 'beginner' | 'custom';

export interface WorkoutRoutine {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: RoutineType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  user_id: string;
  name: string;
  weekday: number | null; // 0=domingo … 6=sábado
  is_rest: boolean;
  sort_order: number;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  day_id: string;
  routine_id: string;
  user_id: string;
  name: string;
  muscle_group: string | null;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  rest_seconds: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id: string | null;
  day_id: string | null;
  name: string;
  performed_date: string; // ISO date
  duration_seconds: number;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSetLog {
  id: string;
  session_id: string;
  user_id: string;
  exercise_name: string;
  muscle_group: string | null;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
  created_at: string;
}

/** Rutina con sus días y ejercicios ya anidados (armado en el cliente). */
export interface RoutineDayWithExercises extends RoutineDay {
  exercises: RoutineExercise[];
}
export interface RoutineWithDays extends WorkoutRoutine {
  days: RoutineDayWithExercises[];
}

/** Sesión con sus series (para el detalle en historial/calendario). */
export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSetLog[];
}

// ===========================================================================
// RECORDATORIOS
// ===========================================================================
export type ReminderPriority = 'baja' | 'media' | 'alta';
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';
export type ReminderStatus = 'pending' | 'completed';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: ReminderPriority;
  remind_date: string; // ISO date
  remind_time: string | null; // "HH:MM" o "HH:MM:SS"
  repeat: ReminderRepeat;
  repeat_days: number[]; // para weekly
  repeat_day_of_month: number | null; // para monthly
  status: ReminderStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderCompletion {
  id: string;
  reminder_id: string;
  user_id: string;
  completed_date: string; // ISO date
  created_at: string;
}
