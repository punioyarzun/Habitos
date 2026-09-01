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
