/// <reference types="vite/client" />

declare const app: import('./app/types').AppAPI

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

  export default component
}

interface ImportMetaEnv {
  /** 当前产品 ID */
  readonly VITE_APP_PRODUCT?: string
  /** API 基础 URL */
  readonly VITE_API_BASE_URL?: string
  /** API 端口 */
  readonly VITE_API_PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
