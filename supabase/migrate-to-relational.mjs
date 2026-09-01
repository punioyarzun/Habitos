/**
 * migrate-to-relational.mjs
 * ----------------------------------------------------------------------------
 * Migración ÚNICA y MANUAL: pasa los datos del modelo viejo (una fila JSON por
 * usuario en `bitacora_data`) al esquema relacional nuevo (`habits`,
 * `habit_completions`, `financial_categories`, `financial_transactions`).
 *
 * IMPORTANTE — léelo antes de correrlo:
 * 1. Requiere la SERVICE ROLE KEY porque tiene que leer/escribir datos de
 *    TODOS los usuarios (RLS bloquea eso a propósito para el uso normal de
 *    la app). Corre esto SOLO en tu máquina, nunca lo subas a un repo ni lo
 *    despliegues como función pública.
 * 2. Corre primero con --dry-run: no escribe nada, solo imprime qué haría.
 * 3. Haz un respaldo/snapshot de la base de datos en Supabase antes de correr
 *    la migración real (Dashboard > Database > Backups).
 * 4. Es idempotente para los hábitos y categorías (usa upsert por nombre),
 *    pero las transacciones e cumplimientos se insertan solo si la tabla
 *    destino está vacía para ese usuario, para evitar duplicar si corres el
 *    script dos veces.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node migrate-to-relational.mjs --dry-run
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node migrate-to-relational.mjs
 * ----------------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(...args) {
  console.log(DRY_RUN ? '[dry-run]' : '[migrate]', ...args);
}

async function migrateUser(userId, blob) {
  const habitsConfig = Array.isArray(blob['habits:config']) ? JSON.parse(blob['habits:config'] || '[]') : safeParse(blob['habits:config']);
  const habitDays = safeParse(blob['habits:days']) || {};
  const transactions = safeParse(blob['finance:transactions']) || [];
  const catIngreso = safeParse(blob['finance:cats_ingreso']) || [];
  const catGasto = safeParse(blob['finance:cats_gasto']) || [];

  log(`Usuario ${userId}: ${habitsConfig.length} hábitos, ${Object.keys(habitDays).length} días, ${transactions.length} transacciones`);

  // 1) Hábitos: key (string, ej. "alcohol") -> nueva fila con id UUID propio.
  const keyToNewId = {};
  for (const h of habitsConfig) {
    if (!h || !h.key || !h.label) continue;
    if (DRY_RUN) { keyToNewId[h.key] = `dry-run-${h.key}`; continue; }

    const { data: existing } = await admin
      .from('habits').select('id').eq('user_id', userId).eq('name', h.label).maybeSingle();

    if (existing) {
      keyToNewId[h.key] = existing.id;
      continue;
    }

    const { data: inserted, error } = await admin
      .from('habits')
      .insert({
        user_id: userId,
        name: String(h.label).slice(0, 60),
        icon: h.icon || '⭐',
        color: /^#[0-9a-fA-F]{6}$/.test(h.color) ? h.color : '#5b9bd9',
        status: 'active',
      })
      .select('id').single();

    if (error) { console.error('  ! error creando hábito', h.label, error.message); continue; }
    keyToNewId[h.key] = inserted.id;
  }

  // 2) Cumplimientos: un registro por (día, hábito marcado en true).
  let completionsToInsert = [];
  for (const [dateIso, day] of Object.entries(habitDays)) {
    if (!day || typeof day !== 'object') continue;
    for (const [key, val] of Object.entries(day)) {
      if (key === 'nota' || key === 'perfect' || val !== true) continue;
      const habitId = keyToNewId[key];
      if (!habitId) continue;
      completionsToInsert.push({
        habit_id: habitId,
        user_id: userId,
        completed_date: dateIso,
        note: typeof day.nota === 'string' ? day.nota.slice(0, 2000) : null,
      });
    }
  }
  log(`  -> ${completionsToInsert.length} cumplimientos a insertar`);
  if (!DRY_RUN && completionsToInsert.length) {
    const { error } = await admin.from('habit_completions').upsert(completionsToInsert, { onConflict: 'habit_id,completed_date', ignoreDuplicates: true });
    if (error) console.error('  ! error insertando cumplimientos:', error.message);
  }

  // 3) Categorías financieras.
  const catNameToId = {};
  for (const name of catIngreso) await upsertFinCat(userId, name, 'ingreso', catNameToId, DRY_RUN, admin);
  for (const name of catGasto) await upsertFinCat(userId, name, 'gasto', catNameToId, DRY_RUN, admin);

  // 4) Transacciones.
  const txToInsert = transactions
    .filter(t => t && t.date && t.tipo && typeof t.monto === 'number' && t.monto > 0)
    .map(t => ({
      user_id: userId,
      category_id: catNameToId[`${t.tipo}:${t.categoria}`] || null,
      type: t.tipo,
      amount: t.monto,
      description: t.descripcion || null,
      transaction_date: t.date,
    }));
  log(`  -> ${txToInsert.length} transacciones a insertar`);
  if (!DRY_RUN && txToInsert.length) {
    const { error } = await admin.from('financial_transactions').insert(txToInsert);
    if (error) console.error('  ! error insertando transacciones:', error.message);
  }
}

async function upsertFinCat(userId, name, type, cache, dryRun, admin) {
  if (!name) return;
  const cacheKey = `${type}:${name}`;
  if (dryRun) { cache[cacheKey] = `dry-run-${cacheKey}`; return; }

  const { data: existing } = await admin
    .from('financial_categories').select('id').eq('user_id', userId).eq('name', name).eq('type', type).maybeSingle();
  if (existing) { cache[cacheKey] = existing.id; return; }

  const { data: inserted, error } = await admin
    .from('financial_categories').insert({ user_id: userId, name, type }).select('id').single();
  if (error) { console.error('  ! error creando categoría', name, error.message); return; }
  cache[cacheKey] = inserted.id;
}

function safeParse(v) {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return null; }
}

async function main() {
  log('Iniciando migración' + (DRY_RUN ? ' (DRY RUN, no se escribe nada)' : ''));

  const { data: rows, error } = await admin.from('bitacora_data').select('user_id, data');
  if (error) { console.error('No se pudo leer bitacora_data:', error.message); process.exit(1); }

  log(`${rows.length} usuarios encontrados en bitacora_data`);
  for (const row of rows) {
    await migrateUser(row.user_id, row.data || {});
  }
  log('Migración terminada.' + (DRY_RUN ? ' Vuelve a correr sin --dry-run para aplicar.' : ''));
}

main().catch((e) => { console.error(e); process.exit(1); });
