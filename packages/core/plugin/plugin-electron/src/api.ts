/**
 * 插件 API 实现
 */
import type {
  BrowserWindowInstance,
  ElectronDeps,
  Logger,
  MenuItemInfo,
  PanelConfig,
  Storage,
  ViewConfig,
} from './types'

interface PluginWindow {
  id: string
  browserWindow: BrowserWindowInstance
}

export interface PluginAPIConfig {
  pluginId: string
  electron: ElectronDeps
  logger: Logger
  storage: Storage
  isDev: boolean
  rendererUrl?: string
  preloadPath?: string
  rendererHtmlPath?: string
}

export class PluginAPIImpl {
  private pluginId: string
  private electron: ElectronDeps
  private baseLogger: Logger
  private baseStorage: Storage
  private isDev: boolean
  private rendererUrl?: string
  private preloadPath?: string
  private rendererHtmlPath?: string
  private ipcHandlers: string[] = []
  private pluginWindows: PluginWindow[] = []
  private registeredViews: ViewConfig[] = []
  private registeredMenus: MenuItemInfo[] = []
  private registeredPanel: PanelConfig | null = null

  constructor(config: PluginAPIConfig) {
    this.pluginId = config.pluginId
    this.electron = config.electron
    this.baseLogger = config.logger
    this.baseStorage = config.storage
    this.isDev = config.isDev
    this.rendererUrl = config.rendererUrl
    this.preloadPath = config.preloadPath
    this.rendererHtmlPath = config.rendererHtmlPath
  }

  getPluginId(): string {
    return this.pluginId
  }

  getRegisteredMenus(): MenuItemInfo[] {
    return this.registeredMenus
  }

  getRegisteredPanel(): PanelConfig | null {
    return this.registeredPanel
  }

  get logger(): Logger {
    return {
      info: (...args: unknown[]) => this.baseLogger.info(`[${this.pluginId}]`, ...args),
      warn: (...args: unknown[]) => this.baseLogger.warn(`[${this.pluginId}]`, ...args),
      error: (...args: unknown[]) => this.baseLogger.error(`[${this.pluginId}]`, ...args),
    }
  }

  get storage(): Storage {
    const prefix = `plugin:${this.pluginId}:`
    return {
      get: <T>(key: string, defaultValue?: T): T => this.baseStorage.get(`${prefix}${key}`, defaultValue),
      set: (key: string, value: unknown) => this.baseStorage.set(`${prefix}${key}`, value),
      delete: (key: string) => this.baseStorage.delete(`${prefix}${key}`),
    }
  }

  get commands(): { register: (commandId: string, _title: string, handler: (...args: unknown[]) => unknown) => void } {
    return {
      register: (commandId: string, _title: string, handler: (...args: unknown[]) => unknown) => {
        const fullId = `${this.pluginId}.${commandId}`
        const channel = `command:${fullId}`
        if (this.ipcHandlers.includes(channel)) {
          this.electron.ipcMain.removeHandler(channel)
        }
        this.electron.ipcMain.handle(channel, (_, ...args) => handler(...args))
        if (!this.ipcHandlers.includes(channel)) {
          this.ipcHandlers.push(channel)
        }
        this.logger.info(`命令已注册: ${fullId}`)
      },
    }
  }

