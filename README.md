# Bitácora — hábitos y gastos

Aplicación web estática (HTML/CSS/JS, sin dependencias ni backend) para registrar hábitos, notas, ingresos y gastos. Todo se guarda en el `localStorage` del navegador (y, si está disponible, en un almacenamiento externo vía `window.storage`).

## Estructura

| Archivo | Qué es |
|---------|--------|
| `index.html` | Entrada de producción. Carga `styles.css` y `app.js`, incluye una CSP estricta. |
| `styles.css` | Estilos extraídos. |
| `app.js` | Lógica completa (con saneado de datos y protección XSS). |
| `bitacora.html` | Copia de seguridad en un solo archivo (versión clásica que funciona también por `file://`). |
| `server.js` | Servidor local de desarrollo (Node, sin dependencias), puerto 8000. |
| `netlify.toml` | Config de Netlify (fallback SPA + cabeceras de seguridad). |
| `404.html` | Fallback SPA para GitHub Pages. |
| `_headers` | Cabeceras de seguridad para hosts estáticos que las soporten. |

## Probar en local

Necesitas servirlo por HTTP (no por `file://`) para que el `localStorage` funcione bien:

```bash
# opción 1: Node
node server.js
# abre http://localhost:8000

# opción 2: cualquier servidor estático
python -m http.server 8000
# o npx serve .
```

## Desplegar en Netlify

1. Sube este repositorio a GitHub.
2. En Netlify: **Add new site → Import an existing project →** selecciona el repo.
3. Build command: *(ninguno)* — Publish directory: `.` (o `/`)
4. Deploy. `netlify.toml` ya aplica el fallback SPA y las cabeceras de seguridad.

Alternativa sin repo: arrastra la carpeta a https://app.netlify.com/drop.

## Desplegar en GitHub Pages

1. Sube el repositorio a GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` → `/ (root)`**.
3. Guarda. Quedará en `https://TU-USUARIO.github.io/MAIN/...`. La `404.html` redirige cualquier ruta a la app.

> GitHub Pages sirve los archivos tal cual: la CSP ya viene en el `<meta>` de `index.html`, por lo que la seguridad se aplica igualmente.

## Notas de seguridad

- Los datos introducidos por el usuario (nombres de hábitos, categorías, notas, importaciones) se escapan antes de inyectarse en el HTML para evitar XSS.
- Las importaciones JSON se validan con un esquema estricto (`sanitizeImport`).
- Las cantidades y fechas se validan antes de guardarse.
- La app es de un solo usuario y guarda en el navegador: si quieres sincronizar entre dispositivos o no perder datos, conecta un almacenamiento externo implementando `window.storage` o añade una cuenta/backend.

## Recuperación de datos

Una sola vez (primera ejecución) la app siembra el día `2026-08-28` con el hábito «Sin alcohol» completado, para recuperar el progreso que se perdió en la versión anterior. Se guarda la marca `app:recovery_seeded_v1` para no repetirlo.
