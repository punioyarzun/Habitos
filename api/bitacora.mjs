import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const ALLOWED_KEYS = new Set([
  'habits:config',
  'habits:days',
  'finance:transactions',
  'app:featured',
  'finance:cats_ingreso',
  'finance:cats_gasto',
  'app:recovery_seeded_v1',
]);

const MAX_VALUE_LEN = 500000;

function json(res, statusCode, body) {
  res.status(statusCode).setHeader('Cache-Control', 'no-store').json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 500, { error: 'server_misconfigured' });

  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(res, 401, { error: 'missing_token' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'bad_json' }); }
  }

  const { action, key, value } = body || {};

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userRes || !userRes.user) return json(res, 401, { error: 'invalid_token' });
  const userId = userRes.user.id;

  try {
    if (action === 'load') {
      const { data, error } = await supabase
        .from('bitacora_data')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return json(res, 200, { data: (data && data.data) || {} });
    }

    if (action === 'save') {
      if (!key || !ALLOWED_KEYS.has(key)) return json(res, 400, { error: 'invalid_key' });
      if (typeof value !== 'string' || value.length > MAX_VALUE_LEN) {
        return json(res, 400, { error: 'invalid_value' });
      }

      const { data: existing, error: readErr } = await supabase
        .from('bitacora_data').select('data').eq('user_id', userId).maybeSingle();
      if (readErr) throw readErr;

      const merged = Object.assign({}, (existing && existing.data) || {}, { [key]: value });

      const { error: writeErr } = await supabase
        .from('bitacora_data')
        .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
      if (writeErr) throw writeErr;

      return json(res, 200, { ok: true });
    }

    if (action === 'clear') {
      if (!key || !ALLOWED_KEYS.has(key)) return json(res, 400, { error: 'invalid_key' });

      const { data: existing, error: readErr } = await supabase
        .from('bitacora_data').select('data').eq('user_id', userId).maybeSingle();
      if (readErr) throw readErr;

      const merged = Object.assign({}, (existing && existing.data) || {});
      delete merged[key];

      const { error: writeErr } = await supabase
        .from('bitacora_data')
        .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
      if (writeErr) throw writeErr;

      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: 'unknown_action' });
  } catch (e) {
    return json(res, 500, { error: 'db_error', detail: e.message });
  }
}
