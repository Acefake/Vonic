/// <reference types="vite/client" />
/// <reference path="../../env.d.ts" />

declare const app: import('./app/types').AppAPI

declare global {
  interface Window {
    app: import('./app/types').AppAPI
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

  export default component
}
