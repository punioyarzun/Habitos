-- ============================================================================
-- Bitácora — esquema relacional v2
-- Reemplaza el modelo "un JSON por usuario" (bitacora_data) por tablas
-- normalizadas. Ejecutar en: Supabase Dashboard > SQL Editor.
--
-- Diseño de acceso: NO se usa una service_role key en el cliente. El front
-- (React) habla directo con Supabase usando el JWT del usuario logueado, y
-- es Row Level Security (RLS) quien decide qué fila puede leer/escribir cada
-- quien. Esto elimina la necesidad de la Netlify Function bitacora.mjs para
-- operaciones normales de CRUD: Supabase ya expone una API REST (PostgREST)
-- segura por su cuenta. bitacora.mjs queda solo para la lógica que sí
-- necesite privilegios elevados en el futuro (si aplica).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Perfil de usuario (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme        text not null default 'dark' check (theme in ('light','dark')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categorías de hábito (p.ej. "Vicio a dejar" / "Hábito a construir")
-- ---------------------------------------------------------------------------
create table if not exists public.habit_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('vicio','habito')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hábitos
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category_id  uuid references public.habit_categories(id) on delete set null,
  name         text not null check (char_length(trim(name)) > 0),
  description  text,
  icon         text not null default '⭐',
  color        text not null default '#5b9bd9' check (color ~ '^#[0-9a-fA-F]{6}$'),
  frequency    text not null default 'daily' check (frequency in ('daily','weekly','custom')),
  active_days  int[] not null default '{0,1,2,3,4,5,6}', -- 0=domingo … 6=sábado
  start_date   date not null default current_date,
  status       text not null default 'active' check (status in ('active','paused','archived')),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_habits_user on public.habits(user_id);
create index if not exists idx_habits_user_status on public.habits(user_id, status);

-- ---------------------------------------------------------------------------
-- Cumplimiento diario de hábitos
-- ---------------------------------------------------------------------------
create table if not exists public.habit_completions (
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid not null references public.habits(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  note           text,
  created_at     timestamptz not null default now(),
  unique (habit_id, completed_date)
);

create index if not exists idx_completions_user_date on public.habit_completions(user_id, completed_date);
create index if not exists idx_completions_habit on public.habit_completions(habit_id);

-- ---------------------------------------------------------------------------
-- Categorías financieras
-- ---------------------------------------------------------------------------
create table if not exists public.financial_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('ingreso','gasto')),
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

-- ---------------------------------------------------------------------------
-- Transacciones financieras
-- ---------------------------------------------------------------------------
create table if not exists public.financial_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  category_id        uuid references public.financial_categories(id) on delete set null,
  type               text not null check (type in ('ingreso','gasto')),
  amount             numeric(14,2) not null check (amount > 0),
  description        text,
  transaction_date   date not null,
  created_at         timestamptz not null default now()
);

create index if not exists idx_tx_user_date on public.financial_transactions(user_id, transaction_date desc);
create index if not exists idx_tx_user_type on public.financial_transactions(user_id, type);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_habits_updated_at on public.habits;
create trigger trg_habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: cada usuario solo ve/toca sus propias filas.
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.habit_categories      enable row level security;
alter table public.habits                enable row level security;
alter table public.habit_completions     enable row level security;
alter table public.financial_categories  enable row level security;
alter table public.financial_transactions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','habit_categories','habits','habit_completions','financial_categories','financial_transactions']
  loop
    execute format('drop policy if exists "select_own" on public.%I', t);
    execute format('create policy "select_own" on public.%I for select using (auth.uid() = user_id)', t);

    execute format('drop policy if exists "insert_own" on public.%I', t);
    execute format('create policy "insert_own" on public.%I for insert with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "update_own" on public.%I', t);
    execute format('create policy "update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "delete_own" on public.%I', t);
    execute format('create policy "delete_own" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- profiles usa user_id como PK, no una columna "id" propia — la policy de
-- arriba funciona igual porque compara auth.uid() = user_id en todos los casos.

-- ---------------------------------------------------------------------------
-- Crear el perfil automáticamente cuando alguien se registra.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
