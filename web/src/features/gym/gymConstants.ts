import type { RoutineType } from '../../types/domain';

export const ROUTINE_TYPE_LABELS: Record<RoutineType, string> = {
  fullbody: 'Full Body',
  ppl: 'Push Pull Legs',
  upper_lower: 'Superior / Inferior',
  beginner: 'Principiante',
  custom: 'Personalizada',
};

export const MUSCLE_GROUPS = [
  'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Glúteos', 'Cardio', 'Otro',
];
