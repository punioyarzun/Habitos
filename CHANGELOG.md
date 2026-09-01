# CHANGELOG — pase de optimización a producción

## Fase 2.1 — Verificación visual real + corrección de contraste sistemática

Después de armar la Fase 2, la probé de verdad en un navegador (Playwright +
Chromium, con la red de Supabase simulada) en vez de confiar solo en `tsc`/`build`.
Encontró bugs reales que ningún chequeo estático hubiera detectado.

### Bugs de arranque
- **Crash `Failed to construct 'URL': Invalid URL`** al cargar la app en un iframe
  sandboxeado (preview): `detectSessionInUrl` de `supabase-js` intentaba parsear la
  URL del sandbox, que no es una URL real. Se desactiva solo en el build de preview
  de un solo archivo — el build de producción real (`web/dist`, el que se despliega)
  no se toca.

### Contraste — hallazgo sistemático, no solo cosmético
Al probar el modo claro de verdad (no solo el oscuro, que era el que se veía en
todos los mockups previos), aparecieron **fallas de contraste WCAG AA reales** en
más de 15 lugares: el mismo tono de ámbar/verde/rojo que se lee perfecto sobre fondo
oscuro se vuelve casi ilegible sobre fondo claro, y viceversa.

- Se separaron los tokens de color en dos familias:
  - **Rellenos sólidos** (`--color-brand-500`, botones, badges, pestañas activas):
    se mantienen igual en ambos temas, porque siempre van emparejados con un texto
    de tinta fija oscura (`--color-brand-ink`) — ese par nunca depende del tema.
  - **Texto/íconos sobre el fondo de página** (`--color-brand-text`,
    `--color-money-in-text`, `--color-money-out-text`, `--color-danger-text`): son
    variantes **adaptativas por tema** — más claras en modo oscuro, más oscuras y
    saturadas en modo claro — porque ahí sí importa el contraste contra un fondo que
    cambia.
- Se unificó el rojo de "error de formulario" con el rojo de "gasto financiero"
  (antes eran dos rojos de Tailwind sin verificar, uno de los cuales fallaba 2.59:1
  en modo claro) bajo el mismo token `--color-danger` / `--color-danger-text`.
- Corregidos: pestañas de login/registro, badge del logo, toggle de tema en
  Configuración, chips de "Gasto/Ingreso" en el formulario financiero, toasts de
  éxito/error, selector de ícono al crear hábito, nav activo (desktop y móvil),
  cifras de balance en Dashboard/Finanzas/Estadísticas.
- Todos los valores nuevos verificados numéricamente (relación de contraste ≥ 4.5:1
  para texto, ≥ 3:1 para bordes/gráficos de UI) antes de aplicarlos, no a ojo.

### Bugs de datos encontrados con datos reales simulados
- **Fecha cruda en movimientos financieros**: se mostraba el timestamp ISO completo
  (`2026-08-05T00:00:00Z`) en vez de una fecha legible. Nuevo helper
  `formatDateShort()`.
- **"Cumplimiento general" de Estadísticas engañosamente bajo**: promediaba
  semanas *anteriores a que el hábito existiera* como si fueran 0% de cumplimiento,
  en vez de excluirlas. Para un hábito de 3 semanas visto con el filtro de "3 meses",
  esto podía mostrar 14% cuando el cumplimiento real rondaba el 40%. Se corrigió
  para que sea un promedio ponderado real (cumplidos / programados en todo el
  período), igual que ya hacía el ranking — antes ambos números no coincidían entre
  sí, lo cual ya era una señal de que algo estaba mal. 2 tests nuevos cubren esto
  (13/13 tests pasan).
- "Ingresos totales" en Estadísticas usaba el color de marca (ámbar) en vez del
  verde de ingresos — inconsistente con el resto de la app.

### Metodología
Se generó un build de preview de un solo archivo HTML (`vite-plugin-singlefile`,
`vite.config.preview.ts`, no afecta el build de producción real) y se cargó en
Chromium headless con las respuestas de Supabase simuladas (usuario, hábitos,
cumplimientos, categorías y transacciones de prueba), para poder ver — no asumir —
cómo se comporta cada pantalla con datos reales, en los dos temas, antes de darla
por terminada.

