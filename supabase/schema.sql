-- ============================================================================
-- Bitácora — esquema de Supabase
-- Ejecuta este script en el "SQL Editor" de Supabase (una sola vez).
-- Crea la tabla que usa la Netlify Function (netlify/functions/bitacora.mjs).
-- ============================================================================

-- Datos por usuario: una fila por usuario con un blob JSON de sus datos.
create table if not exists public.bitacora_user_data (
  user_id    uuid primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Índice por orden de actualización (las consultas son por user_id, ya es PK).
create index if not exists idx_bitacora_updated
  on public.bitacora_user_data (updated_at desc);

-- Activar RLS (Row Level Security). La Netlify Function usa la service role key,
-- que ignora RLS; el actor público no puede leer/escribir esta tabla directamente.
alter table public.bitacora_user_data enable row level security;

-- Política defensiva: ningún actor "anon" puede tocar la tabla directamente.
-- (El acceso real de escritura pasa solo por la Netlify Function con service role.)
drop policy if exists "anon_read_none" on public.bitacora_user_data;
create policy "anon_read_none" on public.bitacora_user_data
  for select using (false);

drop policy if exists "anon_write_none" on public.bitacora_user_data;
create policy "anon_write_none" on public.bitacora_user_data
  for all using (false) with check (false);