  get ui(): {
    showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => void
    showNotification: (title: string, body: string) => void
    showConfirm: (title: string, content: string) => Promise<boolean>
    showInput: (title: string, placeholder?: string) => Promise<string | null>
    showModal: (options: { title: string, content: string, width?: number }) => void
    openExternal: (url: string) => Promise<void>
  } {
    return {
      showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => {
        this.sendToRenderer('plugin:ui:message', { type, content })
      },
      showNotification: (title: string, body: string) => {
        new this.electron.Notification({ title, body }).show()
      },
      showConfirm: (title: string, content: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const channel = `${this.pluginId}:confirm:${Date.now()}`
          this.electron.ipcMain.handleOnce(channel, (_, value) => {
            resolve(value as boolean)
            return true
          })
          this.sendToRenderer('plugin:ui:confirm', { title, content, channel })
        })
      },
      showInput: (title: string, placeholder?: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const channel = `${this.pluginId}:input:${Date.now()}`
          this.electron.ipcMain.handleOnce(channel, (_, value) => {
            resolve(value as string | null)
            return true
          })
          this.sendToRenderer('plugin:ui:input', { title, placeholder, channel })
        })
      },
      showModal: (options: { title: string, content: string, width?: number }) => {
        this.sendToRenderer('plugin:ui:modal', options)
      },
      openExternal: (url: string) => this.electron.shell.openExternal(url),
    }
  }

  get views(): {
    register: (viewId: string, config: Omit<ViewConfig, 'id'>) => void
    open: (viewId: string, data?: unknown) => BrowserWindowInstance | null
    close: (viewId: string) => void
  } {
    return {
      register: (viewId: string, config: Omit<ViewConfig, 'id'>) => {
        const fullId = `${this.pluginId}.${viewId}`
        const viewConfig: ViewConfig = { id: fullId, ...config }
        this.registeredViews.push(viewConfig)
        this.sendToRenderer('plugin:view:register', { pluginId: this.pluginId, view: viewConfig })
        this.logger.info(`视图已注册: ${fullId} (${config.type})`)
      },
      open: (viewId: string, data?: unknown) => {
        const fullId = viewId.includes('.') ? viewId : `${this.pluginId}.${viewId}`
        const view = this.registeredViews.find(v => v.id === fullId)
        if (!view) {
          this.logger.error(`视图未找到: ${fullId}`)
          return null
        }
        if (view.type === 'window') {
          return this.createPluginWindow(fullId, view, data)
        }
        else if (view.type === 'modal') {
          this.sendToRenderer('plugin:view:open-modal', { viewId: fullId, data })
        }
        else {
          this.sendToRenderer('plugin:view:navigate', { viewId: fullId, data })
        }
        return null
      },
      close: (viewId: string) => {
        const fullId = viewId.includes('.') ? viewId : `${this.pluginId}.${viewId}`
        const pw = this.pluginWindows.find(w => w.id === fullId)
        if (pw && !pw.browserWindow.isDestroyed()) {
          pw.browserWindow.close()
        }
      },
    }
  }

  private createPluginWindow(viewId: string, config: ViewConfig, data?: unknown): BrowserWindowInstance {
    const mainWindow = this.electron.BrowserWindow.getAllWindows().find(
      win => !win.isDestroyed() && !win.webContents.getURL().includes('devtools'),
    )
    const win = this.electron.BrowserWindow.create({
      width: config.window?.width || 800,
      height: config.window?.height || 600,
      resizable: config.window?.resizable ?? true,
      frame: config.window?.frame ?? true,
      modal: config.window?.modal ?? false,
      parent: mainWindow || undefined,
      title: config.title,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: this.preloadPath,
        sandbox: false,
      },
    })
    win.setMenuBarVisibility(false)
    const route = `/plugin-view/${viewId}`
    const query = data ? `?data=${encodeURIComponent(JSON.stringify(data))}` : ''
    if (this.isDev && this.rendererUrl) {
      win.loadURL(`${this.rendererUrl}#${route}${query}`)
    }
    else if (this.rendererHtmlPath) {
      win.loadFile(this.rendererHtmlPath, { hash: `${route}${query}` })
    }
    this.pluginWindows.push({ id: viewId, browserWindow: win })
    win.on('closed', () => {
      this.pluginWindows = this.pluginWindows.filter(w => w.id !== viewId)
    })
    this.logger.info(`子窗口已创建: ${viewId}`)
    return win
  }

  get menus(): { registerSidebar: (items: MenuItemInfo[]) => void } {
    return {
      registerSidebar: (items: MenuItemInfo[]) => {
        const mappedItems = items.map(item => ({ ...item, id: `${this.pluginId}.${item.id}` }))
        this.registeredMenus = mappedItems
        this.sendToRenderer('plugin:menu:register', { pluginId: this.pluginId, items: mappedItems })
      },
    }
  }

  get panels(): { register: (config: PanelConfig) => void } {
    return {
      register: (config: PanelConfig) => {
        const panelConfig = {
          id: this.pluginId,
          type: config.type,
          title: config.title || this.pluginId,
          componentPath: config.componentPath,
          builtinComponent: config.builtinComponent,
          menuItems: config.menuItems?.map(item => ({ ...item, id: `${this.pluginId}.${item.id}` })),
          headerActions: config.headerActions?.map(action => ({ ...action, command: `${this.pluginId}.${action.command}` })),
        }
        this.registeredPanel = panelConfig
        this.sendToRenderer('plugin:panel:register', { pluginId: this.pluginId, panel: panelConfig })
        this.logger.info(`面板已注册: ${this.pluginId} (${config.type})`)
      },
    }
  }

  get clipboard(): { readText: () => string, writeText: (text: string) => void } {
    return {
      readText: () => this.electron.clipboard.readText(),
      writeText: (text: string) => this.electron.clipboard.writeText(text),
    }
  }

  get ipc(): {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => void
    send: (channel: string, ...args: unknown[]) => void
    sendToMain: (channel: string, ...args: unknown[]) => void
  } {
    const namespace = `plugin:${this.pluginId}:`
    return {
      handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
        const fullChannel = `${namespace}${channel}`
        if (this.ipcHandlers.includes(fullChannel)) {
          this.electron.ipcMain.removeHandler(fullChannel)
        }
        this.electron.ipcMain.handle(fullChannel, handler)
        if (!this.ipcHandlers.includes(fullChannel)) {
          this.ipcHandlers.push(fullChannel)
        }
      },
      send: (channel: string, ...args: unknown[]) => {
        this.sendToRenderer(`${namespace}${channel}`, ...args)
      },
      sendToMain: (channel: string, ...args: unknown[]) => {
        const allWindows = this.electron.BrowserWindow.getAllWindows()
        const mainWindow = allWindows.find(
          win => !win.isDestroyed() && !win.webContents.getURL().includes('devtools') && !win.webContents.getURL().includes('plugin-view'),
        )
        if (mainWindow) {
          mainWindow.webContents.send(`${namespace}${channel}`, ...args)
        }
      },
    }
  }

  private sendToRenderer(channel: string, ...args: unknown[]): void {
    this.electron.BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed() && !win.webContents.getURL().includes('devtools')) {
        win.webContents.send(channel, ...args)
      }
    })
  }

  dispose(): void {
    this.pluginWindows.forEach((pw) => {
      if (!pw.browserWindow.isDestroyed()) {
        pw.browserWindow.destroy()
      }
    })
    this.pluginWindows = []
    this.ipcHandlers.forEach((channel) => {
      this.electron.ipcMain.removeHandler(channel)
      this.electron.ipcMain.removeAllListeners(channel)
    })
    this.ipcHandlers = []
    this.sendToRenderer('plugin:dispose', { pluginId: this.pluginId })
    this.logger.info('插件资源已清理')
  }
}