---

## Fase 2 — Migración a React + esquema relacional + Estadísticas

Reconstrucción del frontend sobre React/TypeScript/Vite/Tailwind, con Supabase-js
hablando directo con Postgres (RLS en vez de una función intermedia), esquema de
datos relacional, y una pestaña nueva de Estadísticas con gráficos reales.

### Arquitectura
- App nueva en `web/` (Vite + React 19 + TypeScript + Tailwind v4 + React Router 7 +
  `@supabase/supabase-js` con flujo **PKCE**). La app vieja se movió a
  `legacy-vanilla-app/` — se conserva pero **ya no se despliega**
  (`netlify.toml` ahora publica `web/dist`).
- Estructura de carpetas: `components/{ui,layout}`, `features/{auth,habits,finance,calendar,statistics}`,
  `pages/`, `hooks/`, `services/`, `lib/`, `types/`, `utils/`, `constants/`.
- Capa de servicios (`services/*Service.ts`) tipada, sin lógica de negocio mezclada
  con componentes — cada página consume hooks (`useHabits`, `useTransactions`, etc.)
  que a su vez usan los servicios.

### Base de datos
- **`supabase/schema_v2.sql`**: modelo relacional (`profiles`, `habit_categories`,
  `habits`, `habit_completions`, `financial_categories`, `financial_transactions`),
  con RLS en las seis tablas, constraints de validación (`check`) a nivel de base de
  datos, índices para las consultas por usuario/fecha, y un trigger que crea el
  perfil automáticamente al registrarse.
- **`supabase/migrate-to-relational.mjs`**: script único y manual (con `--dry-run`)
  para migrar los datos reales del modelo viejo (JSON por usuario) al nuevo esquema,
  con instrucciones de seguridad explícitas (correr local, backup antes).
- Se eliminó la dependencia de una `service_role key` para el CRUD normal: el
  frontend usa el JWT del propio usuario y RLS decide el acceso — un secreto menos,
  y un bug de frontend ya no puede filtrar datos de otro usuario.

### Hábitos
- CRUD completo (crear, pausar, reactivar, archivar, eliminar).
- Cálculo de racha actual, mejor racha histórica y % de cumplimiento respetando los
  días programados del hábito (`utils/streaks.ts`), no solo días de calendario.
- Actualización optimista al marcar/desmarcar el día de hoy (la UI responde antes de
  esperar la red, y revierte si la escritura falla).

### Calendario
- Vista mensual con intensidad de color por día (heatmap) según cuántos hábitos
  activos se completaron ese día.
- Panel de detalle por día para marcar/desmarcar cualquier hábito en cualquier fecha
  pasada.

### Finanzas
- Registro de ingresos/gastos con categorías configurables (creables al vuelo desde
  el formulario), balance mensual, lista de movimientos con eliminación.
- Montos validados como números positivos finitos tanto en el cliente como con un
  `check (amount > 0)` en la base de datos.

### Estadísticas (nuevo)
- **Hábitos**: % de cumplimiento general del período, evolución semanal (gráfico de
  línea), ranking de consistencia por hábito (barra de progreso por hábito), mejor
  racha histórica — todo calculado sobre datos reales del usuario, sin mocks.
- **Finanzas**: totales de ingresos/gastos/balance, gastos por categoría (gráfico de
  torta), ingresos vs. gastos por mes (gráfico de barras), categoría con mayor gasto,
  gasto promedio.
- Selector de período (30 días / 3 meses / 6 meses / 1 año) que recalcula todos los
  gráficos.
- Gráficos con `recharts`, cargados en un chunk separado (`React.lazy`) para no
  penalizar el peso inicial del resto de la app.

### Sistema de diseño y UX
- Tokens de color en `index.css` (Tailwind v4, sintaxis `@theme`), con modo
  **claro/oscuro** persistido en `localStorage` y sincronizado con `profiles.theme`
  cuando hay sesión.
- Layout con sidebar en escritorio y navegación inferior en móvil (mobile-first, no
  un simple "encogido" del layout de escritorio).
- Componentes reutilizables: `Button` (variantes + estado loading), `Modal` (foco +
  cierre con Escape + portal), `EmptyState`, `Skeleton`, sistema de `Toast` con
  `aria-live="polite"`.
