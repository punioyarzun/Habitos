import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Check, Plus, Minus, Clock, Dumbbell, CheckCircle2 } from 'lucide-react';
import { gymService } from '../../services/gymService';
import { workoutService } from '../../services/workoutService';
import { habitsService } from '../../services/habitsService';
import { completionsService } from '../../services/completionsService';
import type { Habit } from '../../types/domain';
import { Card, Skeleton, ProgressBar } from '../../components/ui/primitives';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ExerciseFormModal } from '../../features/gym/ExerciseFormModal';
import { RestTimer } from '../../features/gym/RestTimer';
import type { ExerciseInput } from '../../services/gymService';
import { formatClock } from '../../utils/time';
import { todayIso } from '../../utils/dates';
import { useToast } from '../../hooks/useToast';

interface WorkSet { id: string; reps: string; weight: string; done: boolean; }
interface WorkExercise { id: string; name: string; muscle_group: string | null; rest_seconds: number; sets: WorkSet[]; }

let uid = 0;
const nextId = () => `w${uid++}`;

function makeSets(count: number, reps: number, weight: number | null): WorkSet[] {
  return Array.from({ length: Math.max(1, count) }, () => ({
    id: nextId(), reps: String(reps || 0), weight: weight != null ? String(weight) : '', done: false,
  }));
}

const HABIT_RE = /entren|gimnas|gym|ejercic/i;

