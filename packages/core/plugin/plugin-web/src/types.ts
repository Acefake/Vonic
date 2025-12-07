/**
 * Vonic 插件 Web 端类型定义
 */

/** 日志接口 */
export interface Logger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** 存储接口 */
export interface Storage {
  get: <T>(key: string, defaultValue?: T) => T
  set: (key: string, value: unknown) => void
  delete: (key: string) => void
}

/** 菜单项 */
export interface MenuItemInfo {
  id: string
  label: string
  icon?: string
  command?: string
}

/** 视图配置 */
export interface ViewConfig {
  id: string
  title: string
  icon?: string
  type: 'page' | 'modal' | 'window'
  window?: {
    width?: number
    height?: number
    resizable?: boolean
    frame?: boolean
    modal?: boolean
  }
}

/** 面板配置 */
export interface PanelConfig {
  type: 'menu' | 'component' | 'builtin'
  title?: string
  componentPath?: string
  builtinComponent?: string
  menuItems?: MenuItemInfo[]
  headerActions?: { icon: string, title: string, command: string }[]
}

/** 插件 API 接口 */
export interface PluginAPI {
  logger: Logger
  storage: Storage
  commands: {
    register: (id: string, title: string, handler: (...args: unknown[]) => unknown) => void
  }
  ui: {
    showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => void
    showNotification: (title: string, body: string) => void
    showConfirm: (title: string, content: string) => Promise<boolean>
    showInput: (title: string, placeholder?: string) => Promise<string | null>
    showModal: (options: { title: string, content: string, width?: number }) => void
    openExternal: (url: string) => Promise<void>
  }
  views: {
    register: (id: string, config: Omit<ViewConfig, 'id'>) => void
    open: (id: string, data?: unknown) => unknown
    close: (id: string) => void
  }
  menus: {
    registerSidebar: (items: MenuItemInfo[]) => void
  }
  panels: {
    register: (config: PanelConfig) => void
  }
  clipboard: {
    readText: () => string | Promise<string>
    writeText: (text: string) => void | Promise<void>
  }
  ipc: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => void
    send: (channel: string, ...args: unknown[]) => void
    sendToMain: (channel: string, ...args: unknown[]) => void
  }
}

/** 插件接口 */
export interface Plugin {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  activate: (api: PluginAPI) => Promise<void> | void
  deactivate?: () => Promise<void> | void
}

/** 插件信息 */
export interface PluginInfo {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  enabled: boolean
  loaded: boolean
  isDev?: boolean
  pluginPath?: string
}

/** 插件清单 */
export interface PluginManifest {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  main: string
}

/** 插件状态 */
export interface PluginState {
  enabled: boolean
  loaded: boolean
}

/** 插件类型 */
export enum PluginType {
  BUILTIN = 'builtin',
  EXTERNAL = 'external',
  DEV = 'dev',
}

/** 定义插件的辅助函数 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin
}
