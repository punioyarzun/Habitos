import { useState, type FormEvent } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { Card, EmptyState, Skeleton } from '../components/ui/primitives';
import { Receipt, Trash2, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MonthNav } from '../components/ui/MonthNav';
import { formatCLP } from '../utils/currency';
import { todayIso, formatDateShort } from '../utils/dates';
import type { TransactionType } from '../types/domain';

export function FinancePage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const { transactions, categories, loading, summary, addTransaction, removeTransaction, addCategory } = useTransactions(cursor.year, cursor.month0);

  const [type, setType] = useState<TransactionType>('gasto');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const catsForType = categories.filter((c) => c.type === type);
  const monthLabel = new Date(cursor.year, cursor.month0, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const num = Number(amount);
    if (!(num > 0)) { setError('Ingresa un monto válido.'); return; }
    setBusy(true);
    try {
      let catId = categoryId || null;
      if (!catId && newCategory.trim()) {
        const c = await addCategory(newCategory.trim(), type);
        catId = c.id;
      }
      await addTransaction({ type, amount: num, category_id: catId, description: description.trim() || undefined, transaction_date: date });
      setAmount(''); setDescription(''); setNewCategory(''); setCategoryId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold capitalize">Finanzas — {monthLabel}</h1>
        <MonthNav
          onPrev={() => setCursor((c) => c.month0 === 0 ? { year: c.year - 1, month0: 11 } : { year: c.year, month0: c.month0 - 1 })}
          onNext={() => setCursor((c) => c.month0 === 11 ? { year: c.year + 1, month0: 0 } : { year: c.year, month0: c.month0 + 1 })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 font-display text-base font-bold text-[var(--color-money-in-text)] sm:text-lg"><TrendingUp size={15} strokeWidth={2} className="shrink-0" />{formatCLP(summary.ingresos)}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Ingresos</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 font-display text-base font-bold text-[var(--color-money-out-text)] sm:text-lg"><TrendingDown size={15} strokeWidth={2} className="shrink-0" />{formatCLP(summary.gastos)}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Gastos</p>
        </Card>
        <Card className="p-4">
          <p className={`flex items-center gap-1.5 font-display text-base font-bold sm:text-lg ${summary.balance >= 0 ? 'text-[var(--text)]' : 'text-[var(--color-money-out-text)]'}`}><Scale size={15} strokeWidth={2} className="shrink-0 text-[var(--text-muted)]" />{formatCLP(summary.balance)}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Balance</p>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => { setType('gasto'); setCategoryId(''); }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${type === 'gasto' ? 'bg-[var(--color-money-out)]/15 text-[var(--color-money-out-text)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>Gasto</button>
            <button type="button" onClick={() => { setType('ingreso'); setCategoryId(''); }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${type === 'ingreso' ? 'bg-[var(--color-money-in)]/15 text-[var(--color-money-in-text)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>Ingreso</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
            <input type="number" min="0" step="1" placeholder="Monto (CLP)" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
              <option value="">Sin categoría</option>
              {catsForType.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Nueva categoría (opcional)" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
          </div>
          <input placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
          {error && <p className="text-xs text-[var(--color-danger-text)]">{error}</p>}
          <Button type="submit" loading={busy} className="w-fit">Agregar</Button>
        </form>
      </Card>

      <h2 className="mb-2 mt-6 font-display text-base font-semibold">Movimientos</h2>
      {loading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      ) : transactions.length === 0 ? (
        <EmptyState icon={<Receipt size={26} strokeWidth={1.5} />} title="Sin movimientos este mes" />
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((t) => {
            const cat = categories.find((c) => c.id === t.category_id);
            return (
              <div key={t.id} className="card flex items-center gap-3 p-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${t.type === 'ingreso' ? 'bg-[var(--color-money-in)]' : 'bg-[var(--color-money-out)]'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cat?.name ?? (t.type === 'ingreso' ? 'Otro ingreso' : 'Otro gasto')}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{t.description || '—'} · {formatDateShort(t.transaction_date)}</p>
                </div>
                <span className={`shrink-0 font-mono text-sm font-semibold ${t.type === 'ingreso' ? 'text-[var(--color-money-in-text)]' : 'text-[var(--color-money-out-text)]'}`}>
                  {t.type === 'ingreso' ? '+' : '-'}{formatCLP(t.amount)}
                </span>
                <button onClick={() => removeTransaction(t.id)} className="shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--color-danger-text)]" aria-label="Eliminar movimiento"><Trash2 size={15} strokeWidth={2} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