- Estados vacíos, de carga (`Skeleton`) y de error manejados explícitamente en cada
  página — nada de pantallas en blanco mientras carga.
- Foco visible por teclado (`:focus-visible`) en toda la app.

### Autenticación
- Migrado de llamadas `fetch` manuales a `supabase-js` con flujo **PKCE** (más
  seguro que el "implicit grant" anterior para SPAs).
- Recuperar contraseña integrado de forma nativa con `onAuthStateChange` (evento
  `PASSWORD_RECOVERY`) en vez de parsear el hash de la URL a mano.

### Calidad de código verificada
- `npx tsc --noEmit`: 0 errores.
- `npm run build`: compila limpio, sin warnings de CSS ni de bundle fuera de lo
  esperado (chunk de Estadísticas separado por code-splitting).
- `npm run lint` (oxlint): 0 errores, 6 warnings menores de patrones React
  (efectos de carga de datos y archivos que mezclan provider+hook — estilísticos,
  no bugs).

### Pendiente / fuera de alcance de esta fase
- **Branding/logo dedicado**: se usó una identidad mínima coherente (marca "B",
  paleta verde/ámbar) en vez de un logo diseñado a medida — evaluar con una skill de
  diseño de marca si se quiere algo más elaborado.
- **Filtros de rango personalizado** en Estadísticas (hoy: 30d/3m/6m/1a fijos, no un
  date-picker libre).
- **Categorías de hábito en la UI** (`habit_categories` ya existe en el esquema,
  falta exponerla en el formulario de creación).
- **Tests automatizados** (unitarios para `utils/streaks.ts` serían el más valioso
  por ser lógica pura y fácil de romper sin darse cuenta).
- **Verificación visual real en navegador**: se validó con `tsc`, `vite build` y
  `oxlint`, pero no se pudo tomar una captura de pantalla real en este entorno (sin
  navegador headless disponible) — revisa la app en un dispositivo real antes de
  anunciarla ampliamente.

---

## Fase 1 — Producción básica sobre la app vanilla (histórico)

Todo lo listado abajo ya está aplicado en los archivos entregados. Nada de esto
requiere que vuelvas a escribir código: son archivos listos para reemplazar en tu
repo (ver `README.md` → sección "Checklist antes de dar por 'en producción'").

## 🔴 Bugs críticos corregidos
- **`supabase.config.js`**: corregido el nombre de archivo (antes `supabase_config.js`
  con guion bajo). Esto era lo que rompía en silencio TODA la autenticación y la
  sincronización en la nube.
- **Backend faltante**: creado `netlify/functions/bitacora.mjs` (no existía) +
  `supabase/schema.sql`. Diseño de seguridad: el backend usa el JWT del propio
  usuario y deja que Row Level Security en Postgres decida el acceso — **no necesita
  `SUPABASE_SERVICE_ROLE_KEY`**, un secreto menos que gestionar.

## 🟠 Seguridad — defensa en profundidad
- `app.js`: el editor de día del calendario (`dayEditorToggles`) y los puntos de
  color del calendario inyectaban `label`/`icon`/`color` del hábito en `innerHTML`
  **sin** pasar por `esc()` / `sanitizeIcon()` / `isValidColor()`, a diferencia del
  resto de la app. Corregido para que sea consistente en todos los puntos de render.
- CSP (en `index.html`, `_headers` y `netlify.toml`) ampliada con `manifest-src 'self'`
  y `worker-src 'self'` para soportar el manifest y el service worker sin abrir la
  política más de lo necesario.

## 🟡 Funcionalidad nueva
- **Recuperar contraseña**: flujo completo — "¿Olvidaste tu contraseña?" en el login →
  se pide el email → Supabase envía el link → la app detecta `type=recovery` en el
  hash de la URL (antes se ignoraba y se trataba como login normal) → formulario de
  contraseña nueva → guarda y entra automáticamente.
- **PWA instalable + shell offline**: `manifest.json`, `sw.js` (cachea HTML/CSS/JS con
  estrategia *stale-while-revalidate*; **nunca** intercepta llamadas a Supabase ni a
  `/api/*`, para no servir nunca datos de hábitos/gastos desactualizados), íconos
  192/512/512-maskable, registro del service worker en `app.js`.

