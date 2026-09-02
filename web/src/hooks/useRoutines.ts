import { useCallback, useEffect, useMemo, useState } from 'react';
import { gymService } from '../services/gymService';
import type { WorkoutRoutine, RoutineType } from '../types/domain';
import type { RoutinePreset } from '../utils/routinePresets';
import { useToast } from './useToast';

export function useRoutines() {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoutines(await gymService.listRoutines());
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudieron cargar las rutinas.', 'err');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  const activeRoutine = useMemo(() => routines.find((r) => r.is_active) ?? null, [routines]);

  async function createBlank(name: string, type: RoutineType = 'custom', description?: string): Promise<WorkoutRoutine | null> {
    try {
      const r = await gymService.createRoutine({ name, type, description });
      setRoutines((prev) => [...prev, r]);
      push('Rutina creada.', 'ok');
      return r;
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo crear la rutina.', 'err');
      return null;
    }
  }

  async function createFromPreset(preset: RoutinePreset): Promise<WorkoutRoutine | null> {
    try {
      const r = await gymService.createFromPreset(preset);
      await load();
      push(`Rutina "${preset.name}" agregada.`, 'ok');
      return r;
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo crear la rutina.', 'err');
      return null;
    }
  }

  async function duplicate(id: string): Promise<WorkoutRoutine | null> {
    try {
      const r = await gymService.duplicateRoutine(id);
      await load();
      push('Rutina duplicada.', 'ok');
      return r;
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo duplicar.', 'err');
      return null;
    }
  }

  async function remove(id: string) {
    const prev = routines;
    setRoutines((r) => r.filter((x) => x.id !== id));
    try {
      await gymService.removeRoutine(id);
      push('Rutina eliminada.', 'ok');
    } catch (e) {
      setRoutines(prev);
      push(e instanceof Error ? e.message : 'No se pudo eliminar.', 'err');
    }
  }

  async function setActive(id: string) {
    const prev = routines;
    setRoutines((r) => r.map((x) => ({ ...x, is_active: x.id === id })));
    try {
      await gymService.setActive(id);
      push('Rutina activada.', 'ok');
    } catch (e) {
      setRoutines(prev);
      push(e instanceof Error ? e.message : 'No se pudo activar.', 'err');
    }
  }

  async function rename(id: string, patch: { name?: string; description?: string; type?: RoutineType }) {
    try {
      await gymService.updateRoutine(id, patch);
      setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo actualizar.', 'err');
    }
  }

  return { routines, activeRoutine, loading, reload: load, createBlank, createFromPreset, duplicate, remove, setActive, rename };
}
