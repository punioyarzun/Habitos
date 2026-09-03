# Bitácora — hábitos, gimnasio, recordatorios, finanzas y estadísticas

Plataforma personal integral de seguimiento: **hábitos, entrenamientos de gimnasio,
recordatorios, finanzas y estadísticas**, con cuentas de usuario, sincronización en la
nube y aislamiento de datos por usuario garantizado a nivel de base de datos (Row Level
Security).

**La app en producción es la carpeta [`web/`](./web) (React + TypeScript + Tailwind + Supabase).**
La versión anterior (HTML/CSS/JS vanilla, sin estadísticas ni esquema relacional) se
conserva en [`legacy-vanilla-app/`](./legacy-vanilla-app) solo como referencia y camino
de rollback — **no se despliega**.

## Estructura del repo

| Ruta | Qué es |
|---|---|
| `web/` | **App en producción.** React 19 + TypeScript + Vite + Tailwind v4 + React Router + Supabase-js. Ver `web/README` (esta misma sección cubre su configuración). |
| `supabase/schema_v2.sql` | Esquema relacional base: `profiles`, `habit_categories`, `habits`, `habit_completions`, `financial_categories`, `financial_transactions`, todas con RLS. |
| `supabase/schema_gym_reminders.sql` | **Extensión Gimnasio + Recordatorios** (aditiva e idempotente): `workout_routines`, `routine_days`, `routine_exercises`, `workout_sessions`, `workout_set_logs`, `reminders`, `reminder_completions`, todas con RLS. Correr después de `schema_v2.sql`. |
| `supabase/functions/send-reminder-email/` | **Edge Function** que envía el recordatorio por correo (Resend). Opcional: ver `NOTIFICACIONES.md` para desplegarla. |
| `NOTIFICACIONES.md` | Arquitectura de notificaciones (in-app + navegador + email) y el camino para push en segundo plano. |
| `supabase/migrate-to-relational.mjs` | Script único para migrar datos del modelo viejo (un JSON por usuario) al esquema relacional. Correr una sola vez, manualmente. |
| `supabase/schema.sql` | Esquema **viejo** (un JSON por usuario). Solo relevante si aún corres `legacy-vanilla-app/`. |
| `netlify/functions/bitacora.mjs` | Función serverless del modelo viejo. Ya no la usa la app en producción (React habla directo con Supabase, protegido por RLS) — se conserva por si necesitas lógica server-side con privilegios elevados a futuro. |
| `legacy-vanilla-app/` | App anterior completa (sin estadísticas, sin esquema relacional). No se despliega; ver `netlify.toml` — `publish` apunta a `web/dist`. |
| `netlify.toml` | Config de build: compila `web/` y publica `web/dist`. |
| `AUDIT.md` / `CHANGELOG.md` / `ARQUITECTURA.md` | Historial de decisiones técnicas de las distintas fases del proyecto. |

## Arquitectura

```
React (web/)  ──REST/PKCE──►  Supabase Auth
              ──REST──────►  Supabase Postgres (PostgREST)
                              └─ Row Level Security decide qué fila
                                 puede leer/escribir cada usuario.
```

No hay una capa de backend propia para el CRUD normal: el navegador habla
directamente con Supabase usando el JWT del usuario logueado, y es **Postgres**
(no el frontend, no un servidor intermedio) quien decide qué datos puede tocar cada
quien. Esto es intencional — menos piezas en movimiento, menos superficie de ataque,
y es exactamente el modelo que Supabase está diseñado para soportar de forma segura.

### Modelo de datos

```
auth.users (Supabase)
 └─ profiles              (1:1 — preferencias, nombre)
 └─ habit_categories       (opcional, para agrupar hábitos)
 └─ habits
     └─ habit_completions  (1 fila por día marcado)
 └─ financial_categories
 └─ financial_transactions
 ── Gimnasio ──
 └─ workout_routines             (rutina; 1 marcada como activa)
     └─ routine_days             (días: "Push", "Lunes", descanso…)
         └─ routine_exercises    (ejercicios plantilla con objetivos)
 └─ workout_sessions             (entrenamiento realizado)
     └─ workout_set_logs         (series realizadas, denormalizadas)
 ── Recordatorios ──
 └─ reminders                    (título, fecha/hora, prioridad, recurrencia)
     └─ reminder_completions     (1 fila por ocurrencia recurrente marcada)
```

Ver `supabase/schema_v2.sql` y `supabase/schema_gym_reminders.sql` para el detalle
completo (constraints, índices, triggers).

## Puesta en marcha (una vez)

