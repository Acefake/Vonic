/**
 * 插件 API - 主程序暴露给插件的能力
 */

import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, clipboard, ipcMain, Notification, shell } from 'electron'
import { logger } from '../logger'
import store from '../store'

/** 菜单项 */
export interface MenuItemInfo {
  id: string
  label: string
  icon?: string
  command?: string
}

/** 视图配置 */
export interface ViewConfig {
  /** 视图 ID */
  id: string
  /** 视图标题 */
  title: string
  /** 视图图标 */
  icon?: string
  /** 视图类型: page=页面路由, modal=弹窗, window=子窗口 */
  type: 'page' | 'modal' | 'window'
  /** 窗口配置 (type=window 时使用) */
  window?: {
    width?: number
    height?: number
    resizable?: boolean
    frame?: boolean
    modal?: boolean
  }
}

/** 插件窗口实例 */
interface PluginWindow {
  id: string
  browserWindow: BrowserWindow
}

/** 插件 API */
export class PluginAPI {
  private pluginId: string
  private ipcHandlers: string[] = []
  private pluginWindows: PluginWindow[] = []
  private registeredViews: ViewConfig[] = []
  private registeredMenus: MenuItemInfo[] = []
  private registeredPanel: any = null

  constructor(pluginId: string) {
    this.pluginId = pluginId
  }

  /** 获取插件 ID */
  getPluginId(): string {
    return this.pluginId
  }

  /** 获取已注册的菜单 */
  getRegisteredMenus(): MenuItemInfo[] {
    return this.registeredMenus
  }

  /** 获取已注册的面板 */
  getRegisteredPanel(): any {
    return this.registeredPanel
  }

  /** 日志 */
  get logger(): {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  } {
    return {
      info: (...args: any[]) => logger.info(`[${this.pluginId}]`, ...args),
      warn: (...args: any[]) => logger.warn(`[${this.pluginId}]`, ...args),
      error: (...args: any[]) => logger.error(`[${this.pluginId}]`, ...args),
    }
  }

  /** 存储 */
  get storage(): {
    get: <T>(key: string, defaultValue?: T) => T
    set: (key: string, value: any) => void
    delete: (key: string) => void
  } {
    const prefix = `plugin:${this.pluginId}:`
    return {
      get: <T>(key: string, defaultValue?: T): T => store.get(`${prefix}${key}`, defaultValue) as T,
      set: (key: string, value: any) => store.set(`${prefix}${key}`, value),
      delete: (key: string) => store.delete(`${prefix}${key}` as any),
    }
  }

  /** 命令 */
  get commands(): {
    register: (commandId: string, _title: string, handler: (...args: any[]) => any) => void
  } {
    return {
      register: (commandId: string, _title: string, handler: (...args: any[]) => any) => {
        const fullId = `${this.pluginId}.${commandId}`
        const channel = `command:${fullId}`
        // 如果已注册过，先移除旧的 handler
        if (this.ipcHandlers.includes(channel)) {
          ipcMain.removeHandler(channel)
        }
        ipcMain.handle(channel, (_, ...args) => handler(...args))
        if (!this.ipcHandlers.includes(channel)) {
          this.ipcHandlers.push(channel)
        }
        this.logger.info(`命令已注册: ${fullId}`)
      },
    }
  }

