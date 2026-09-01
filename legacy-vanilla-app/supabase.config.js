// ============================================================================
// Configuración pública de Supabase (front del navegador)
// La ANON KEY es pública por diseño (no es secreta). NO coloques aquí la
// service role key. Reemplaza el valor de abajo por tu anon key de Supabase:
//   Dashboard > Settings > API > Project API keys > anon public
//
// NOTA: este archivo DEBE llamarse exactamente "supabase.config.js" (con
// puntos), porque así lo pide index.html:
//   <script src="supabase.config.js"></script>
// Si en tu repo el archivo se llama "supabase_config.js" (con guion bajo),
// el navegador nunca lo carga, window.SUPABASE_CONFIG queda undefined, y
// TODA la autenticación y el guardado en la nube quedan rotos en silencio
// (la app cae a localStorage y parece "funcionar", pero no sincroniza nada).
// ============================================================================
window.SUPABASE_CONFIG = {
  url: 'https://rjmftwujvusprlbxtbbg.supabase.co',
  anonKey: 'sb_publishable_9G-IMcn5S_ZjbYEQd9FNag_d3VlobCK',
  redirectTo: window.location.origin + window.location.pathname,
};
