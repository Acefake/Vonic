import type { PluginAPI } from './api'

/** 插件接口 */
export interface Plugin {
  /** 插件ID */
  id: string
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 插件作者 */
  author?: string
  /** 插件描述 */
  description?: string
  /** 激活插件 */
  activate: (api: PluginAPI) => Promise<void> | void
  /** 停用插件 */
  deactivate?: () => Promise<void> | void
}

/** 插件信息（用于 UI 展示） */
export interface PluginInfo {
  /** 插件ID */
  id: string
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 插件作者 */
  author?: string
  /** 插件描述 */
  description?: string
  /** 插件是否启用 */
  enabled: boolean
  /** 插件是否加载 */
  loaded: boolean
  /** 是否为外部插件 */
  isExternal?: boolean
  /** 是否为开发插件 */
  isDev?: boolean
  /** 插件路径 */
  pluginPath?: string
}

/** 插件清单 */
export interface PluginManifest {
  /** 插件ID */
  id: string
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 插件作者 */
  author?: string
  /** 插件描述 */
  description?: string
  /** 插件入口文件 */
  main: string
}

/** 插件状态 */
export interface PluginState {
  /** 插件是否启用 */
  enabled: boolean
  /** 插件是否加载 */
  loaded: boolean
}

/** 外部插件条目 */
export interface ExternalPluginEntry {
  /** 插件清单 */
  manifest: PluginManifest
  /** 插件路径 */
  pluginPath: string
}

/** 开发插件条目 */
export interface DevPluginEntry {
  /** 插件清单 */
  manifest: PluginManifest
  /** 插件路径 */
  pluginPath: string
}

/** 插件类型 */
export enum PluginType {
  /** 内置插件 */
  BUILTIN = 'builtin',
  /** 外部插件 */
  EXTERNAL = 'external',
  /** 开发插件 */
  DEV = 'dev',
}
