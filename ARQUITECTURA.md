# Arquitectura — Bitácora con usuarios

> ⚠️ **Este documento describe un diseño exploratorio de una sesión anterior y NO
> coincide con lo que finalmente se implementó.** Se conserva como referencia
> histórica, pero si estás configurando el proyecto hoy, sigue **`README.md`** y
> `supabase/schema.sql` / `netlify/functions/bitacora.mjs`, que son la fuente de
> verdad actual. Diferencias principales respecto a lo descrito aquí:
> - Se usó **Supabase Auth** directamente (REST), no Netlify Identity.
> - La función serverless **no usa `SUPABASE_SERVICE_ROLE_KEY`**: opera con el JWT
>   del propio usuario y deja que Row Level Security decida el acceso — un secreto
>   menos que gestionar y sin riesgo de que un bug en la función exponga datos de
>   otro usuario.
> - Se agregó recuperación de contraseña y soporte PWA (instalable + shell offline),
>   no contemplados en este diseño original.

Estado original de este documento: **diseño y preparación** (sesión previa a la
implementación). Se deja el contenido tal cual para trazabilidad de las decisiones
que se evaluaron.

---

## 1. Situación actual

- App 100% estática (`index.html` + `app.js` + `styles.css`), desplegada en Netlify.
- Los datos se persisten por **navegador** en `localStorage`.
- Ya existe una capa de "almacenamiento externo" opcional: `window.storage` con `get/set/remove`.
  - `app.js:223` detecta si está disponible (`externalStoreAvailable`).
  - `rawGet` (`app.js:239`) / `rawSet` (`app.js:250`) / `persist` (`app.js:269`) escriben en ambos.
- **Claves** que se persisten: `habits:config`, `habits:days`, `finance:transactions`, `app:featured`, `finance:cats_ingreso`, `finance:cats_gasto`, `app:recovery_seeded_v1`.

**Ventaja:** como `window.storage` ya existe, el backend se conecta ahí sin reescribir la lógica de la app. Si `window.storage` responde, los datos se guardan por usuario; si no, sigue el `localStorage` como hoy (modo local/previsualización).

---

## 2. Decisión de autenticación

- **Netlify Identity** (incluido en el plan gratuito de Netlify).
- Proveedores: **email + contraseña** (registro con verificación de email) **y** **Google** + **GitHub** (OAuth).
- El front usa el widget de Netlify Identity (`netlify-identity-widget`) para login/registro/logout y para obtener un **JWT** del usuario.
- Se protege la rama pública: sin sesión no se pueden escribir datos; cada llamada al backend lleva el token.

---

## 3. Backend de datos

Opción elegida: **Netlify Functions** (serverless) + base de datos por usuario.

**Recomendado:** **Postgres** (p. ej. Supabase, plan gratis) o **FaunaDB** (plan gratis con 100k lecturas/mes).
Estructura de datos sugerida (una fila/colección por usuario, clave por `user_id`):

- `user_meta`: `{ user_id, fecha_creacion }`
- `habits_config`: `{ user_id, config: [...habitsConfig] }`
- `habits_days`: `{ user_id, days: {...habitDays} }`
- `finance_transactions`: `{ user_id, transactions: [...] }`
- `app_state`: `{ user_id, featured, cats_ingreso, cats_gasto }`

Guardamos cada "bloque" entero (como hoy lo guarda `persist`) para que el cambio en el front sea mínimo. Más adelante, si crece, se puede granular mor.

### Endpoints (Netlify Functions)

Un solo endpoint `POST /api/bitacora` (o `/.netlify/functions/bitacora`) con acciones:

| Acción | Método | Qué hace |
|--------|--------|----------|
| `load` | POST | Devuelve todos los datos del usuario logueado. |
| `save` | POST | Guarda (merge) los bloques que envíe el front (`habits:config`, `habits:days`, `finance:transactions`, etc.). |
| `clear` | POST | Borra los datos del usuario (opcional, para reset). |

Seguridad en cada request:
1. Leer el **JWT** del header `Authorization: Bearer <token>`.
2. Validar firma con el secreto de Netlify Identity (variable de entorno `NETLIFY_IDENTITY_SECRET`).
3. Extraer `sub` (id de usuario) del token.
4. **Nunca** confiar en un `user_id` del body: el backend usa el `sub` del token validado.

---

## 4. Integración en el front (`window.storage`)

Se implementa un `window.storage` que:

- `get(key)` → `POST /api/bitacora` con acción `load`; responde y filtra la clave pedida (o cachea el snapshot completo).
- `set(key, value)` → `POST /api/bitacora` con acción `save` y `{ key, value }`.
- `remove(key)` → acción `clear` sobre esa clave.

Así, `rawGet`/`rawSet`/`persist` siguen exactamente igual; solo cambia quién responde `window.storage`.
Si el usuario no está logueado o el backend falla, `window.storage` no está disponible y la app sigue en modo `localStorage` (sin pérdida de funcionalidad actual).

### Migración del `localStorage` existente

La primera vez que un usuario inicia sesión:
1. Se hace `load` desde el backend.
2. Si el backend está vacío **y** hay datos en `localStorage` → se suben (migración automática).
3. Se marca `app:mi_creado` para no repetir.

---

## 5. Pasos de implementación (futuras sesiones)

1. Crear la base de datos (Supabase/Postgres o FaunaDB) y cargar el esquema.
2. Habilitar **Netlify Identity** en el proyecto (Settings → Identity → Enable) y configurar proveedores (Google/GitHub) + plantilla de email.
3. Añadir el widget de login al front (`index.html`/`app.js`) y un botón de "Cerrar sesión".
4. Crear la función `netlify/functions/bitacora.mjs` con validación de JWT y conexión a la BD.
5. Implementar `window.storage` real en `app.js`.
6. Probar migración + doble sesión + despliegue.

---

## 6. Riesgos y notas

- **Datos por defecto vs por usuario:** hoy hay datos de ejemplo (3 hábitos + el día recuperado 2026-08-28). Con cuentas, cada usuario nuevo debe partir vacío **o** con esos hábitos de ejemplo; decidir en implementación.
- **CSP:** el widget de Netlify Identity carga un script externo (`identity-js.netlify.com`), así que habrá que **ampliar la CSP** de `index.html` (script-src/connect-src) cuando se integre. (Documentado aquí, no se toca todavía.)
- **Coste/plan:** plan gratuito de Netlify (100k requests/mes de funciones) + BD gratuita alcanza para uso personal/pequeño.
- **Privacidad:** guardar datos de otros usuarios implica manejar datos personales; recomendable política de privacidad y borrado de cuenta.

---

## 7. Estado del repo

- `ARQUITECTURA.md` — este documento.
- `netlify.toml` — preparado para Identity/Functions (redirects para `/.netlify/functions`).
- `netlify/functions/bitacora.mjs` — esqueleto serverless con TODOs (sin conexión a BD todavía).
