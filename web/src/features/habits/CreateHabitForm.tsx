import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { DEFAULT_ICONS, SWATCH_COLORS } from '../../utils/validation';
import type { CreateHabitInput } from '../../services/habitsService';
import { habitCategoriesService, type HabitCategory } from '../../services/habitCategoriesService';

export function CreateHabitForm({ onSubmit, onCancel }: { onSubmit: (input: CreateHabitInput) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICONS[0]);
  const [color, setColor] = useState(SWATCH_COLORS[0]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryKind, setNewCategoryKind] = useState<'vicio' | 'habito'>('habito');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    habitCategoriesService.list().then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Ponle un nombre al hábito.'); return; }
    setBusy(true);
    setError(null);
    try {
      let finalCategoryId: string | null = categoryId || null;
      if (!finalCategoryId && newCategory.trim()) {
        const c = await habitCategoriesService.create(newCategory.trim(), newCategoryKind);
        finalCategoryId = c.id;
      }
      await onSubmit({ name: name.trim(), icon, color, category_id: finalCategoryId });
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="text-xs font-medium text-[var(--text-muted)]">
        Nombre
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Ej: Ejercicio, Leer, Meditar…"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)]"
        />
      </label>

      <div>
        <span className="text-xs font-medium text-[var(--text-muted)]">Categoría (opcional)</span>
        <div className="mt-1.5 flex flex-col gap-2">
          {categories.length > 0 && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.kind === 'vicio' ? 'a dejar' : 'a construir'})</option>
              ))}
            </select>
          )}
          {!categoryId && (
            <div className="flex gap-2">
              <input
                placeholder="Nueva categoría, ej: Salud"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={40}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
              <select
                value={newCategoryKind}
                onChange={(e) => setNewCategoryKind(e.target.value as 'vicio' | 'habito')}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-xs"
              >
                <option value="habito">A construir</option>
                <option value="vicio">A dejar</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div>
        <span className="text-xs font-medium text-[var(--text-muted)]">Icono</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DEFAULT_ICONS.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setIcon(i)}
              className={`grid h-9 w-9 place-items-center rounded-lg border text-base ${icon === i ? 'border-[var(--color-brand-text)] bg-brand-500/10' : 'border-[var(--border)]'}`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs font-medium text-[var(--text-muted)]">Color</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {SWATCH_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className="h-7 w-7 rounded-full border-2"
              style={{ background: c, borderColor: color === c ? 'var(--text)' : 'transparent' }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-[var(--color-danger-text)]">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={busy}>Crear hábito</Button>
      </div>
    </form>
  );
}