export function ActiveWorkoutPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Entrenamiento libre');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkExercise[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<{ seconds: number; key: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkedHabit, setLinkedHabit] = useState<Habit | null>(null);
  const [markHabit, setMarkHabit] = useState(true);
  const startedAt = useRef<number>(Date.now());

  // Cargar día + ejercicios (o sesión libre) y el hábito enlazable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (dayId) {
          const data = await gymService.getDayWithExercises(dayId);
          if (!cancelled && data) {
            setRoutineId(data.routine?.id ?? null);
            setTitle(data.routine ? `${data.routine.name} — ${data.day.name}` : data.day.name);
            setExercises(data.exercises.map((e) => ({
              id: nextId(), name: e.name, muscle_group: e.muscle_group, rest_seconds: e.rest_seconds,
              sets: makeSets(e.target_sets, e.target_reps, e.target_weight),
            })));
          }
        }
        const habits = await habitsService.list('active').catch(() => []);
        const match = habits.find((h) => HABIT_RE.test(h.name));
        if (!cancelled) setLinkedHabit(match ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dayId]);

  // Cronómetro en vivo.
  useEffect(() => {
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const { doneSets, totalSets } = useMemo(() => {
    let done = 0, total = 0;
    for (const ex of exercises) for (const s of ex.sets) { total++; if (s.done) done++; }
    return { doneSets: done, totalSets: total };
  }, [exercises]);
  const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  const updateSet = useCallback((exId: string, setId: string, patch: Partial<WorkSet>) => {
    setExercises((prev) => prev.map((ex) => ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    }));
  }, []);

  function toggleDone(ex: WorkExercise, setId: string) {
    const set = ex.sets.find((s) => s.id === setId);
    const willBeDone = !set?.done;
    updateSet(ex.id, setId, { done: willBeDone });
    if (willBeDone && ex.rest_seconds > 0) setRest({ seconds: ex.rest_seconds, key: Date.now() });
  }

  function addSet(exId: string) {
    setExercises((prev) => prev.map((ex) => {
      if (ex.id !== exId) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { id: nextId(), reps: last?.reps ?? '10', weight: last?.weight ?? '', done: false }] };
    }));
  }
  function removeSet(exId: string, setId: string) {
    setExercises((prev) => prev.map((ex) => ex.id !== exId ? ex : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }));
  }
  function removeExercise(exId: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== exId));
  }
  function addExercise(input: ExerciseInput) {
    setExercises((prev) => [...prev, {
      id: nextId(), name: input.name, muscle_group: input.muscle_group ?? null,
      rest_seconds: input.rest_seconds ?? 90,
      sets: makeSets(input.target_sets ?? 3, input.target_reps ?? 10, input.target_weight ?? null),
    }]);
  }

  async function finish() {
    setSaving(true);
    try {
      const sets = exercises.flatMap((ex) =>
        ex.sets.map((s, i) => ({
          exercise_name: ex.name,
          muscle_group: ex.muscle_group,
          set_number: i + 1,
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
          completed: s.done,
        }))
      );
      await workoutService.finishWorkout({
        routine_id: routineId,
        day_id: dayId ?? null,
        name: title,
        performed_date: todayIso(),
        duration_seconds: elapsed,
        sets,
      });
      if (linkedHabit && markHabit) {
        await completionsService.markDone(linkedHabit.id, todayIso()).catch(() => {});
      }
      push('Entrenamiento guardado.', 'ok');
      navigate('/gimnasio');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo guardar.', 'err');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-md"><Skeleton className="mb-3 h-12" /><Skeleton className="h-40" /></div>;
  }

  const numField = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-center text-sm font-mono tabular-nums';

  return (
    <div className="mx-auto max-w-md pb-4">
      {/* Header fijo con cronómetro y progreso */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setShowDiscard(true)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Salir">
            <X size={18} strokeWidth={2} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="flex items-center justify-center gap-1 font-mono text-xs text-[var(--text-muted)]"><Clock size={12} strokeWidth={2} /> {formatClock(elapsed)}</p>
          </div>
          <Button onClick={() => setShowFinish(true)} className="!px-3 !py-2">Terminar</Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar pct={pct} className="flex-1" />
          <span className="shrink-0 text-xs text-[var(--text-muted)]">{doneSets}/{totalSets}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {exercises.map((ex) => (
          <Card key={ex.id} className="p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display font-semibold">{ex.name}</p>
                {ex.muscle_group && <p className="text-xs text-[var(--text-muted)]">{ex.muscle_group}</p>}
              </div>
              <button onClick={() => removeExercise(ex.id)} className="shrink-0 rounded-lg p-1 text-[var(--text-faint)] hover:text-[var(--color-danger-text)]" aria-label="Quitar ejercicio"><X size={15} strokeWidth={2} /></button>
            </div>

            <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
              <span className="text-center">Serie</span>
              <span className="text-center">Kg</span>
              <span className="text-center">Reps</span>
              <span />
            </div>

            <div className="mt-1 flex flex-col gap-1.5">
              {ex.sets.map((s, i) => (
                <div key={s.id} className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 rounded-lg py-1 ${s.done ? 'bg-brand-500/[0.07]' : ''}`}>
                  <span className="text-center text-sm font-medium text-[var(--text-muted)]">{i + 1}</span>
                  <input inputMode="decimal" value={s.weight} onFocus={(e) => e.target.select()} onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value })} placeholder="0" className={numField} />
                  <input inputMode="numeric" value={s.reps} onFocus={(e) => e.target.select()} onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value })} placeholder="0" className={numField} />
                  <button
                    onClick={() => toggleDone(ex, s.id)}
                    aria-pressed={s.done}
                    className={`grid h-9 w-9 place-items-center rounded-lg border-2 transition-colors ${s.done ? 'border-brand-500 bg-brand-500 text-[var(--color-brand-ink)]' : 'border-[var(--border)] text-[var(--text-faint)] hover:border-[var(--color-brand-text)]/60'}`}
                    aria-label={s.done ? 'Marcar serie como no hecha' : 'Marcar serie como hecha'}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-3 text-xs font-medium">
              <button onClick={() => addSet(ex.id)} className="inline-flex items-center gap-1 text-[var(--color-brand-text)] hover:underline"><Plus size={13} strokeWidth={2} /> Serie</button>
              {ex.sets.length > 1 && (
                <button onClick={() => removeSet(ex.id, ex.sets[ex.sets.length - 1].id)} className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)]"><Minus size={13} strokeWidth={2} /> Serie</button>
              )}
            </div>
          </Card>
        ))}

        <Button variant="secondary" icon={<Plus size={16} strokeWidth={2} />} onClick={() => setAddOpen(true)} className="w-full">
          Agregar ejercicio
        </Button>

        {exercises.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            <Dumbbell size={24} strokeWidth={1.5} className="mx-auto mb-2 opacity-60" />
            Agrega ejercicios para empezar a registrar tus series.
          </p>
        )}
      </div>

      {rest && <RestTimer key={rest.key} seconds={rest.seconds} onClose={() => setRest(null)} />}

      <ExerciseFormModal open={addOpen} onClose={() => setAddOpen(false)} onSave={addExercise} />

      {/* Terminar */}
      <Modal
        open={showFinish}
        onClose={() => setShowFinish(false)}
        title="Terminar entrenamiento"
        footer={<><Button variant="ghost" onClick={() => setShowFinish(false)}>Seguir</Button><Button loading={saving} icon={<CheckCircle2 size={16} strokeWidth={2} />} onClick={finish}>Guardar</Button></>}
      >
        <div className="flex flex-col gap-3">
          <p>Duración <span className="font-mono">{formatClock(elapsed)}</span> · {doneSets} de {totalSets} series completadas.</p>
          {linkedHabit && (
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3 text-sm">
              <input type="checkbox" checked={markHabit} onChange={(e) => setMarkHabit(e.target.checked)} className="h-4 w-4 rounded border-[var(--border)]" />
              <span>Marcar el hábito <strong>«{linkedHabit.name}»</strong> como hecho hoy</span>
            </label>
          )}
        </div>
      </Modal>

      {/* Descartar */}
      <Modal
        open={showDiscard}
        onClose={() => setShowDiscard(false)}
        title="¿Salir sin guardar?"
        footer={<><Button variant="ghost" onClick={() => setShowDiscard(false)}>Seguir entrenando</Button><Button variant="danger" onClick={() => navigate('/gimnasio')}>Salir</Button></>}
      >
        Si sales ahora se pierde este entrenamiento sin guardar.
      </Modal>
    </div>
  );
}
