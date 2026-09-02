import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, Check, Copy, Trash2, Pencil, MoreVertical, Star } from 'lucide-react';
import { useRoutines } from '../../hooks/useRoutines';
import { EmptyState, Skeleton } from '../../components/ui/primitives';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ROUTINE_PRESETS } from '../../utils/routinePresets';
import { ROUTINE_TYPE_LABELS } from '../../features/gym/gymConstants';

export function RoutinesPage() {
  const navigate = useNavigate();
  const { routines, loading, createBlank, createFromPreset, duplicate, remove, setActive } = useRoutines();
  const [showCreate, setShowCreate] = useState(false);
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const menuRoutine = routines.find((r) => r.id === menuFor) ?? null;

  async function handlePreset(index: number) {
    setBusy(true);
    const r = await createFromPreset(ROUTINE_PRESETS[index]);
    setBusy(false);
    if (r) { setShowCreate(false); navigate(`/gimnasio/rutinas/${r.id}`); }
  }

  async function handleBlank() {
    if (!customName.trim()) return;
    setBusy(true);
    const r = await createBlank(customName.trim(), 'custom');
    setBusy(false);
    if (r) { setShowCreate(false); setCustomName(''); navigate(`/gimnasio/rutinas/${r.id}`); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">Elige una rutina y márcala como activa.</p>
        <Button onClick={() => setShowCreate(true)}>+ Nueva</Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={26} strokeWidth={1.5} />}
          title="No tienes rutinas todavía"
          description="Empieza con una plantilla o crea la tuya desde cero."
          action={<Button onClick={() => setShowCreate(true)}>Crear rutina</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${r.is_active ? 'bg-brand-500 text-[var(--color-brand-ink)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                <Dumbbell size={20} strokeWidth={2} />
              </span>
              <Link to={`/gimnasio/rutinas/${r.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {r.name}
                  {r.is_active && <span className="shrink-0 rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand-text)]">Activa</span>}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">{ROUTINE_TYPE_LABELS[r.type]}{r.description ? ` · ${r.description}` : ''}</p>
              </Link>
              {!r.is_active && (
                <button onClick={() => setActive(r.id)} title="Marcar como activa" className="shrink-0 rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--color-brand-text)]">
                  <Star size={16} strokeWidth={2} />
                </button>
              )}
              <button onClick={() => setMenuFor(r.id)} className="shrink-0 rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label={`Opciones de ${r.name}`}>
                <MoreVertical size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Crear rutina */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva rutina">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Plantillas</p>
            <div className="grid gap-2">
              {ROUTINE_PRESETS.map((p, i) => (
                <button
                  key={p.type}
                  disabled={busy}
                  onClick={() => handlePreset(i)}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-left transition-colors hover:border-[var(--color-brand-text)]/60 hover:bg-[var(--surface-2)] disabled:opacity-60"
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{p.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Personalizada</p>
            <div className="flex gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBlank(); }}
                maxLength={80}
                placeholder="Nombre de tu rutina"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
              <Button onClick={handleBlank} loading={busy} disabled={!customName.trim()}>Crear</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Menú de rutina */}
      <Modal
        open={!!menuRoutine}
        onClose={() => setMenuFor(null)}
        title={menuRoutine?.name ?? ''}
        footer={<Button variant="ghost" onClick={() => setMenuFor(null)}>Cerrar</Button>}
      >
        <div className="flex flex-col gap-2">
          {menuRoutine && !menuRoutine.is_active && (
            <Button variant="secondary" icon={<Check size={16} strokeWidth={2} />} onClick={() => { setActive(menuRoutine.id); setMenuFor(null); }}>Marcar como activa</Button>
          )}
          <Button variant="secondary" icon={<Pencil size={16} strokeWidth={2} />} onClick={() => { navigate(`/gimnasio/rutinas/${menuRoutine!.id}`); setMenuFor(null); }}>Editar días y ejercicios</Button>
          <Button variant="secondary" icon={<Copy size={16} strokeWidth={2} />} onClick={() => { duplicate(menuRoutine!.id); setMenuFor(null); }}>Duplicar</Button>
          <Button variant="danger" icon={<Trash2 size={16} strokeWidth={2} />} onClick={() => { setConfirmDelete(menuRoutine!.id); setMenuFor(null); }}>Eliminar</Button>
        </div>
      </Modal>

      {/* Confirmar borrado */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar rutina?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { remove(confirmDelete!); setConfirmDelete(null); }}>Eliminar</Button>
          </>
        }
      >
        Se elimina la rutina con todos sus días y ejercicios. Tu historial de entrenamientos ya realizados no se borra.
      </Modal>
    </div>
  );
}
