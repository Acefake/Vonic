/**
 * Web 端插件 API 实现
 */
import type {
  Logger,
  MenuItemInfo,
  PanelConfig,
  PluginAPI,
  Storage,
  ViewConfig,
} from './types'

export interface WebPluginAPIConfig {
  pluginId: string
  logger?: Logger
  storage?: Storage
  onMessage?: (channel: string, ...args: unknown[]) => void
}

export class WebPluginAPI implements PluginAPI {
  private pluginId: string
  private baseLogger: Logger
  private baseStorage: Storage
  private messageHandlers: Map<string, (...args: unknown[]) => unknown> = new Map()
  private registeredViews: ViewConfig[] = []
  private registeredMenus: MenuItemInfo[] = []
  private registeredPanel: PanelConfig | null = null
  private onMessage?: (channel: string, ...args: unknown[]) => void

  constructor(config: WebPluginAPIConfig) {
    this.pluginId = config.pluginId
    this.onMessage = config.onMessage
    this.baseLogger = config.logger || {
      info: (...args: unknown[]) => console.log(`[${this.pluginId}]`, ...args),
      warn: (...args: unknown[]) => console.warn(`[${this.pluginId}]`, ...args),
      error: (...args: unknown[]) => console.error(`[${this.pluginId}]`, ...args),
    }
    this.baseStorage = config.storage || this.createLocalStorage()
  }

  private createLocalStorage(): Storage {
    const prefix = `plugin:${this.pluginId}:`
    return {
      get: <T>(key: string, defaultValue?: T): T => {
        try {
          const value = localStorage.getItem(`${prefix}${key}`)
          return value ? JSON.parse(value) : (defaultValue as T)
        }
        catch {
          return defaultValue as T
        }
      },
      set: (key: string, value: unknown) => {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(value))
      },
      delete: (key: string) => {
        localStorage.removeItem(`${prefix}${key}`)
      },
    }
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
    return this.baseStorage
  }

  get commands(): PluginAPI['commands'] {
    return {
      register: (commandId: string, _title: string, handler: (...args: unknown[]) => unknown) => {
        const fullId = `${this.pluginId}.${commandId}`
        this.messageHandlers.set(`command:${fullId}`, handler)
        this.logger.info(`命令已注册: ${fullId}`)
      },
    }
  }

  get ui(): PluginAPI['ui'] {
    return {
      showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => {
        this.sendMessage('plugin:ui:message', { type, content })
      },
      showNotification: (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body })
        }
        else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(title, { body })
            }
          })
        }
      },
      showConfirm: (title: string, content: string): Promise<boolean> => {
        return Promise.resolve(window.confirm(`${title}\n\n${content}`))
      },
      showInput: (title: string, placeholder?: string): Promise<string | null> => {
        return Promise.resolve(window.prompt(title, placeholder || ''))
      },
      showModal: (options: { title: string, content: string, width?: number }) => {
        this.sendMessage('plugin:ui:modal', options)
      },
      openExternal: (url: string) => {
        window.open(url, '_blank')
        return Promise.resolve()
      },
    }
  }

  get views(): PluginAPI['views'] {
    return {
      register: (viewId: string, config: Omit<ViewConfig, 'id'>) => {
        const fullId = `${this.pluginId}.${viewId}`
        const viewConfig: ViewConfig = { id: fullId, ...config }
        this.registeredViews.push(viewConfig)
        this.sendMessage('plugin:view:register', { pluginId: this.pluginId, view: viewConfig })
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
          const width = view.window?.width || 800
          const height = view.window?.height || 600
          const query = data ? `?data=${encodeURIComponent(JSON.stringify(data))}` : ''
          window.open(`/plugin-view/${fullId}${query}`, fullId, `width=${width},height=${height}`)
        }
        else if (view.type === 'modal') {
          this.sendMessage('plugin:view:open-modal', { viewId: fullId, data })
        }
        else {
          this.sendMessage('plugin:view:navigate', { viewId: fullId, data })
        }
        return null
      },
      close: (viewId: string) => {
        const fullId = viewId.includes('.') ? viewId : `${this.pluginId}.${viewId}`
        this.sendMessage('plugin:view:close', { viewId: fullId })
      },
    }
  }

  get menus(): PluginAPI['menus'] {
    return {
      registerSidebar: (items: MenuItemInfo[]) => {
        const mappedItems = items.map(item => ({ ...item, id: `${this.pluginId}.${item.id}` }))
        this.registeredMenus = mappedItems
        this.sendMessage('plugin:menu:register', { pluginId: this.pluginId, items: mappedItems })
      },
    }
  }

  get panels(): PluginAPI['panels'] {
    return {
      register: (config: PanelConfig) => {
        const panelConfig = {
          id: this.pluginId,
          type: config.type,
          title: config.title || this.pluginId,
          componentPath: config.componentPath,
          builtinComponent: config.builtinComponent,
          menuItems: config.menuItems?.map((item: MenuItemInfo) => ({ ...item, id: `${this.pluginId}.${item.id}` })),
          headerActions: config.headerActions?.map((action: { icon: string, title: string, command: string }) => ({ ...action, command: `${this.pluginId}.${action.command}` })),
        }
        this.registeredPanel = panelConfig
        this.sendMessage('plugin:panel:register', { pluginId: this.pluginId, panel: panelConfig })
        this.logger.info(`面板已注册: ${this.pluginId} (${config.type})`)
      },
    }
  }

  get clipboard(): PluginAPI['clipboard'] {
    return {
      readText: async () => {
        if (navigator.clipboard) {
          return await navigator.clipboard.readText()
        }
        return ''
      },
      writeText: async (text: string) => {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text)
        }
      },
    }
  }

  get ipc(): PluginAPI['ipc'] {
    const namespace = `plugin:${this.pluginId}:`
    return {
      handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
        this.messageHandlers.set(`${namespace}${channel}`, handler)
      },
      send: (channel: string, ...args: unknown[]) => {
        this.sendMessage(`${namespace}${channel}`, ...args)
      },
      sendToMain: (channel: string, ...args: unknown[]) => {
        this.sendMessage(`${namespace}${channel}`, ...args)
      },
    }
  }

  private sendMessage(channel: string, ...args: unknown[]): void {
    if (this.onMessage) {
      this.onMessage(channel, ...args)
    }
    window.dispatchEvent(new CustomEvent('plugin-message', {
      detail: { channel, args },
    }))
  }

  handleMessage(channel: string, ...args: unknown[]): unknown {
    const handler = this.messageHandlers.get(channel)
    if (handler) {
      return handler(...args)
    }
    return undefined
  }

  dispose(): void {
    this.messageHandlers.clear()
    this.registeredViews = []
    this.registeredMenus = []
    this.registeredPanel = null
    this.sendMessage('plugin:dispose', { pluginId: this.pluginId })
    this.logger.info('插件资源已清理')
  }
}
