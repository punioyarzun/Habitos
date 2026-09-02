import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Play, MoreVertical, Pencil, Trash2, ChevronUp, ChevronDown, Settings2, Moon,
} from 'lucide-react';
import { gymService, type ExerciseInput } from '../../services/gymService';
import type { RoutineWithDays, RoutineExercise, RoutineType } from '../../types/domain';
import { Card, EmptyState, Skeleton } from '../../components/ui/primitives';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ExerciseFormModal } from '../../features/gym/ExerciseFormModal';
import { ROUTINE_TYPE_LABELS } from '../../features/gym/gymConstants';
import { WEEKDAY_LABELS_LONG } from '../../utils/reminders';
import { useToast } from '../../hooks/useToast';

const WEEKDAY_OPTS = [
  { value: '', label: 'Sin día fijo' },
  ...WEEKDAY_LABELS_LONG.map((l, i) => ({ value: String(i), label: l })),
];
const field = 'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm';

export function RoutineEditorPage() {
  const { routineId = '' } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [routine, setRoutine] = useState<RoutineWithDays | null>(null);
  const [loading, setLoading] = useState(true);

  // Modales
  const [showSettings, setShowSettings] = useState(false);
  const [dayForm, setDayForm] = useState<{ id?: string; name: string; weekday: string; is_rest: boolean } | null>(null);
  const [exerciseFor, setExerciseFor] = useState<{ dayId: string; exercise: RoutineExercise | null } | null>(null);
  const [dayMenu, setDayMenu] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<{ name: string; type: RoutineType; description: string }>({ name: '', type: 'custom', description: '' });

  const reload = useCallback(async () => {
    try {
      const r = await gymService.getRoutineWithDays(routineId);
      setRoutine(r);
      if (r) setSettingsForm({ name: r.name, type: r.type, description: r.description ?? '' });
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo cargar la rutina.', 'err');
    } finally {
      setLoading(false);
    }
  }, [routineId, push]);

  useEffect(() => { reload(); }, [reload]);

  async function saveSettings() {
    if (!routine) return;
    await gymService.updateRoutine(routine.id, { name: settingsForm.name.trim() || routine.name, type: settingsForm.type, description: settingsForm.description.trim() || undefined });
    setShowSettings(false);
    reload();
  }

  async function saveDay() {
    if (!dayForm || !routine) return;
    const payload = { name: dayForm.name.trim() || 'Día', weekday: dayForm.weekday === '' ? null : Number(dayForm.weekday), is_rest: dayForm.is_rest };
    if (dayForm.id) await gymService.updateDay(dayForm.id, payload);
    else await gymService.addDay(routine.id, { ...payload, sort_order: routine.days.length });
    setDayForm(null);
    reload();
  }

  async function deleteDay(id: string) {
    await gymService.removeDay(id);
    setDayMenu(null);
    reload();
  }

  async function saveExercise(input: ExerciseInput) {
    if (!exerciseFor || !routine) return;
    if (exerciseFor.exercise) {
      await gymService.updateExercise(exerciseFor.exercise.id, input);
    } else {
      const day = routine.days.find((d) => d.id === exerciseFor.dayId);
      await gymService.addExercise(exerciseFor.dayId, routine.id, input, day?.exercises.length ?? 0);
    }
    await reload();
  }

  async function deleteExercise(id: string) {
    await gymService.removeExercise(id);
    reload();
  }

  async function moveExercise(dayId: string, index: number, dir: -1 | 1) {
    if (!routine) return;
    const day = routine.days.find((d) => d.id === dayId);
    if (!day) return;
    const arr = [...day.exercises];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    // optimista
    setRoutine({ ...routine, days: routine.days.map((d) => (d.id === dayId ? { ...d, exercises: arr } : d)) });
    await gymService.reorderExercises(arr.map((e) => e.id));
  }

  if (loading) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-40" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }
  if (!routine) {
    return <EmptyState title="Rutina no encontrada" action={<Link to="/gimnasio/rutinas" className="text-sm text-[var(--color-brand-text)] hover:underline">← Volver a rutinas</Link>} />;
  }

  const menuDay = routine.days.find((d) => d.id === dayMenu) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to="/gimnasio/rutinas" className="mb-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowLeft size={13} strokeWidth={2} /> Rutinas
          </Link>
          <h2 className="truncate font-display text-lg font-semibold">{routine.name}</h2>
          <p className="text-xs text-[var(--text-muted)]">{ROUTINE_TYPE_LABELS[routine.type]}{routine.is_active ? ' · Activa' : ''}</p>
        </div>
        <Button variant="secondary" icon={<Settings2 size={15} strokeWidth={2} />} onClick={() => setShowSettings(true)}>Ajustes</Button>
      </div>

      <div className="flex flex-col gap-3">
        {routine.days.length === 0 && (
          <EmptyState title="Sin días" description="Agrega el primer día de entrenamiento." />
        )}

        {routine.days.map((day) => (
          <Card key={day.id} className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {day.is_rest && <Moon size={15} strokeWidth={2} className="shrink-0 text-[var(--text-faint)]" />}
                <p className="truncate font-display font-semibold">{day.name}</p>
                {day.weekday !== null && (
                  <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">{WEEKDAY_LABELS_LONG[day.weekday]}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!day.is_rest && (
                  <button onClick={() => navigate(`/gimnasio/entrenar/${day.id}`)} title="Entrenar este día" className="rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--color-brand-text)]">
                    <Play size={15} strokeWidth={2} />
                  </button>
                )}
                <button onClick={() => setDayMenu(day.id)} className="rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Opciones del día">
                  <MoreVertical size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            {!day.is_rest && (
              <>
                <div className="flex flex-col divide-y divide-[var(--border)]">
                  {day.exercises.map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-2 py-2">
                      <div className="flex flex-col">
                        <button disabled={i === 0} onClick={() => moveExercise(day.id, i, -1)} className="text-[var(--text-faint)] hover:text-[var(--text)] disabled:opacity-30"><ChevronUp size={14} strokeWidth={2} /></button>
                        <button disabled={i === day.exercises.length - 1} onClick={() => moveExercise(day.id, i, 1)} className="text-[var(--text-faint)] hover:text-[var(--text)] disabled:opacity-30"><ChevronDown size={14} strokeWidth={2} /></button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ex.name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {ex.muscle_group ? `${ex.muscle_group} · ` : ''}{ex.target_sets}×{ex.target_reps}{ex.target_weight ? ` · ${ex.target_weight} kg` : ''}
                        </p>
                      </div>
                      <button onClick={() => setExerciseFor({ dayId: day.id, exercise: ex })} className="shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Editar ejercicio"><Pencil size={14} strokeWidth={2} /></button>
                      <button onClick={() => deleteExercise(ex.id)} className="shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--color-danger-text)]" aria-label="Eliminar ejercicio"><Trash2 size={14} strokeWidth={2} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setExerciseFor({ dayId: day.id, exercise: null })} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-text)] hover:underline">
                  <Plus size={15} strokeWidth={2} /> Agregar ejercicio
                </button>
              </>
            )}
          </Card>
        ))}

        <Button variant="secondary" icon={<Plus size={16} strokeWidth={2} />} onClick={() => setDayForm({ name: '', weekday: '', is_rest: false })} className="w-fit">
          Agregar día
        </Button>
      </div>

      {/* Ajustes de rutina */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Ajustes de la rutina"
        footer={<><Button variant="ghost" onClick={() => setShowSettings(false)}>Cancelar</Button><Button onClick={saveSettings}>Guardar</Button></>}
      >
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-[var(--text-muted)]">Nombre
            <input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} maxLength={80} className={`mt-1 w-full ${field}`} />
          </label>
          <label className="text-xs font-medium text-[var(--text-muted)]">Tipo
            <select value={settingsForm.type} onChange={(e) => setSettingsForm({ ...settingsForm, type: e.target.value as RoutineType })} className={`mt-1 w-full ${field}`}>
              {(Object.keys(ROUTINE_TYPE_LABELS) as RoutineType[]).map((t) => <option key={t} value={t}>{ROUTINE_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[var(--text-muted)]">Descripción
            <input value={settingsForm.description} onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })} maxLength={300} className={`mt-1 w-full ${field}`} />
          </label>
        </div>
      </Modal>

      {/* Form de día */}
      <Modal
        open={!!dayForm}
        onClose={() => setDayForm(null)}
        title={dayForm?.id ? 'Editar día' : 'Nuevo día'}
        footer={<><Button variant="ghost" onClick={() => setDayForm(null)}>Cancelar</Button><Button onClick={saveDay}>Guardar</Button></>}
      >
        {dayForm && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--text-muted)]">Nombre
              <input autoFocus value={dayForm.name} onChange={(e) => setDayForm({ ...dayForm, name: e.target.value })} maxLength={60} placeholder="Ej: Push, Lunes, Tren superior" className={`mt-1 w-full ${field}`} />
            </label>
            <label className="text-xs font-medium text-[var(--text-muted)]">Día de la semana
              <select value={dayForm.weekday} onChange={(e) => setDayForm({ ...dayForm, weekday: e.target.value })} className={`mt-1 w-full ${field}`}>
                {WEEKDAY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={dayForm.is_rest} onChange={(e) => setDayForm({ ...dayForm, is_rest: e.target.checked })} className="h-4 w-4 rounded border-[var(--border)]" />
              Día de descanso
            </label>
          </div>
        )}
      </Modal>

      {/* Menú de día */}
      <Modal
        open={!!menuDay}
        onClose={() => setDayMenu(null)}
        title={menuDay?.name ?? ''}
        footer={<Button variant="ghost" onClick={() => setDayMenu(null)}>Cerrar</Button>}
      >
        <div className="flex flex-col gap-2">
          <Button variant="secondary" icon={<Pencil size={16} strokeWidth={2} />} onClick={() => { setDayForm({ id: menuDay!.id, name: menuDay!.name, weekday: menuDay!.weekday === null ? '' : String(menuDay!.weekday), is_rest: menuDay!.is_rest }); setDayMenu(null); }}>Editar día</Button>
          <Button variant="danger" icon={<Trash2 size={16} strokeWidth={2} />} onClick={() => deleteDay(menuDay!.id)}>Eliminar día</Button>
        </div>
      </Modal>

      {/* Form de ejercicio */}
      <ExerciseFormModal
        open={!!exerciseFor}
        onClose={() => setExerciseFor(null)}
        onSave={saveExercise}
        initial={exerciseFor?.exercise}
      />
    </div>
  );
}
