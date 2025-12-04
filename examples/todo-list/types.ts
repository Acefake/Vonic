/** 插件 API 类型定义 */
export interface PluginAPI {
  logger: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
  storage: {
    get: <T>(key: string, defaultValue?: T) => T
    set: <T>(key: string, value: T) => void
    remove: (key: string) => void
  }
  commands: {
    register: (id: string, title: string, handler: () => void | Promise<void>) => void
  }
  ui: {
    showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => void
    showNotification: (options: { title: string, body: string }) => void
    showConfirm: (title: string, content: string) => Promise<boolean>
    showInput: (title: string, placeholder?: string) => Promise<string | null>
  }
  views: {
    register: (id: string, config: ViewConfig) => void
    open: (id: string, data?: any) => void
  }
  panels: {
    register: (config: PanelConfig) => void
  }
  ipc: {
    handle: (channel: string, handler: (...args: any[]) => any) => void
    on: (channel: string, handler: (...args: any[]) => void) => void
    off: (channel: string, handler: (...args: any[]) => void) => void
    sendToMain: (channel: string, ...args: any[]) => void
  }
}

export interface ViewConfig {
  title: string
  type: 'page' | 'modal' | 'window'
  window?: {
    width?: number
    height?: number
    resizable?: boolean
    frame?: boolean
    modal?: boolean
  }
}

export interface PanelConfig {
  type: 'menu' | 'component'
  title?: string
  componentPath?: string
  menuItems?: { id: string, label: string, command: string }[]
}

export interface Plugin {
  id: string
  name: string
  version: string
  activate: (api: PluginAPI) => Promise<void>
  deactivate?: () => Promise<void>
}
