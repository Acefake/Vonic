/**
 * 环境变量类型定义
 * 用于主进程和渲染进程
 */

/// <reference types="vite/client" />

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
