-- ============================================================================
-- Bitácora — esquema de datos por usuario (Supabase / Postgres)
-- Ejecutar una vez en: Dashboard > SQL Editor
-- ============================================================================

create table if not exists public.bitacora_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: cada usuario solo puede leer/escribir su propia fila.
-- Esto es lo que hace seguro NO usar la service_role key en la función:
-- la function usa el JWT del propio usuario, y es Postgres (no el código)
-- quien decide qué fila puede tocar.
alter table public.bitacora_data enable row level security;

drop policy if exists "select_own" on public.bitacora_data;
create policy "select_own" on public.bitacora_data
  for select using (auth.uid() = user_id);

drop policy if exists "insert_own" on public.bitacora_data;
create policy "insert_own" on public.bitacora_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "update_own" on public.bitacora_data;
create policy "update_own" on public.bitacora_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nadie puede borrar filas directamente vía API (borrado real solo en cascada
-- si se elimina el usuario). Si más adelante quieres permitir "eliminar cuenta
-- y datos", agrega una policy "delete_own" explícita.

-- Mantener updated_at al día automáticamente en cada UPSERT/UPDATE.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bitacora_data_updated_at on public.bitacora_data;
create trigger trg_bitacora_data_updated_at
  before update on public.bitacora_data
  for each row execute function public.set_updated_at();
