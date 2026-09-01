/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Verdadero solo en el build de preview de un solo archivo (ver vite.config.preview.ts). */
declare const __IS_PREVIEW__: boolean;