  /** UI 弹窗 */
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
        new Notification({ title, body }).show()
      },
      showConfirm: (title: string, content: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const channel = `${this.pluginId}:confirm:${Date.now()}`
          ipcMain.handleOnce(channel, (_, value) => {
            resolve(value)
            return true
          })
          this.sendToRenderer('plugin:ui:confirm', { title, content, channel })
        })
      },
      showInput: (title: string, placeholder?: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const channel = `${this.pluginId}:input:${Date.now()}`
          ipcMain.handleOnce(channel, (_, value) => {
            resolve(value)
            return true
          })
          this.sendToRenderer('plugin:ui:input', { title, placeholder, channel })
        })
      },
      showModal: (options: { title: string, content: string, width?: number }) => {
        this.sendToRenderer('plugin:ui:modal', options)
      },
      openExternal: (url: string) => shell.openExternal(url),
    }
  }

  /** 视图管理 - 注册页面/弹窗/子窗口 */
  get views(): {
    register: (viewId: string, config: Omit<ViewConfig, 'id'>) => void
    open: (viewId: string, data?: any) => BrowserWindow | null
    close: (viewId: string) => void
  } {
    return {
      /** 注册视图 */
      register: (viewId: string, config: Omit<ViewConfig, 'id'>) => {
        const fullId = `${this.pluginId}.${viewId}`
        const viewConfig: ViewConfig = { id: fullId, ...config }
        this.registeredViews.push(viewConfig)

        // 通知渲染进程注册路由
        this.sendToRenderer('plugin:view:register', {
          pluginId: this.pluginId,
          view: viewConfig,
        })
        this.logger.info(`视图已注册: ${fullId} (${config.type})`)
      },

      /** 打开视图 */
      open: (viewId: string, data?: any) => {
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

      /** 关闭窗口 */
      close: (viewId: string) => {
        const fullId = viewId.includes('.') ? viewId : `${this.pluginId}.${viewId}`
        const pw = this.pluginWindows.find(w => w.id === fullId)
        if (pw && !pw.browserWindow.isDestroyed()) {
          pw.browserWindow.close()
        }
      },
    }
  }

  /** 创建插件子窗口 */
  private createPluginWindow(viewId: string, config: ViewConfig, data?: any): BrowserWindow {
    const mainWindow = BrowserWindow.getAllWindows().find(
      win => !win.isDestroyed() && !win.webContents.getURL().includes('devtools'),
    )

    const win = new BrowserWindow({
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
        preload: join(__dirname, '../preload/index.js'),
      },
    })

    // 隐藏菜单栏
    win.setMenuBarVisibility(false)

    // 加载插件视图路由
    const route = `/plugin-view/${viewId}`
    const query = data ? `?data=${encodeURIComponent(JSON.stringify(data))}` : ''

    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${route}${query}`)
    }
    else {
      win.loadFile(join(__dirname, '../../renderer/index.html'), { hash: `${route}${query}` })
    }

    this.pluginWindows.push({ id: viewId, browserWindow: win })

    win.on('closed', () => {
      this.pluginWindows = this.pluginWindows.filter(w => w.id !== viewId)
    })

    this.logger.info(`子窗口已创建: ${viewId}`)
    return win
  }

  /** 菜单 */
  get menus(): {
    registerSidebar: (items: MenuItemInfo[]) => void
  } {
    return {
      registerSidebar: (items: MenuItemInfo[]) => {
        const mappedItems = items.map(item => ({
          ...item,
          id: `${this.pluginId}.${item.id}`,
        }))
        // 存储已注册的菜单
        this.registeredMenus = mappedItems
        this.sendToRenderer('plugin:menu:register', { pluginId: this.pluginId, items: mappedItems })
      },
    }
  }

  /** 面板 - 自定义侧边栏面板 */
  get panels(): {
    register: (config: {
      type: 'menu' | 'component' | 'builtin'
      title?: string
      componentPath?: string
      builtinComponent?: string
      menuItems?: MenuItemInfo[]
      headerActions?: { icon: string, title: string, command: string }[]
    }) => void
  } {
    return {
      /**
       * 注册自定义面板
       * @param config 面板配置
       * - type: 'menu' | 'component' | 'builtin'
       * - componentPath: Vue 组件相对路径 (type='component' 时)
       * - builtinComponent: 内置组件名 (type='builtin' 时)
       * - menuItems: 菜单项列表 (type='menu' 时)
       */
      register: (config: {
        type: 'menu' | 'component' | 'builtin'
        title?: string
        componentPath?: string
        builtinComponent?: string
        menuItems?: MenuItemInfo[]
        headerActions?: { icon: string, title: string, command: string }[]
      }) => {
        const panelConfig = {
          id: this.pluginId,
          type: config.type,
          title: config.title || this.pluginId,
          componentPath: config.componentPath,
          builtinComponent: config.builtinComponent,
          menuItems: config.menuItems?.map(item => ({
            ...item,
            id: `${this.pluginId}.${item.id}`,
          })),
          headerActions: config.headerActions?.map(action => ({
            ...action,
            command: `${this.pluginId}.${action.command}`,
          })),
        }
        // 存储已注册的面板
        this.registeredPanel = panelConfig
        this.sendToRenderer('plugin:panel:register', { pluginId: this.pluginId, panel: panelConfig })
        this.logger.info(`面板已注册: ${this.pluginId} (${config.type})`)
      },
    }
  }

  /** 剪贴板 */
  get clipboard(): {
    readText: () => string
    writeText: (text: string) => void
  } {
    return {
      readText: () => clipboard.readText(),
      writeText: (text: string) => clipboard.writeText(text),
    }
  }

  /** IPC 通信 */
  get ipc(): {
    handle: (channel: string, handler: (...args: any[]) => any) => void
    send: (channel: string, ...args: any[]) => void
    sendToMain: (channel: string, ...args: any[]) => void
  } {
    const namespace = `plugin:${this.pluginId}:`
    return {
      handle: (channel: string, handler: (...args: any[]) => any) => {
        const fullChannel = `${namespace}${channel}`
        // 如果已注册过，先移除旧的 handler
        if (this.ipcHandlers.includes(fullChannel)) {
          ipcMain.removeHandler(fullChannel)
        }
        ipcMain.handle(fullChannel, handler)
        if (!this.ipcHandlers.includes(fullChannel)) {
          this.ipcHandlers.push(fullChannel)
        }
      },
      /** 发送消息到所有渲染进程 */
      send: (channel: string, ...args: any[]) => {
        this.sendToRenderer(`${namespace}${channel}`, ...args)
      },
      /** 发送消息到主窗口 */
      sendToMain: (channel: string, ...args: any[]) => {
        const allWindows = BrowserWindow.getAllWindows()
        this.logger.info(`查找主窗口，当前窗口数: ${allWindows.length}`)
        allWindows.forEach((win) => {
          this.logger.info(`  - ${win.webContents.getURL()}`)
        })
        const mainWindow = allWindows.find(
          win => !win.isDestroyed()
            && !win.webContents.getURL().includes('devtools')
            && !win.webContents.getURL().includes('plugin-view'),
        )
        if (mainWindow) {
          const fullChannel = `${namespace}${channel}`
          this.logger.info(`发送到主窗口: ${fullChannel}`)
          mainWindow.webContents.send(fullChannel, ...args)
        }
        else {
          this.logger.warn('未找到主窗口')
        }
      },
    }
  }

  /** 发送消息到渲染进程 */
  private sendToRenderer(channel: string, ...args: any[]): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed() && !win.webContents.getURL().includes('devtools')) {
        win.webContents.send(channel, ...args)
      }
    })
  }

  /** 清理资源 */
  dispose(): void {
    // 关闭所有插件窗口
    this.pluginWindows.forEach((pw) => {
      if (!pw.browserWindow.isDestroyed()) {
        pw.browserWindow.destroy()
      }
    })
    this.pluginWindows = []

    // 清理 IPC（这些 channel 都是我们注册的，可以安全移除）
    this.ipcHandlers.forEach((channel) => {
      ipcMain.removeHandler(channel)
      ipcMain.removeAllListeners(channel)
    })
    this.ipcHandlers = []

    // 通知渲染进程
    this.sendToRenderer('plugin:dispose', { pluginId: this.pluginId })
    this.logger.info('插件资源已清理')
  }
}
