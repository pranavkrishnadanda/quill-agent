/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_VERIFICATION_SERVER_URL: string
  readonly VITE_VERIFICATION_TOKEN: string
  readonly VITE_ANTHROPIC_API_KEY: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
