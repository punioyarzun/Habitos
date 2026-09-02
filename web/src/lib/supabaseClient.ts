import { createClient } from '@supabase/supabase-js';

export function getSupabaseRuntimeState(input?: { url?: string; anonKey?: string }) {
  const url = input?.url ?? (import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const anonKey = input?.anonKey ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  const enabled = Boolean(url && anonKey && url.startsWith('http'));

  return {
    url: url ?? '',
    anonKey: anonKey ?? '',
    enabled,
    message: enabled
      ? ''
      : 'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia web/.env.example a web/.env.local y complétalo.',
  };
}

function buildMissingQueryBuilder() {
  const chain: Record<string, any> = {
    select() { return chain; },
    eq() { return chain; },
    gte() { return chain; },
    lte() { return chain; },
    order() { return chain; },
    update() { return chain; },
    insert() { return chain; },
    delete() { return chain; },
    upsert() { return chain; },
    maybeSingle: async () => {
      throw new Error(getSupabaseRuntimeState().message);
    },
    single: async () => {
      throw new Error(getSupabaseRuntimeState().message);
    },
  };

  return chain;
}

function createMissingSupabaseClient() {
  const message = getSupabaseRuntimeState().message;

  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithPassword() {
        throw new Error(message);
      },
      async signUp() {
        throw new Error(message);
      },
      async signInWithOAuth() {
        throw new Error(message);
      },
      async resetPasswordForEmail() {
        throw new Error(message);
      },
      async updateUser() {
        throw new Error(message);
      },
      async signOut() {
        return { error: null };
      },
      async getUser() {
        return { data: { user: null }, error: null };
      },
    },
    from() {
      return buildMissingQueryBuilder();
    },
  } as any;
}

const runtime = getSupabaseRuntimeState();

if (!runtime.enabled) {
  // eslint-disable-next-line no-console
  console.error(runtime.message);
}

export const supabase = runtime.enabled
  ? createClient(runtime.url, runtime.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !__IS_PREVIEW__,
        flowType: 'pkce',
      },
    })
  : createMissingSupabaseClient();
