// ============================================================================
// BITÁCORA — Netlify Function: datos por usuario sobre Supabase
// ----------------------------------------------------------------------------
// Autenticación: el front del navegador obtiene un JWT de Supabase Auth
//   (email+password o Google/GitHub OAuth) y lo envía en el header
//   "Authorization: Bearer <token>".
// Esta función valida el token con supabase.auth.getUser() y, si es válido,
//   lee/escribe los datos del usuario en la tabla "bitacora_user_data".
// El user_id se toma SIEMPRE del token validado (nunca del body).
//
// Acciones (POST /api/bitacora):
//   load  -> devuelve el blob completo del usuario { data: {...} }
//   save  -> upsert/merge { key, value } en el blob del usuario
//   clear -> borra una clave { key } del blob del usuario
//
// Variables de entorno requeridas en Netlify:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('Faltan variables SUPABASE_URL / ANON / SERVICE_ROLE en Netlify');
}

// El "service role" ignora RLS y permite escrituras con el user_id de auth.
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

function respond(statusCode, obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function readAuthToken(headers) {
  const auth = (headers.get ? headers.get('authorization') : null)
    || (headers.authorization || headers.Authorization || '');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export default async function handler(input, context) {
  // Compatibilidad: runtime v2 pasa un objeto Request (Web API); v1 pasa el event.
  const isRequest = typeof input !== 'undefined' && typeof input.json === 'function' && typeof input.method === 'string';
  const method = isRequest ? input.method : input.httpMethod;
  const headers = isRequest ? input.headers : (input.headers || {});
  const rawBody = isRequest
    ? await input.text().catch(() => '')
    : (input.body || '');

  if (method !== 'POST') {
    return respond(405, { error: 'method_not_allowed' });
  }

  const token = readAuthToken(headers);
  if (!token) return respond(401, { error: 'missing_token' });

  // 1) Validar el JWT y obtener el user_id
  let user;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data || !data.user) throw new Error('invalid_token');
    user = data.user;
  } catch (e) {
    return respond(401, { error: 'unauthorized', detail: String(e.message || e) });
  }

  const userId = user.id;

  // 2) Parsear el body
  let body;
  try { body = rawBody ? JSON.parse(rawBody) : {}; }
  catch (e) { return respond(400, { error: 'invalid_json' }); }

  const { action, key, value } = body || {};

  // Tabla por usuario: una fila con un blob jsonb `data` { clave: valor }
  async function ensureRow() {
    const { data, error } = await admin
      .from('bitacora_user_data')
      .upsert({ user_id: userId, data: {} }, { onConflict: 'user_id' })
      .select('*').single();
    if (error) throw error;
    return data;
  }

  try {
    if (action === 'load') {
      const { data, error } = await admin
        .from('bitacora_user_data')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return respond(200, { data: data && data.data ? data.data : {} });
    }

    if (action === 'save') {
      if (key == null) return respond(400, { error: 'key_required' });
      const row = await ensureRow();
      const next = { ...(row.data || {}), [key]: value };
      const { error } = await admin
        .from('bitacora_user_data')
        .update({ data: next, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
      return respond(200, { ok: true });
    }

    if (action === 'clear') {
      const { data: row, error: e1 } = await admin
        .from('bitacora_user_data').select('data').eq('user_id', userId).maybeSingle();
      if (e1) throw e1;
      if (row && row.data) {
        const next = { ...row.data };
        if (key != null) delete next[key];
        const { error } = await admin
          .from('bitacora_user_data').update({ data: next, updated_at: new Date().toISOString() }).eq('user_id', userId);
        if (error) throw error;
      }
      return respond(200, { ok: true });
    }

    return respond(400, { error: 'unknown_action', action });
  } catch (e) {
    console.error('bitacora error:', e);
    return respond(500, { error: 'server_error', detail: String(e.message || e) });
  }
}