## 🟢 Accesibilidad
- `aria-hidden` del gate de login y del panel principal ahora se actualiza de verdad
  al mostrar/ocultar cada uno (antes quedaba fijo en `"true"` sin importar cuál
  estuviera visible — un lector de pantalla veía "todo oculto" siempre).
- Agregado un estilo de foco visible (`:focus-visible`) global para navegación por
  teclado — antes casi ningún botón/tab/chip mostraba dónde estaba el foco.
- El toast de sincronización (`#syncToast`) ahora tiene `role="status" aria-live="polite"`
  para que los cambios de estado ("Guardado ✓", errores) se anuncien.
- Verificados los contrastes de color de texto contra el fondo (WCAG AA): todos pasan
  cómodamente (texto principal 15.7:1, texto secundario ~6:1 sobre fondo, ~5.6:1 sobre
  superficies) — no se requirió ningún cambio de paleta.

## 🧹 Deuda técnica / documentación
- `bitacora.html` marcado como legacy con un banner visible + comentario explicando
  que es una copia standalone sin cuentas que puede desincronizarse — no se eliminó
  (para no perder datos de quien ya la tenga guardada como marcador), pero queda claro
  que no es el flujo principal.
- `ARQUITECTURA.md`: agregada una nota al inicio aclarando que describe un diseño
  descartado (Netlify Identity) y remitiendo a `README.md` como fuente de verdad; se
  conservó el resto del documento para trazabilidad histórica.
- `README.md`: reescrito — estructura de archivos actualizada, pasos de configuración
  de Supabase completos (incluida la Redirect URL para OAuth/recovery, que faltaba),
  y un checklist explícito de qué probar antes de considerar el sitio "en producción".
- `_env.example`: eliminada la mención a `SUPABASE_SERVICE_ROLE_KEY` como requisito
  (ya no se usa) y explicado por qué.
- `package.json`: el script `build` ahora también valida la sintaxis de la nueva
  función serverless.
- `server.js`: corregido un comentario desactualizado (decía que servía
  `bitacora.html` por defecto; en realidad sirve `index.html`).
- `netlify.toml`: agregado cacheo de largo plazo para los íconos PNG (activos
  estáticos versionados por nombre de archivo).

## Archivos nuevos
```
netlify/functions/bitacora.mjs
supabase/schema.sql
manifest.json
sw.js
icon-192.png
icon-512.png
icon-512-maskable.png
```

## Archivos modificados
```
index.html        auth.js          app.js           styles.css
_headers           netlify.toml     _env.example     package.json
README.md          ARQUITECTURA.md  server.js        bitacora.html
supabase.config.js  (renombrado desde supabase_config.js)
```

## Lo que NO se tocó (y por qué)
- Lógica de hábitos, calendario, rachas, adherencia, tips motivacionales y control
  financiero en `app.js`: ya estaba bien implementada (saneamiento consistente,
  reintentos con backoff, doble escritura local+nube). Solo se corrigieron las dos
  inconsistencias de escapado señaladas arriba.
- `styles.css`: la paleta y el diseño visual ya cumplen contraste WCAG AA; solo se
  agregaron estados de foco para teclado, no se rediseñó nada visual.
- No se agregó captcha/rate-limiting al login — Supabase Auth ya aplica límites
  básicos en su lado; si quieres una capa extra (ej. Cloudflare Turnstile) es un
  cambio aparte que vale la pena evaluar según el volumen de usuarios real.

## Sigue siendo manual (fuera del código)
1. Ejecutar `supabase/schema.sql` en tu proyecto Supabase.
2. Configurar `SUPABASE_URL` / `SUPABASE_ANON_KEY` en Netlify.
3. Agregar la Redirect URL de tu dominio en Supabase Auth (necesaria para
   OAuth y para que el link de "recuperar contraseña" abra tu app correctamente).
4. Revisar la plantilla de email "Reset password" en Supabase (Authentication →
   Email Templates) — debe apuntar a tu dominio.
5. Probar el checklist completo de `README.md` en producción antes de anunciarlo.
