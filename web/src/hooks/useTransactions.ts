import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeService, type CreateTransactionInput } from '../services/financeService';
import type { FinancialCategory, FinancialTransaction } from '../types/domain';
import { monthRange } from '../utils/dates';
import { useToast } from './useToast';

export function useTransactions(year: number, month0: number) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = monthRange(year, month0);
      const [tx, cats] = await Promise.all([
        financeService.listTransactions(start, end),
        financeService.listCategories(),
      ]);
      setTransactions(tx);
      setCategories(cats);
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudieron cargar los movimientos.', 'err');
    } finally {
      setLoading(false);
    }
  }, [year, month0, push]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    let ingresos = 0, gastos = 0;
    for (const t of transactions) {
      if (t.type === 'ingreso') ingresos += Number(t.amount);
      else gastos += Number(t.amount);
    }
    return { ingresos, gastos, balance: ingresos - gastos };
  }, [transactions]);

  async function addTransaction(input: CreateTransactionInput) {
    try {
      const t = await financeService.createTransaction(input);
      setTransactions((prev) => [t, ...prev]);
      push('Movimiento agregado.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo agregar el movimiento.', 'err');
      throw e;
    }
  }

  async function removeTransaction(id: string) {
    const prev = transactions;
    setTransactions((t) => t.filter((x) => x.id !== id));
    try {
      await financeService.removeTransaction(id);
      push('Movimiento eliminado.', 'ok');
    } catch (e) {
      setTransactions(prev);
      push(e instanceof Error ? e.message : 'No se pudo eliminar.', 'err');
    }
  }

  async function addCategory(name: string, type: 'ingreso' | 'gasto') {
    try {
      const c = await financeService.createCategory(name, type);
      setCategories((prev) => [...prev, c]);
      return c;
    } catch (e) {
      push(e instanceof Error ? e.message : 'No se pudo crear la categoría.', 'err');
      throw e;
    }
  }

  return { transactions, categories, loading, summary, reload: load, addTransaction, removeTransaction, addCategory };
}
