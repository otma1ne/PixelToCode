/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
