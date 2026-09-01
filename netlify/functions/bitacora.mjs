// ============================================================================
// Bitácora — backend serverless (Netlify Function)
// Implementa el endpoint POST /api/bitacora (ver netlify.toml, que redirige
// /api/* -> /.netlify/functions/:splat), consumido por auth.js (apiRaw()).
//
// Diseño de seguridad: en vez de una service_role key (que se salta RLS y es
// un secreto de alto riesgo), este handler crea un cliente de Supabase
// "en nombre del usuario" usando SU propio JWT. Quien decide qué fila puede
// leer/escribir cada usuario es Postgres (Row Level Security en
// supabase/schema.sql), no este código. Menos secretos, menos superficie de
// ataque, y un bug en este archivo no puede filtrar datos de otro usuario.
//
// Variables de entorno requeridas en Netlify (Site settings > Environment):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
// (NO se necesita SUPABASE_SERVICE_ROLE_KEY con este diseño.)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Whitelist de claves permitidas: debe reflejar APP_KEYS en auth.js.
const ALLOWED_KEYS = new Set([
  'habits:config',
  'habits:days',
  'finance:transactions',
  'app:featured',
  'finance:cats_ingreso',
  'finance:cats_gasto',
  'app:recovery_seeded_v1',
]);

const MAX_VALUE_LEN = 500000; // ~500 KB por bloque, margen amplio

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(500, { error: 'server_misconfigured' });

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(401, { error: 'missing_token' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad_json' }); }
  const { action, key, value } = body;

  // Cliente "scoped" al JWT del usuario -> RLS decide el acceso.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userRes || !userRes.user) return json(401, { error: 'invalid_token' });
  const userId = userRes.user.id;

  try {
    if (action === 'load') {
      const { data, error } = await supabase
        .from('bitacora_data')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return json(200, { data: (data && data.data) || {} });
    }

    if (action === 'save') {
      if (!key || !ALLOWED_KEYS.has(key)) return json(400, { error: 'invalid_key' });
      if (typeof value !== 'string' || value.length > MAX_VALUE_LEN) {
        return json(400, { error: 'invalid_value' });
      }

      const { data: existing, error: readErr } = await supabase
        .from('bitacora_data').select('data').eq('user_id', userId).maybeSingle();
      if (readErr) throw readErr;

      const merged = Object.assign({}, (existing && existing.data) || {}, { [key]: value });

      const { error: writeErr } = await supabase
        .from('bitacora_data')
        .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
      if (writeErr) throw writeErr;

      return json(200, { ok: true });
    }

    if (action === 'clear') {
      if (!key || !ALLOWED_KEYS.has(key)) return json(400, { error: 'invalid_key' });

      const { data: existing, error: readErr } = await supabase
        .from('bitacora_data').select('data').eq('user_id', userId).maybeSingle();
      if (readErr) throw readErr;

      const merged = Object.assign({}, (existing && existing.data) || {});
      delete merged[key];

      const { error: writeErr } = await supabase
        .from('bitacora_data')
        .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
      if (writeErr) throw writeErr;

      return json(200, { ok: true });
    }

    return json(400, { error: 'unknown_action' });
  } catch (e) {
    return json(500, { error: 'db_error', detail: e.message });
  }
}
