import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { windowConfigs } from '@/main/config/windows'
import { WindowName } from '@/shared/constants'
import { logger } from './logger'

export { WindowName }

export interface WindowConfig {
  windowName: WindowName
  title?: string
  width: number
  height: number
  modal: boolean
  lazy?: boolean
  resizable?: boolean
  moveCenter?: boolean
  singleton?: boolean
  maxInstances?: number
  url?: string
  route?: string
  setParent?: boolean
  noLayout?: boolean
  options?: BrowserWindowConstructorOptions
  operation?: (config: WindowConfig, win: BrowserWindow, parent?: BrowserWindow) => void
}

export interface WindowInstance<T = unknown> {
  windowName: WindowName
  window: Electron.BrowserWindow
  createdAt: Date
  data?: T
  parentId?: number
  resolver?: (value: unknown) => void
  rejecter?: (reason?: unknown) => void
}

export interface CreateWindowOptions<T = unknown> {
  config?: Partial<WindowConfig>
  data?: T
  parent?: BrowserWindow
  parentId?: number
}

export class WindowManager {
  private static instance: WindowManager | null = null
  private windowInstances: Map<number, WindowInstance> = new Map()
  private lazyWindowCache: Map<WindowName, BrowserWindow> = new Map()

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  public init(): void {
    this.initIPCHandlers()
    this.initAppHandlers()
    this.createWindow(WindowName.MAIN)
    logger.info('WindowManager initialized')
  }

  public createWindow<T = unknown>(
    windowName: WindowName,
    options?: CreateWindowOptions<T>,
  ): BrowserWindow | null {
    const baseConfig = windowConfigs.find(c => c.windowName === windowName)
    if (!baseConfig) {
      logger.error(`Window config not found: ${windowName}`)
      return null
    }

    const config: WindowConfig = { ...baseConfig, ...options?.config }

    if (!this.canCreateWindow(windowName, config)) {
      logger.warn(`Cannot create window: ${windowName}, max instances reached`)
      if (config.singleton) {
        const existing = this.getWindowByName(windowName)
        if (existing)
          this.showAndFocusWindow(existing)
      }
      return null
    }

    if (config.lazy && this.lazyWindowCache.has(windowName)) {
      const cached = this.lazyWindowCache.get(windowName)!
      if (!cached.isDestroyed()) {
        this.handleLazyWindow(cached, config, options)
        return cached
      }
      this.lazyWindowCache.delete(windowName)
    }

    return this.createNewWindow(windowName, config, options)
  }

  private createNewWindow<T>(
    windowName: WindowName,
    config: WindowConfig,
    options?: CreateWindowOptions<T>,
  ): BrowserWindow {
    let parent = options?.parent
    if (!parent && options?.parentId) {
      parent = this.windowInstances.get(options.parentId)?.window
    }

    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      ...config.options,
      width: config.width,
      height: config.height,
      title: config.title,
      resizable: config.resizable ?? false,
      modal: config.modal && !!parent,
      parent: config.setParent !== false ? parent : undefined,
      show: false,
    }

    const win = new BrowserWindow(windowOptions)
    const instance: WindowInstance<T> = {
      windowName,
      window: win,
      createdAt: new Date(),
      data: options?.data,
      parentId: parent?.id,
    }

    this.windowInstances.set(win.id, instance)
    if (config.lazy)
      this.lazyWindowCache.set(windowName, win)

    this.setupWindowEvents(win, windowName, config)
    this.loadWindowContent(win, config)

    win.once('ready-to-show', () => {
      if (config.moveCenter)
        this.centerWindow(win, parent)
      win.show()
    })

