# Notificaciones — arquitectura y estado

Este documento describe cómo funcionan las notificaciones hoy y qué haría falta para
notificaciones push en segundo plano. **No hay simulaciones**: lo que existe funciona
de verdad, y lo que no existe está documentado como paso futuro, no fingido.

## Qué está implementado (real y funcionando)

### 1. Notificaciones dentro de la app (in-app)
- Campana en la barra superior (`features/reminders/NotificationBell.tsx`) con un badge
  que muestra cuántos recordatorios vencen hoy + los vencidos.
- Al abrirla lista los pendientes de hoy y permite completarlos en el momento.
- Se alimenta del **centro de recordatorios global** (`hooks/reminderCenter.tsx`), que
  se monta una sola vez tras el login (dentro de `RequireAuth`) y comparte estado con la
  página de Recordatorios — completar en un lado se refleja al instante en el otro.

### 2. Alertas al ingresar a la plataforma
- Como el centro de recordatorios carga al entrar, el badge y la lista de "hoy" están
  disponibles de inmediato en cualquier sección. No hace falta abrir Recordatorios.

### 3. Notificaciones del navegador (Notification API) mientras la app está abierta
- El usuario las activa desde **Configuración → Notificaciones** o desde la campana
  (`Notification.requestPermission()`).
- Con el permiso concedido, `reminderCenter.tsx` programa un `setTimeout` por cada
  recordatorio de hoy con hora futura (dentro de las próximas 12 h) y dispara una
  `new Notification(...)` a la hora indicada.
- Es **real** pero tiene un límite honesto: **solo dispara con la pestaña abierta**. No
  usamos ningún backend ni truco para aparentar entregas en segundo plano.
- Preferencia guardada en `localStorage` (`bitacora:notifications`) para poder apagarlas
  sin revocar el permiso del navegador.

### 4. Aviso al crear un recordatorio
- Al crear un recordatorio, `reminderCenter.announceCreated()` pide el permiso del
  navegador si aún no se dio y dispara una **notificación de confirmación** con el
  título y cuándo avisará ("hoy a las 10:00", "5 sept · 09:00"). La notificación
  puntual a la hora exacta la agenda el scheduler de arriba (con la app abierta).

## Email de recordatorios (implementado — falta desplegar la función)

El código ya está listo: la Edge Function vive en
`supabase/functions/send-reminder-email/index.ts` y el cliente la llama
(`services/emailService.ts`) cuando el usuario activa **Configuración →
Recordatorios por correo**. Solo falta desplegarla y darle una API key.

La función **valida el JWT** del usuario y envía **solo a su propio correo** (nunca a
una dirección del body), así que no se puede abusar para spam. El endpoint vive en
`https://<ref>.supabase.co/functions/v1/...` — el mismo host que ya permite la CSP, no
hay que tocar `connect-src`.

### Desplegar (una vez)
1. Crea una cuenta en [resend.com](https://resend.com) y genera una API key. (Para
   pruebas sirve el remitente sandbox `onboarding@resend.dev`; para producción,
   verifica tu dominio y usa `no-reply@tudominio.com`.)
2. Con el [CLI de Supabase](https://supabase.com/docs/guides/cli):
   ```bash
   supabase login
   supabase link --project-ref <tu-ref>
   supabase secrets set RESEND_API_KEY=re_xxx REMINDER_FROM="Bitácora <onboarding@resend.dev>"
   supabase functions deploy send-reminder-email
   ```
3. Activa el toggle en Configuración y crea un recordatorio: te debe llegar el correo.

Si no la despliegas, no pasa nada: `emailService` degrada silenciosamente y la app
sigue avisando con la **notificación del navegador**.

### Envío a la hora exacta (no solo al crear) — paso futuro
Hoy el correo se manda **al crear** el recordatorio. Para que llegue **a la hora**
programada (incluso con la app cerrada), agrega un **cron** (Supabase Scheduled
Functions / pg_cron) que corra cada pocos minutos, calcule con `occursOn()` qué
recordatorios vencen y llame a la misma lógica de envío.

## Qué NO está implementado (y por qué)

### Push en segundo plano (app cerrada)
Las notificaciones push reales (que llegan con la app cerrada) requieren **infraestructura
adicional** que hoy el proyecto no tiene:

1. **Service Worker** registrado (el proyecto ya es PWA instalable —`web/public/manifest.json`—
   pero **no** registra un Service Worker todavía).
2. **Web Push API + VAPID**: par de claves VAPID, suscripción `PushManager.subscribe()`,
   y guardar la suscripción del usuario en la base de datos.
3. **Un servidor/cron que envíe los push** en el momento correcto (una Edge Function de
   Supabase o similar), porque el navegador no puede auto-enviarse un push a futuro.
4. Ajustes de **CSP**: `web/index.html` y `web/public/_headers` tienen
   `default-src 'none'` y `connect-src` acotado; habría que permitir el endpoint de push.

No se dejó ninguna simulación de esto: la UI nunca dice que enviará un push si no puede.

## Camino recomendado para agregar push (futuro)

1. Crear `web/public/sw.js` y registrarlo en `web/src/main.tsx`
   (`navigator.serviceWorker.register('/sw.js')`).
2. Generar claves VAPID y guardarlas (privada en el servidor, pública en el cliente).
3. Añadir tabla `push_subscriptions (user_id, endpoint, keys, created_at)` con RLS
   (mismo patrón que el resto del esquema).
4. En el Service Worker, manejar el evento `push` → `self.registration.showNotification`.
5. Crear una **Supabase Edge Function + cron** que, a intervalos, calcule qué
   recordatorios vencen y envíe los push con la librería `web-push`.
6. Ampliar la CSP para el endpoint correspondiente.

La estructura de datos actual ya está preparada: `reminders` tiene `remind_date`,
`remind_time`, `repeat`, `repeat_days` y `repeat_day_of_month`, y `utils/reminders.ts`
expone `occursOn()` / `nextOccurrence()`, que son exactamente lo que la función de envío
necesitaría para decidir a quién notificar y cuándo — el mismo cálculo que ya usa el
cliente.
