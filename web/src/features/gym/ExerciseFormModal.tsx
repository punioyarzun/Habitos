import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { MUSCLE_GROUPS } from './gymConstants';
import type { RoutineExercise } from '../../types/domain';
import type { ExerciseInput } from '../../services/gymService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: ExerciseInput) => Promise<void> | void;
  initial?: RoutineExercise | null;
}

const empty = { name: '', muscle_group: MUSCLE_GROUPS[0], target_sets: '3', target_reps: '10', target_weight: '', rest_seconds: '90', notes: '' };

export function ExerciseFormModal({ open, onClose, onSave, initial }: Props) {
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setF({
        name: initial.name,
        muscle_group: initial.muscle_group ?? MUSCLE_GROUPS[0],
        target_sets: String(initial.target_sets),
        target_reps: String(initial.target_reps),
        target_weight: initial.target_weight != null ? String(initial.target_weight) : '',
        rest_seconds: String(initial.rest_seconds),
        notes: initial.notes ?? '',
      });
    } else {
      setF(empty);
    }
    setError(null);
  }, [open, initial]);

  async function handleSave() {
    if (!f.name.trim()) { setError('Ponle un nombre al ejercicio.'); return; }
    setBusy(true);
    try {
      await onSave({
        name: f.name.trim(),
        muscle_group: f.muscle_group || null,
        target_sets: Number(f.target_sets) || 0,
        target_reps: Number(f.target_reps) || 0,
        target_weight: f.target_weight ? Number(f.target_weight) : null,
        rest_seconds: Number(f.rest_seconds) || 0,
        notes: f.notes.trim() || null,
      });
      onClose();
    } catch {
      setError('No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm';
  const label = 'text-xs font-medium text-[var(--text-muted)]';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={busy}>{initial ? 'Guardar' : 'Agregar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className={label}>
          Nombre
          <input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} placeholder="Ej: Press de banca" className={`mt-1 w-full ${field}`} />
        </label>
        <label className={label}>
          Grupo muscular
          <select value={f.muscle_group} onChange={(e) => setF({ ...f, muscle_group: e.target.value })} className={`mt-1 w-full ${field}`}>
            {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className={label}>Series<input type="number" min="0" value={f.target_sets} onChange={(e) => setF({ ...f, target_sets: e.target.value })} className={`mt-1 w-full ${field}`} /></label>
          <label className={label}>Reps<input type="number" min="0" value={f.target_reps} onChange={(e) => setF({ ...f, target_reps: e.target.value })} className={`mt-1 w-full ${field}`} /></label>
          <label className={label}>Peso (kg)<input type="number" min="0" step="0.5" value={f.target_weight} onChange={(e) => setF({ ...f, target_weight: e.target.value })} placeholder="—" className={`mt-1 w-full ${field}`} /></label>
        </div>
        <label className={label}>
          Descanso (segundos)
          <input type="number" min="0" step="15" value={f.rest_seconds} onChange={(e) => setF({ ...f, rest_seconds: e.target.value })} className={`mt-1 w-full ${field}`} />
        </label>
        <label className={label}>
          Notas
          <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={200} placeholder="Opcional" className={`mt-1 w-full ${field}`} />
        </label>
        {error && <p className="text-xs text-[var(--color-danger-text)]">{error}</p>}
      </div>
    </Modal>
  );
}
