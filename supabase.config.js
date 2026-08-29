// ============================================================================
// Configuración pública de Supabase (front del navegador)
// La ANON KEY es pública por diseño (no es secreta). NO coloques aquí la
// service role key. Reemplaza el valor de abajo por tu anon key de Supabase:
//   Dashboard > Settings > API > Project API keys > anon public
// ============================================================================
window.SUPABASE_CONFIG = {
  url: 'https://rjmftwujvusprlbxtbbg.supabase.co',
  anonKey: 'TU_ANON_KEY_AQUI', // <-- pega aquí tu "anon public" key
  redirectTo: window.location.origin + window.location.pathname,
};
