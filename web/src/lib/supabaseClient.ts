import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Falla rápido y con un mensaje claro en vez de un error críptico de fetch.
  // eslint-disable-next-line no-console
  console.error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y complétalo.'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // En el preview de un solo archivo, la app corre en un iframe sandboxeado
    // (about:srcdoc) cuya "location" no es una URL real — dejar que
    // supabase-js intente inspeccionarla para detectar tokens de sesión en
    // el hash revienta con "Failed to construct 'URL': Invalid URL". No hace
    // falta ahí de todos modos (no hay redirects OAuth reales dentro del
    // sandbox), así que se desactiva solo en ese build.
    detectSessionInUrl: !__IS_PREVIEW__,
    flowType: 'pkce', // más seguro que "implicit" para SPAs (ver AUDIT.md)
  },
});
