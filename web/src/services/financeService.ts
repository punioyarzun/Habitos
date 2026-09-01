import { supabase } from '../lib/supabaseClient';
import type { FinancialCategory, FinancialTransaction, TransactionType } from '../types/domain';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay sesión activa.');
  return data.user.id;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  description?: string;
  transaction_date: string; // ISO date
  category_id?: string | null;
}

export const financeService = {
  async listCategories(type?: TransactionType): Promise<FinancialCategory[]> {
    let query = supabase.from('financial_categories').select('*').order('name', { ascending: true });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data as FinancialCategory[];
  },

  async createCategory(name: string, type: TransactionType): Promise<FinancialCategory> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('financial_categories')
      .insert({ user_id, name: name.trim().slice(0, 60), type })
      .select('*')
      .single();
    if (error) throw error;
    return data as FinancialCategory;
  },

  async removeCategory(id: string): Promise<void> {
    const { error } = await supabase.from('financial_categories').delete().eq('id', id);
    if (error) throw error;
  },

  /** Transacciones en un rango de fechas (para el mes/año/rango seleccionado en la UI). */
  async listTransactions(startIso: string, endIso: string): Promise<FinancialTransaction[]> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .gte('transaction_date', startIso)
      .lte('transaction_date', endIso)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data as FinancialTransaction[];
  },

  async createTransaction(input: CreateTransactionInput): Promise<FinancialTransaction> {
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
      throw new Error('El monto debe ser un número positivo.');
    }
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        user_id,
        type: input.type,
        amount: input.amount,
        description: input.description?.slice(0, 300) ?? null,
        transaction_date: input.transaction_date,
        category_id: input.category_id ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as FinancialTransaction;
  },

  async removeTransaction(id: string): Promise<void> {
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (error) throw error;
  },
};
