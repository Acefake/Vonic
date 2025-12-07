/** 日志接口 */
export interface Logger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** 插件 API 接口（供插件开发者使用） */
export interface PluginAPI {
  /** 日志 */
  logger: Logger
  /** 存储 */
  storage: {
    get: <T>(key: string, defaultValue?: T) => T
    set: <T>(key: string, value: T) => void
    delete: (key: string) => void
  }
  /** 命令 */
  commands: {
    register: (id: string, title: string, handler: (...args: unknown[]) => unknown) => void
  }
  /** UI */
  ui: {
    showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => void
    showNotification: (title: string, body: string) => void
    showConfirm: (title: string, content: string) => Promise<boolean>
    showInput: (title: string, placeholder?: string) => Promise<string | null>
    showModal: (options: { title: string, content: string, width?: number }) => void
    openExternal: (url: string) => Promise<void>
  }
  /** 视图 */
  views: {
    register: (id: string, config: Omit<ViewConfig, 'id'>) => void
    open: (id: string, data?: unknown) => unknown
    close: (id: string) => void
  }
  /** 菜单 */
  menus: {
    registerSidebar: (items: MenuItemInfo[]) => void
  }
  /** 面板 */
  panels: {
    register: (config: PanelConfig) => void
  }
  /** 剪贴板 */
  clipboard: {
    readText: () => string
    writeText: (text: string) => void
  }
  /** IPC 通信 */
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

/** 插件信息（用于 UI 展示） */
export interface PluginInfo {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  enabled: boolean
  loaded: boolean
  isExternal?: boolean
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

/** 外部插件条目 */
export interface ExternalPluginEntry {
  manifest: PluginManifest
  pluginPath: string
}

/** 开发插件条目 */
export interface DevPluginEntry {
  manifest: PluginManifest
  pluginPath: string
}

/** 插件类型 */
export enum PluginType {
  BUILTIN = 'builtin',
  EXTERNAL = 'external',
  DEV = 'dev',
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

/** 存储接口 */
export interface Storage {
  get: <T>(key: string, defaultValue?: T) => T
  set: (key: string, value: unknown) => void
  delete: (key: string) => void
}

/** Electron 依赖注入接口 */
export interface ElectronDeps {
  app: {
    getPath: (name: string) => string
  }
  ipcMain: {
    handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => void
    removeHandler: (channel: string) => void
    handleOnce: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => void
    removeAllListeners: (channel: string) => void
  }
  dialog: {
    showOpenDialog: (options: unknown) => Promise<{ canceled: boolean, filePaths: string[] }>
  }
  BrowserWindow: {
    getAllWindows: () => BrowserWindowInstance[]
    create: (options: unknown) => BrowserWindowInstance
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  clipboard: {
    readText: () => string
    writeText: (text: string) => void
  }
  Notification: new (options: { title: string, body: string }) => { show: () => void }
}

/** BrowserWindow 实例接口 */
export interface BrowserWindowInstance {
  id: number
  isDestroyed: () => boolean
  close: () => void
  destroy: () => void
  setMenuBarVisibility: (visible: boolean) => void
  loadURL: (url: string) => Promise<void>
  loadFile: (filePath: string, options?: { hash?: string }) => Promise<void>
  on: (event: string, listener: (...args: unknown[]) => void) => void
  webContents: {
    send: (channel: string, ...args: unknown[]) => void
    getURL: () => string
  }
}