    return win
  }

  private handleLazyWindow<T>(
    win: BrowserWindow,
    config: WindowConfig,
    options?: CreateWindowOptions<T>,
  ): void {
    if (config.title)
      win.setTitle(config.title)

    const instance = this.windowInstances.get(win.id)
    if (instance && options?.data) {
      instance.data = options.data
      win.webContents.send('window:data', options.data)
    }

    win.show()
    win.focus()
  }

  private loadWindowContent(win: BrowserWindow, config: WindowConfig): void {
    if (config.url) {
      config.url.startsWith('http') ? win.loadURL(config.url) : win.loadFile(config.url)
      return
    }

    const route = config.route || (config.windowName === WindowName.MAIN ? '/' : `/${config.windowName}`)

    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${route}`)
    }
    else {
      win.loadFile(join(__dirname, '../../renderer/index.html'), { hash: route })
    }
  }

  private setupWindowEvents(win: BrowserWindow, name: WindowName, config: WindowConfig): void {
    win.on('close', (e) => {
      if (config.lazy && name !== WindowName.MAIN) {
        e.preventDefault()
        win.hide()
      }
      else if (name === WindowName.MAIN) {
        e.preventDefault()
        this.closeAllWindows(true)
        app.quit()
      }
    })

    win.on('closed', () => {
      this.windowInstances.delete(win.id)
      this.lazyWindowCache.delete(name)
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  public closeAllWindows(force = false): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (force) {
        win.removeAllListeners('close')
        win.destroy()
      }
      else {
        win.close()
      }
    })
  }

  private canCreateWindow(name: WindowName, config: WindowConfig): boolean {
    if (config.lazy && this.lazyWindowCache.has(name)) {
      return !this.lazyWindowCache.get(name)!.isDestroyed()
    }
    const count = this.getWindowsByName(name).length
    if (config.singleton && count > 0)
      return false
    if (config.maxInstances && count >= config.maxInstances)
      return false
    return true
  }

  public getWindowByName(name: WindowName): BrowserWindow | null {
    const instances = this.getWindowsByName(name)
    return instances.length > 0 ? instances[0].window : null
  }

  public getWindowsByName(name: WindowName): WindowInstance[] {
    return Array.from(this.windowInstances.values()).filter(i => i.windowName === name)
  }

  private showAndFocusWindow(win: BrowserWindow): void {
    if (win.isDestroyed())
      return
    if (win.isMinimized())
      win.restore()
    win.show()
    win.focus()
  }

  private centerWindow(win: BrowserWindow, parent?: BrowserWindow): void {
    if (parent && !parent.isDestroyed()) {
      const bounds = parent.getBounds()
      const [w, h] = win.getSize()
      const x = Math.floor(bounds.x + (bounds.width - w) / 2)
      const y = Math.floor(bounds.y + (bounds.height - h) / 2)
      win.setPosition(x, y)
    }
    else {
      win.center()
    }
  }

  private initIPCHandlers(): void {
    ipcMain.on('window:create', (_, name: WindowName, opts) => this.createWindow(name, opts))
    ipcMain.handle('window:create-async', async (_, name: WindowName, opts) => {
      return new Promise((resolve) => {
        const win = this.createWindow(name, opts)
        if (win) {
          const instance = this.windowInstances.get(win.id)
          if (instance)
            instance.resolver = resolve
        }
        else {
          resolve(null)
        }
      })
    })
    ipcMain.handle('window:get-config', (e) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win)
        return null
      const instance = this.windowInstances.get(win.id)
      if (!instance)
        return null
      const config = windowConfigs.find(c => c.windowName === instance.windowName)
      return config || null
    })
    ipcMain.handle('window:get-data', (e) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win)
        return null
      const instance = this.windowInstances.get(win.id)
      return instance?.data || null
    })
    ipcMain.on('window:close', (e, _, windowId?: number, windowName?: WindowName) => {
      let win: BrowserWindow | null = null
      if (windowId) {
        win = BrowserWindow.fromId(windowId)
      }
      else if (windowName) {
        win = this.getWindowByName(windowName)
      }
      else {
        win = BrowserWindow.fromWebContents(e.sender)
      }
      win?.close()
    })
    ipcMain.on('window:minimize', e => BrowserWindow.fromWebContents(e.sender)?.minimize())
    ipcMain.on('window:toggle-maximize', (e) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win)
        win.isMaximized() ? win.unmaximize() : win.maximize()
    })
    ipcMain.on('window:resize', (e, size: { width: number, height: number }) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win)
        win.setSize(size.width, size.height)
    })
  }

  private initAppHandlers(): void {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0)
        this.createWindow(WindowName.MAIN)
    })
    app.on('window-all-closed', () => {
      // Only quit if not macOS and all windows are truly closed (not just hidden)
      // Actually, window-all-closed only fires when all windows are destroyed.
      // If we have hidden windows, it won't fire.
      // So the issue might be that the loading window IS destroyed.
      // But we set lazy: true for it.
      // Let's log it to be sure.
      logger.info('window-all-closed triggered')
      if (process.platform !== 'darwin')
        app.quit()
    })
  }
}

export default WindowManager.getInstance()