### 1) Base de datos
1. Crea un proyecto en [supabase.com](https://supabase.com) (o reusa el existente).
2. Ejecuta `supabase/schema_v2.sql` en el SQL Editor.
2b. Ejecuta `supabase/schema_gym_reminders.sql` (para Gimnasio + Recordatorios). Es
   aditivo e idempotente: no toca las tablas existentes y se puede correr de nuevo sin
   riesgo (incluye un `ALTER` que amplía los tipos de rutina en instalaciones previas).
   **Sin este paso, las secciones Gimnasio y Recordatorios no tendrán dónde guardar datos.**
2c. (Opcional) Para recibir recordatorios por correo, despliega la Edge Function
   `send-reminder-email` — pasos en `NOTIFICACIONES.md`. Si no la despliegas, la app
   usa las notificaciones del navegador.
3. **Si ya tenías datos reales en el modelo viejo** (`bitacora_data`), sigue
   `supabase/migrate-to-relational.mjs` (instrucciones dentro del archivo: correr con
   `--dry-run` primero, hacer backup, luego correr real). Es un script manual, no se
   despliega.
4. En **Authentication → URL Configuration**, agrega la URL de tu sitio de Netlify
   como Redirect URL (la necesitan OAuth y el link de "recuperar contraseña").
5. En **Authentication → Providers**, activa Email y, si quieres, Google/GitHub.

### 2) Variables de entorno
- `web/.env.example` → cópialo a `web/.env.local` para desarrollo local.
- En Netlify: **Site settings → Environment variables** → agrega `VITE_SUPABASE_URL`
  y `VITE_SUPABASE_ANON_KEY` (mismos valores, deben empezar con `VITE_` para que Vite
  los incluya en el build del navegador — la anon key es pública por diseño, no es secreta).

### 3) Netlify
`netlify.toml` ya está configurado: `base = "web"`, `command = "npm run build"`,
`publish = "dist"`. Solo conecta el repo y agrega las variables de entorno de arriba.

## Desarrollo local

```bash
npm run dev          # equivalente a: cd web && npm run dev  →  http://localhost:5173
npm run build         # build de producción + valida la función legacy
npm run legacy:dev     # sirve la app vieja en http://localhost:8000, por si la necesitas
```

## Checklist antes de dar por "en producción"

- [ ] `supabase/schema_v2.sql` ejecutado.
- [ ] `supabase/schema_gym_reminders.sql` ejecutado (Gimnasio + Recordatorios).
- [ ] Si aplica, `migrate-to-relational.mjs` corrido (con backup previo) y verificado.
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` configuradas en Netlify.
- [ ] Redirect URL de tu dominio agregada en Supabase Auth.
- [ ] `npm run build` corre limpio (0 errores de TypeScript, sin warnings de bundle
      fuera de lo esperado).
- [ ] Probado en producción: crear cuenta → crear hábito → marcarlo → cerrar sesión →
      entrar desde otro dispositivo → el dato aparece.
- [ ] Probado: "¿Olvidaste tu contraseña?" → email → link → contraseña nueva → login.
- [ ] Probado: login con Google/GitHub si están activados.
- [ ] Probado en móvil real (no solo devtools): nav inferior, formularios, calendario,
      gráficos de Estadísticas.
- [ ] Revisados los logs de build en Netlify tras el primer deploy.

## Seguridad

- **Aislamiento de datos por usuario garantizado en la base de datos**, no en el
  frontend: cada tabla tiene RLS con policies `auth.uid() = user_id` para
  select/insert/update/delete. Aunque hubiera un bug en el código de React, Postgres
  igual bloquea el acceso a filas de otro usuario.
- Auth con flujo **PKCE** (más seguro que "implicit" para SPAs) vía `supabase-js`.
- CSP estricta (`default-src 'none'`) en `web/index.html`, reforzada a nivel de
  servidor en `web/public/_headers` (Netlify la sirve desde `dist/_headers`).
- Validación de montos, fechas y longitudes de texto tanto en el cliente (feedback
  inmediato) como en la base de datos (constraints `check` en `schema_v2.sql`) — la
  validación del cliente es UX, la de la base de datos es la que realmente protege.
- React escapa automáticamente todo el contenido dinámico en JSX (a diferencia de la
  app vanilla anterior, no hay riesgo de XSS por `innerHTML` sin sanitizar).

## Estado y próximos pasos

Ver `CHANGELOG.md` para el detalle de qué se implementó en cada fase y qué queda
pendiente (branding/logo dedicado, tests automatizados, filtros de rango personalizado
en Estadísticas, categorías de hábito en la UI, etc.).
