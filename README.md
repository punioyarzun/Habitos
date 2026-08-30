# Bitácora — hábitos y gastos

Aplicación web para registrar hábitos, notas, ingresos y gastos, con **cuentas de usuario**.

- Sin sesión: funciona en modo local con `localStorage` (como antes).
- Con sesión: tus datos se guardan en la nube (Supabase) vía una Netlify Function y se **sincronizan en cualquier dispositivo**.
- Login por **email + contraseña** y por **Google/GitHub** (OAuth).
- Interfaz **SaaS**: sidebar en escritorio y barra de navegación inferior en móvil.
- Sección **Estadísticas** con análisis de constancia (hábitos) y finanzas (ingresos/gastos por categoría) filtrable por semana/mes/año.

## Secciones

| Sección | Qué ofrece |
|---------|------------|
| **Dashboard** | Racha principal, hábitos del día, resumen semanal y logro, tip diario. |
| **Calendario** | Mapa mensual de cumplimiento y edición por día. |
| **Gastos** | Control mensual de ingresos/gastos, balance y categorías. |
| **Estadísticas** | Evolución de hábitos (adherencia, racha actual/mejor) y finanzas por rango. |
| **Datos** | Exportar/importar copia de seguridad y orden de hábitos. |
| **Cuenta** | Correo, estado de sincronización y cierre de sesión. |

## Estructura

| Archivo | Qué es |
|---------|--------|
| `index.html` | Entrada de producción (CSP estricta). |
| `styles.css` | Estilos. |
| `app.js` | Lógica de la app (hábitos, gastos, saneado y protección XSS). |
| `auth.js` | Login/logout (Supabase Auth) y `window.storage` por usuario. |
| `supabase.config.js` | Config pública de Supabase (URL + anon key). |
| `netlify/functions/bitacora.mjs` | Función serverless: datos por usuario sobre Supabase. |
| `supabase/schema.sql` | Esquema de la tabla que usa la función. |
| `bitacora.html` | Copia de seguridad clásica (solo local, sin cuentas). |
| `server.js` | Servidor local de desarrollo, puerto 8000. |
| `netlify.toml` | Config Netlify (funciones, SPA, cabeceras seguras). |
| `404.html` / `_headers` | Fallback SPA y cabeceras para hosts estáticos. |
| `icon.svg` / `assets/` | Identidad visual (logo/favicon SVG). |

## Configuración del backend (una vez)

### 1) Supabase
1. Crea un proyecto en https://supabase.com (plan gratis).
2. En el **SQL Editor** ejecuta el contenido de `supabase/schema.sql`.
3. En **Authentication → Providers** deja Email activado y, si quieres, activa **Google** y **GitHub** (te pedirán las claves OAuth de esos proveedores).

### 2) Claves
- **Anon key** (pública): Dashboard → Settings → API → *anon public*. Pégala en:
  - `supabase.config.js` → `anonKey`
  - Variable de entorno `SUPABASE_ANON_KEY` en Netlify.
- **Service role key** (secreta): solo en Netlify como `SUPABASE_SERVICE_ROLE_KEY`. **Nunca** en el repo ni en el chat.
- **`SUPABASE_URL`** también en Netlify.

### 3) Netlify
1. Site settings → **Environment variables**: añade `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Sube el repo (Netlify instala `@supabase/supabase-js` automáticamente para las funciones).

## Probar en local

```bash
node server.js   # abre http://localhost:8000
```

*Las funciones de backend solo corren en Netlify; en local, sin sesión configurada, la app queda en modo local.*

## Seguridad
- Escapado/saneado de toda la entrada del usuario (evita XSS) y validación de importaciones, fechas y montos.
- La función valida el JWT con Supabase antes de leer/escribir; el `user_id` sale del token, nunca del body.
- La tabla tiene RLS activada y los accesos directos anónimos están bloqueados (la escritura pasa solo por la function con service role).
- CSP estricta en `index.html`.
