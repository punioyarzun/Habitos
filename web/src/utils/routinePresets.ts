import type { RoutineType } from '../types/domain';

/** Ejercicio dentro de una plantilla de preset (sin ids — se generan al crear). */
export interface PresetExercise {
  name: string;
  muscle_group: string;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
}

export interface PresetDay {
  name: string;
  weekday?: number; // 0=domingo … 6=sábado
  is_rest?: boolean;
  exercises: PresetExercise[];
}

export interface RoutinePreset {
  type: Exclude<RoutineType, 'custom'>;
  name: string;
  description: string;
  icon: string;
  days: PresetDay[];
}

const ABS: PresetExercise = { name: 'Abdominales (plancha o crunch)', muscle_group: 'Core', target_sets: 3, target_reps: 15, rest_seconds: 45 };

/**
 * Rutinas prediseñadas. Son solo puntos de partida: al elegir una se copian a
 * tablas reales (workout_routines/routine_days/routine_exercises) y desde ahí
 * el usuario las edita libremente. Nada de esto queda "hardcodeado" en runtime.
 */
export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    type: 'fullbody',
    name: 'Full Body',
    description: 'Cuerpo completo, 3 días por semana. Ideal si entrenas pocos días.',
    icon: '🏋️',
    days: [
      {
        name: 'Full Body A', weekday: 1,
        exercises: [
          { name: 'Sentadilla', muscle_group: 'Piernas', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Press de banca', muscle_group: 'Pecho', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Remo con barra', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Press militar', muscle_group: 'Hombros', target_sets: 3, target_reps: 10, rest_seconds: 90 },
          { name: 'Peso muerto rumano', muscle_group: 'Piernas', target_sets: 3, target_reps: 10, rest_seconds: 120 },
          ABS,
        ],
      },
      { name: 'Descanso', weekday: 2, is_rest: true, exercises: [] },
      {
        name: 'Full Body B', weekday: 3,
        exercises: [
          { name: 'Peso muerto', muscle_group: 'Piernas', target_sets: 4, target_reps: 6, rest_seconds: 150 },
          { name: 'Press inclinado con mancuernas', muscle_group: 'Pecho', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Jalón al pecho', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Elevaciones laterales', muscle_group: 'Hombros', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Zancadas', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          ABS,
        ],
      },
      { name: 'Descanso', weekday: 4, is_rest: true, exercises: [] },
      {
        name: 'Full Body C', weekday: 5,
        exercises: [
          { name: 'Prensa de piernas', muscle_group: 'Piernas', target_sets: 4, target_reps: 12, rest_seconds: 90 },
          { name: 'Fondos / Press de pecho', muscle_group: 'Pecho', target_sets: 3, target_reps: 10, rest_seconds: 90 },
          { name: 'Remo con mancuerna', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Curl de bíceps', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Extensión de tríceps', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          ABS,
        ],
      },
    ],
  },
  {
    type: 'ppl',
    name: 'Push Pull Legs',
    description: 'Empuje, tirón y piernas. 6 días (o repite en 3). Volumen alto.',
    icon: '🔁',
    days: [
      {
        name: 'Push (Empuje)', weekday: 1,
        exercises: [
          { name: 'Press de banca', muscle_group: 'Pecho', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Press militar', muscle_group: 'Hombros', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Press inclinado con mancuernas', muscle_group: 'Pecho', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Elevaciones laterales', muscle_group: 'Hombros', target_sets: 3, target_reps: 15, rest_seconds: 60 },
          { name: 'Extensión de tríceps en polea', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        ],
      },
      {
        name: 'Pull (Tirón)', weekday: 2,
        exercises: [
          { name: 'Dominadas / Jalón al pecho', muscle_group: 'Espalda', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Remo con barra', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Face pull', muscle_group: 'Hombros', target_sets: 3, target_reps: 15, rest_seconds: 60 },
          { name: 'Curl de bíceps con barra', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Curl martillo', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        ],
      },
      {
        name: 'Legs (Piernas)', weekday: 3,
        exercises: [
          { name: 'Sentadilla', muscle_group: 'Piernas', target_sets: 4, target_reps: 8, rest_seconds: 150 },
          { name: 'Peso muerto rumano', muscle_group: 'Piernas', target_sets: 4, target_reps: 10, rest_seconds: 120 },
          { name: 'Prensa de piernas', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Curl femoral', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Elevación de gemelos', muscle_group: 'Piernas', target_sets: 4, target_reps: 15, rest_seconds: 45 },
        ],
      },
      { name: 'Descanso', weekday: 4, is_rest: true, exercises: [] },
      {
        name: 'Push (Empuje)', weekday: 5,
        exercises: [
          { name: 'Press militar', muscle_group: 'Hombros', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Press inclinado con barra', muscle_group: 'Pecho', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Aperturas con mancuernas', muscle_group: 'Pecho', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Elevaciones laterales', muscle_group: 'Hombros', target_sets: 4, target_reps: 15, rest_seconds: 45 },
          { name: 'Press francés', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        ],
      },
      {
        name: 'Pull (Tirón)', weekday: 6,
        exercises: [
          { name: 'Remo en polea', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Jalón al pecho', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Remo con mancuerna', muscle_group: 'Espalda', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Curl de bíceps', muscle_group: 'Brazos', target_sets: 4, target_reps: 12, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    type: 'upper_lower',
    name: 'Tren Superior / Tren Inferior',
    description: 'Alterna torso y piernas. 4 días por semana, buen equilibrio.',
    icon: '⚖️',
    days: [
      {
        name: 'Tren Superior A', weekday: 1,
        exercises: [
          { name: 'Press de banca', muscle_group: 'Pecho', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Remo con barra', muscle_group: 'Espalda', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Press militar', muscle_group: 'Hombros', target_sets: 3, target_reps: 10, rest_seconds: 90 },
          { name: 'Jalón al pecho', muscle_group: 'Espalda', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Curl de bíceps', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Extensión de tríceps', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        ],
      },
      {
        name: 'Tren Inferior A', weekday: 2,
        exercises: [
          { name: 'Sentadilla', muscle_group: 'Piernas', target_sets: 4, target_reps: 8, rest_seconds: 150 },
          { name: 'Peso muerto rumano', muscle_group: 'Piernas', target_sets: 3, target_reps: 10, rest_seconds: 120 },
          { name: 'Prensa de piernas', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Curl femoral', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Elevación de gemelos', muscle_group: 'Piernas', target_sets: 4, target_reps: 15, rest_seconds: 45 },
        ],
      },
      { name: 'Descanso', weekday: 3, is_rest: true, exercises: [] },
      {
        name: 'Tren Superior B', weekday: 4,
        exercises: [
          { name: 'Press inclinado con mancuernas', muscle_group: 'Pecho', target_sets: 4, target_reps: 10, rest_seconds: 90 },
          { name: 'Dominadas / Jalón', muscle_group: 'Espalda', target_sets: 4, target_reps: 8, rest_seconds: 120 },
          { name: 'Elevaciones laterales', muscle_group: 'Hombros', target_sets: 4, target_reps: 15, rest_seconds: 45 },
          { name: 'Remo en polea', muscle_group: 'Espalda', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Curl martillo', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        ],
      },
      {
        name: 'Tren Inferior B', weekday: 5,
        exercises: [
          { name: 'Peso muerto', muscle_group: 'Piernas', target_sets: 4, target_reps: 6, rest_seconds: 150 },
          { name: 'Zancadas', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Extensión de cuádriceps', muscle_group: 'Piernas', target_sets: 3, target_reps: 15, rest_seconds: 60 },
          { name: 'Hip thrust', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          ABS,
        ],
      },
    ],
  },
  {
    type: 'beginner',
    name: 'Principiante',
    description: 'Simple y fácil de seguir. 3 días, movimientos básicos.',
    icon: '🌱',
    days: [
      {
        name: 'Día 1', weekday: 1,
        exercises: [
          { name: 'Sentadilla con peso corporal', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Press de pecho en máquina', muscle_group: 'Pecho', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Remo en máquina', muscle_group: 'Espalda', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Plancha', muscle_group: 'Core', target_sets: 3, target_reps: 30, rest_seconds: 45 },
        ],
      },
      { name: 'Descanso', weekday: 2, is_rest: true, exercises: [] },
      {
        name: 'Día 2', weekday: 3,
        exercises: [
          { name: 'Prensa de piernas', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Press de hombros en máquina', muscle_group: 'Hombros', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Jalón al pecho', muscle_group: 'Espalda', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Curl de bíceps', muscle_group: 'Brazos', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        ],
      },
      { name: 'Descanso', weekday: 4, is_rest: true, exercises: [] },
      {
        name: 'Día 3', weekday: 5,
        exercises: [
          { name: 'Peso muerto rumano con mancuernas', muscle_group: 'Piernas', target_sets: 3, target_reps: 12, rest_seconds: 90 },
          { name: 'Flexiones (o en rodillas)', muscle_group: 'Pecho', target_sets: 3, target_reps: 10, rest_seconds: 60 },
          { name: 'Remo con mancuerna', muscle_group: 'Espalda', target_sets: 3, target_reps: 12, rest_seconds: 60 },
          { name: 'Plancha', muscle_group: 'Core', target_sets: 3, target_reps: 30, rest_seconds: 45 },
        ],
      },
    ],
  },
];

export function presetByType(type: string): RoutinePreset | undefined {
  return ROUTINE_PRESETS.find((p) => p.type === type);
}
