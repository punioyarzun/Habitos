import { useState } from 'react';
import { useHabits } from '../hooks/useHabits';
import { HabitCard } from '../features/habits/HabitCard';
import { CreateHabitForm } from '../features/habits/CreateHabitForm';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { EmptyState, Skeleton } from '../components/ui/primitives';
import { Sparkles } from 'lucide-react';
import type { Habit } from '../types/domain';

export function HabitsPage() {
  const { habits, loading, createHabit, toggleToday, setStatus, removeHabit, categoryNameById } = useHabits();
  const [showCreate, setShowCreate] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<Habit['status']>('active');

  const filtered = habits.filter((h) => h.status === filter);
  const menuHabit = habits.find((h) => h.id === menuFor) ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Hábitos</h1>
          <p className="text-sm text-[var(--text-muted)]">Crea, edita y sigue tus hábitos diarios.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo</Button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1 text-sm w-fit">
        {(['active', 'paused', 'archived'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 font-medium ${filter === s ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'text-[var(--text-muted)]'}`}
          >
            {s === 'active' ? 'Activos' : s === 'paused' ? 'Pausados' : 'Archivados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={26} strokeWidth={1.5} />}
          title={filter === 'active' ? 'Todavía no tienes hábitos activos' : `No hay hábitos ${filter === 'paused' ? 'pausados' : 'archivados'}`}
          description={filter === 'active' ? 'Crea tu primer hábito para empezar a construir constancia.' : undefined}
          action={filter === 'active' ? <Button onClick={() => setShowCreate(true)}>Crear hábito</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((h) => (
            <HabitCard key={h.id} habit={h} onToggleToday={toggleToday} onOpenMenu={setMenuFor} categoryName={h.category_id ? categoryNameById.get(h.category_id) : undefined} />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo hábito">
        <CreateHabitForm onSubmit={createHabit} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={!!menuHabit}
        onClose={() => setMenuFor(null)}
        title={menuHabit?.name ?? ''}
        footer={
          <Button variant="ghost" onClick={() => setMenuFor(null)}>Cerrar</Button>
        }
      >
        <div className="flex flex-col gap-2">
          {menuHabit?.status !== 'active' && (
            <Button variant="secondary" onClick={() => { setStatus(menuHabit!.id, 'active'); setMenuFor(null); }}>Reactivar</Button>
          )}
          {menuHabit?.status === 'active' && (
            <Button variant="secondary" onClick={() => { setStatus(menuHabit!.id, 'paused'); setMenuFor(null); }}>Pausar</Button>
          )}
          {menuHabit?.status !== 'archived' && (
            <Button variant="secondary" onClick={() => { setStatus(menuHabit!.id, 'archived'); setMenuFor(null); }}>Archivar</Button>
          )}
          <Button variant="danger" onClick={() => { setConfirmDelete(menuHabit!.id); setMenuFor(null); }}>Eliminar definitivamente</Button>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar hábito?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { removeHabit(confirmDelete!); setConfirmDelete(null); }}>Eliminar</Button>
          </>
        }
      >
        Esto borra el hábito y todo su historial de cumplimiento. No se puede deshacer.
      </Modal>
    </div>
  );
}
