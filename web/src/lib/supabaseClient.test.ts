import { describe, expect, it } from 'vitest';
import { getSupabaseRuntimeState } from './supabaseClient';

describe('getSupabaseRuntimeState', () => {
  it('detecta configuración faltante sin romper la app', () => {
    const state = getSupabaseRuntimeState({ url: '', anonKey: '' });

    expect(state.enabled).toBe(false);
    expect(state.message).toContain('VITE_SUPABASE_URL');
    expect(state.message).toContain('VITE_SUPABASE_ANON_KEY');
  });
});
