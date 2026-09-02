-- ============================================================================
-- Bitácora — extensión Gimnasio + Recordatorios
-- Migración ADITIVA e IDEMPOTENTE. No toca ninguna tabla existente
-- (habits, habit_completions, financial_*, profiles). Se puede correr las
-- veces que haga falta sin romper nada.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (misma cuenta donde ya corriste
-- schema_v2.sql). Usa el mismo modelo de seguridad: RLS por user_id, sin
-- service_role en el cliente.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ===========================================================================
-- GIMNASIO
-- ===========================================================================

-- Rutina de entrenamiento (plantilla). El usuario puede tener varias; una sola
-- marcada como activa a la vez (se fuerza desde el cliente, no con constraint,
-- para permitir "ninguna activa").
create table if not exists public.workout_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(trim(name)) > 0),
  description text,
  -- fullbody | ppl | upper_lower | beginner | custom
  type        text not null default 'custom' check (type in ('fullbody','ppl','upper_lower','beginner','custom')),
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_routines_user on public.workout_routines(user_id);
create index if not exists idx_routines_user_active on public.workout_routines(user_id, is_active);

-- Un día dentro de una rutina (p.ej. "Push", "Lunes", "Tren superior").
-- weekday: 0=domingo … 6=sábado, opcional (para calendario/planificación).
create table if not exists public.routine_days (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references public.workout_routines(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Día',
  weekday     int check (weekday between 0 and 6),
  is_rest     boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_routine_days_routine on public.routine_days(routine_id);
create index if not exists idx_routine_days_user on public.routine_days(user_id);

-- Ejercicio plantilla dentro de un día (objetivos, no lo realizado).
create table if not exists public.routine_exercises (
  id             uuid primary key default gen_random_uuid(),
  day_id         uuid not null references public.routine_days(id) on delete cascade,
  routine_id     uuid not null references public.workout_routines(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (char_length(trim(name)) > 0),
  muscle_group   text,
  target_sets    int not null default 3 check (target_sets between 0 and 50),
  target_reps    int not null default 10 check (target_reps between 0 and 500),
  target_weight  numeric(7,2) check (target_weight >= 0),
  rest_seconds   int not null default 90 check (rest_seconds between 0 and 3600),
  notes          text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists idx_routine_ex_day on public.routine_exercises(day_id);
create index if not exists idx_routine_ex_user on public.routine_exercises(user_id);

-- Entrenamiento realizado (una sesión). routine_id/day_id se conservan como
-- referencia blanda (on delete set null) para no perder el historial si el
-- usuario borra una rutina más adelante.
create table if not exists public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  routine_id       uuid references public.workout_routines(id) on delete set null,
  day_id           uuid references public.routine_days(id) on delete set null,
  name             text not null default 'Entrenamiento',
  performed_date   date not null default current_date,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  notes            text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_sessions_user_date on public.workout_sessions(user_id, performed_date desc);

-- Series realizadas dentro de una sesión. El nombre/grupo del ejercicio se
-- guarda DESNORMALIZADO a propósito: así el progreso histórico por ejercicio
-- sobrevive aunque después edites o borres la rutina/ejercicio plantilla.
create table if not exists public.workout_set_logs (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.workout_sessions(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  exercise_name  text not null,
  muscle_group   text,
  set_number     int not null default 1 check (set_number between 1 and 50),
  reps           int not null default 0 check (reps between 0 and 500),
  weight         numeric(7,2) not null default 0 check (weight >= 0),
  completed      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists idx_set_logs_session on public.workout_set_logs(session_id);
create index if not exists idx_set_logs_user_exercise on public.workout_set_logs(user_id, exercise_name);

-- ===========================================================================
-- RECORDATORIOS
-- ===========================================================================

-- category se guarda como texto libre (preset o personalizado) — mismo criterio
-- que se pidió: categorías personalizadas sin sobre-modelar con otra tabla.
create table if not exists public.reminders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  title              text not null check (char_length(trim(title)) > 0),
  description        text,
  category           text not null default 'personal',
  priority           text not null default 'media' check (priority in ('baja','media','alta')),
  remind_date        date not null default current_date,
  remind_time        time,               -- null = sin hora específica (todo el día)
  -- none | daily | weekly | monthly | weekdays
  repeat             text not null default 'none' check (repeat in ('none','daily','weekly','monthly','weekdays')),
  repeat_days        int[] not null default '{}',  -- para weekly: 0=domingo … 6=sábado
  repeat_day_of_month int check (repeat_day_of_month between 1 and 31), -- para monthly
  -- pending | completed  (solo relevante para no-recurrentes; los recurrentes
  -- usan reminder_completions por ocurrencia)
  status             text not null default 'pending' check (status in ('pending','completed')),
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_reminders_user_date on public.reminders(user_id, remind_date);

-- Ocurrencias completadas de recordatorios recurrentes (una fila por día
-- marcado). Mismo patrón que habit_completions.
create table if not exists public.reminder_completions (
  id             uuid primary key default gen_random_uuid(),
  reminder_id    uuid not null references public.reminders(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  unique (reminder_id, completed_date)
);
create index if not exists idx_reminder_completions_user_date on public.reminder_completions(user_id, completed_date);

-- ===========================================================================
-- updated_at automático (reutiliza public.set_updated_at() de schema_v2.sql)
-- ===========================================================================
drop trigger if exists trg_routines_updated_at on public.workout_routines;
create trigger trg_routines_updated_at before update on public.workout_routines
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reminders_updated_at on public.reminders;
create trigger trg_reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Row Level Security — cada usuario solo ve/toca sus propias filas.
-- ===========================================================================
alter table public.workout_routines    enable row level security;
alter table public.routine_days         enable row level security;
alter table public.routine_exercises    enable row level security;
alter table public.workout_sessions     enable row level security;
alter table public.workout_set_logs     enable row level security;
alter table public.reminders            enable row level security;
alter table public.reminder_completions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'workout_routines','routine_days','routine_exercises','workout_sessions',
    'workout_set_logs','reminders','reminder_completions'
  ]
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
