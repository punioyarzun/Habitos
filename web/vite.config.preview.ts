import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Solo para generar una vista previa de un solo archivo HTML (autocontenido).
// El build real de producción (Netlify) usa vite.config.ts, sin este plugin,
// para conservar code-splitting y cacheo por archivo.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    __IS_PREVIEW__: 'true',
  },
  build: {
    outDir: 'dist-preview',
    rollupOptions: { input: 'index.preview.html' },
  },
});
