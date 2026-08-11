/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_ENABLE_MOCKING?: string
  readonly VITE_MSW_OMIT_KEYS?: string
  readonly VITE_MSW_ON_UNHANDLED?: 'bypass' | 'warn' | 'error'
}
