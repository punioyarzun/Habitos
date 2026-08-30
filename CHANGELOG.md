# CHANGELOG — Bitácora

Resumen de cambios realizados en esta iteración (auth por cuentas de usuario + rediseño del gate de inicio de sesión). Todas las rutas son relativas a la raíz del proyecto.

## Fecha
2026-08-29

## Resumen general
- Se convirtió la app de almacenamiento local (localStorage) a un modelo **multi‑usuario** con **Supabase Auth** + **Netlify Function** (backend por usuario).
- Se rediseñó el acceso como un **gate de autenticación a pantalla completa**: sin sesión solo se ve login/registro; con sesión se ve el panel completo y la pestaña "Cuenta" muestra la sesión activa.
- Se corrigieron bugs de seguridad y de integración (CSP, variable CSS sin definir, accesibilidad de teclado).

## Cambios por archivo

### index.html
- **Inicio de sesión/registro a pantalla completa**: se agregó `#authGate` como primer elemento del `<body>`, con marca, título, tarjeta de login/registro con tabs, campos (email, contraseña, confirmar contraseña), botón social (Google/GitHub) y mensaje de estado.
- **Envolvente `#appShell`**: todo el shell de la app (header + `main`) quedó dentro de `#appShell.hidden`, que solo se muestra cuando hay sesión.
- **Corregido bug de HTML**: a la sección `#view-datos` le faltaba su `</section>` de cierre, lo que dejaba a `#view-cuenta` anidada dentro de `#view-datos`. Se cerró correctamente.
- Se mantuvo la pestaña **Cuenta** (`#view-cuenta`) que ahora muestra email + cerrar sesión.

### auth.js
- Reescrita la capa de UI de autenticación:
  - `showGate()` / `showApp()`: alternan entre el gate y el panel según exista sesión.
  - `setGateMode()`: maneja los tabs login/registro (muestra/oculta el campo "Confirmar contraseña").
  - `handleSubmit()`: valida y ejecuta login o registro (con comprobación de contraseñas iguales y longitud mínima).
  - `renderAccountPanel()`: renderiza la pestaña "Cuenta" solo con sesión (email + "Cerrar sesión").
- Se eliminó la UI antigua de modal/header (`buildModal`, `openLoginModal`, `closeModal`, `wireAuthPanel`, etc.).
- Se conservan `signIn`, `signUp`, `signOut`, `signInWithProvider`, auto‑refresh de token y caché de lectura.
- `init()` ahora decide gate vs. panel según sesión; `window.storage` sigue con el mismo contrato que usa `app.js`.

### styles.css
- **Bug corregido — variable `--accent`**: se usaba en el gate (botón "Entrar/Crear cuenta", tab activo, bordes de foco) pero **nunca estaba definida** en `:root`. Se agregó `--accent: #5b9bd9;`.
- **Accesibilidad de teclado**: se agregaron estilos globales `:focus-visible` (anillo de foco visible en `--accent`) que antes no existían, para que la navegación con teclado muestre el elemento enfocado (antes se removía el foco sin reemplazo visible).
- Estilos del gate: `.auth-gate` (fondo con gradiente radial), `.auth-card`, `.auth-tabs`, `.auth-tab`, `.auth-submit`, `.auth-social` con colores de marca para Google/GitHub, `.auth-foot`, `.auth-divider`, y utilidad `.hidden`.

### _headers
- **Bug de integración corregido — CSP**: el CSP servido a nivel de servidor tenía `connect-src 'self'` sin el dominio de Supabase. Como el CSP del header y el del `<meta>` se aplican en conjunto (intersección), ese `connect-src 'self'` bloqueaba las llamadas a Supabase desde el navegador, causando el error `TypeError: Failed to fetch` (visible como "Failed to fetch" al crear cuenta / iniciar sesión).
- Se actualizó a `connect-src 'self' https://rjmftwujvusprlbxtbbg.supabase.co` y `img-src 'self' data: https://*.supabase.co`.

### netlify/functions/bitacora.mjs
- Migrado al **runtime v2 de Netlify**: el handler ahora trabaja con un objeto Web API `Request` y devuelve un `Response` (ya no usa el formato `{statusCode, headers, body}` ni `event`).
- Sin cambios de lógica de negocio (acciones `load` / `save` / `clear` por usuario, validando el token con `auth.getUser`).

### app.js
- Ajuste menor: la pestaña "Cuenta" llama a `window.BitacoraAuth.renderPanel()` (misma API expuesta, ahora con `renderAccountPanel()` detrás).
- Sin cambios en la lógica de hábitos/gastos.

### supabase.config.js
- Se usa la **publishable key** (`sb_publishable_...`) para el front. No se toca la lógica.

### netlify.toml
- Sin cambios (encabezados de seguridad y redirects SPA ya existentes; no define CSP).

### bitacora.html
- Variante **legacy / standalone** (sin autenticación, datos en localStorage, incluye su propio banner de "datos guardados localmente"). **No se modificó su lógica** en esta iteración; se mantiene intacto como respaldo. Solo se confirmó su integridad estructural (HTML/CSS/JS autocontenido).

## Notas / pendientes
- **Rotar la service‑role key**: `sb_secret_reSL98hns...` quedó expuesta en una conversación. Se recomienda rotarla en Supabase (Project Settings → API Keys) y actualizar la variable `SUPABASE_SERVICE_ROLE_KEY` en Netlify.
- **Proveedores OAuth**: los botones Google/GitHub requieren habilitar cada proveedor en Supabase (Authentication → Providers) y registrar `https://kronvia.netlify.app` como redirect.
- **Confirmación de email**: crear cuenta pide confirmar email; si se desactiva "Confirm email" en Supabase, el alta inicia sesión directamente.
