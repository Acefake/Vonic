import type {
  CreateWindowOptions,
  WindowConfig,
  WindowInstance,
} from './types'
import path, { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

import { app, BrowserWindow, ipcMain, shell } from 'electron'

import { getWindowConfig, WindowName } from './config'

/** 窗口管理器 - 统一管理所有窗口的生命周期 */
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

  /**
   * 创建窗口
   * @param windowName - 窗口名称
   * @param options - 窗口选项
   * @returns 窗口实例
   */
  public createWindow<T = unknown>(
    windowName: WindowName,
    options?: CreateWindowOptions<T>,
  ): BrowserWindow | null {
    const baseConfig = getWindowConfig(windowName)
    if (!baseConfig) {
      console.error(`窗口配置不存在: ${windowName}`)
      return null
    }

    const config: WindowConfig = { ...baseConfig, ...options?.config }

    if (!this.canCreateWindow(windowName, config)) {
      console.warn(`无法创建窗口: ${windowName}，已达到最大实例数量`)
      if (config.singleton) {
        const existingWindow = this.getWindowByName(windowName)
        if (existingWindow) {
          this.showAndFocusWindow(existingWindow)
        }
      }
      return null
    }

    if (config.lazy && this.lazyWindowCache.has(windowName)) {
      const cachedWindow = this.lazyWindowCache.get(windowName)!
      if (!cachedWindow.isDestroyed()) {
        // 获取当前需要的父窗口
        let newParent: BrowserWindow | undefined = options?.parent
        if (!newParent && options?.parentId) {
          newParent = this.windowInstances.get(options.parentId)?.window
        }

        // 检查父窗口关系是否需要更新
        // Electron 的 parent 属性是只读的，无法修改，所以如果父窗口改变了，需要重新创建窗口
        const currentParent = cachedWindow.getParentWindow()
        const needsParent = config.setParent !== false
        // 需要父窗口且新父窗口存在时，检查父窗口是否改变
        const needsNewParent = needsParent && newParent !== undefined
        const hasCurrentParent = currentParent !== null && !currentParent.isDestroyed()
        // 如果设置了 setParent，但父窗口关系不匹配，需要重新创建
        const parentMismatch = needsParent && (
          (needsNewParent && newParent && (!hasCurrentParent || currentParent.id !== newParent.id))
          || (!needsNewParent && hasCurrentParent)
        )

        if (parentMismatch) {
          cachedWindow.removeAllListeners('ready-to-show')
          this.windowInstances.delete(cachedWindow.id)
          cachedWindow.destroy()
          this.lazyWindowCache.delete(windowName)
        }
        else {
          if (config.title)
            cachedWindow.setTitle(config.title)

          const instance = this.windowInstances.get(cachedWindow.id)
          if (instance && options?.data) {
            instance.data = options.data
            cachedWindow.webContents.send('window:data', options.data)
          }

          // 更新实例的父窗口 ID
          if (instance && newParent) {
            instance.parentId = newParent.id
          }

          // 移除之前可能存在的 ready-to-show 监听器，防止重复触发
          cachedWindow.removeAllListeners('ready-to-show')

          // 如果窗口内容已经加载完成，直接显示；否则等待 ready-to-show 事件
          if (!cachedWindow.webContents.isLoading()) {
            // 内容已加载完成，直接显示并居中
            if (config.moveCenter && !config.operation) {
              this.centerWindow(cachedWindow, newParent)
            }
            this.showAndFocusWindow(cachedWindow)
          }
          else {
            // 内容还在加载，等待 ready-to-show 事件
            cachedWindow.once('ready-to-show', () => {
              if (config.moveCenter && !config.operation) {
                this.centerWindow(cachedWindow, newParent)
              }
              this.showAndFocusWindow(cachedWindow)
            })
          }
          return cachedWindow
        }
      }
      else {
        // 缓存的窗口已销毁，清理缓存
        this.lazyWindowCache.delete(windowName)
      }
    }

    let parent: BrowserWindow | undefined = options?.parent
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
      parent: config.setParent !== false && parent ? parent : undefined,
      show: false, // 明确设置为 false，防止窗口在准备完成前显示导致闪烁
    }

    const browserWindow = new BrowserWindow(windowOptions)
    const windowInstance: WindowInstance<T> = {
      windowName,
      window: browserWindow,
      createdAt: new Date(),
      data: options?.data,
      parentId: parent?.id,
    }

    this.windowInstances.set(browserWindow.id, windowInstance)
    if (config.lazy)
      this.lazyWindowCache.set(windowName, browserWindow)

    this.setupWindowEvents(browserWindow, windowName, config)
    if (config.operation)
      config.operation(config, browserWindow, parent)
    this.loadWindowContent(browserWindow, config)

    browserWindow.webContents.on('did-finish-load', () => {
      if (config.title)
        browserWindow.setTitle(config.title)
      if (options?.data)
        browserWindow.webContents.send('window:data', options.data)
    })

    browserWindow.on('ready-to-show', () => {
      // 先居中窗口，再显示，避免闪烁
      if (config.moveCenter && !config.operation) {
        this.centerWindow(browserWindow, parent)
      }
      browserWindow.show()
    })

    return browserWindow
  }

  /**
   * 显示并聚焦窗口
   * @param window - 窗口实例
   */
  private showAndFocusWindow(window: BrowserWindow): void {
    if (window.isDestroyed())
      return
    if (!window.isVisible())
      window.show()
    if (window.isMinimized())
      window.restore()
    window.focus()
  }

  /**
   * 居中窗口
   * @param window - 窗口实例
   * @param parent - 父窗口实例
   */
  private centerWindow(window: BrowserWindow, parent?: BrowserWindow): void {
    if (parent && !parent.isDestroyed()) {
      const parentBounds = parent.getBounds()
      const [width, height] = window.getSize()
      const x = Math.floor(parentBounds.x + parentBounds.width / 2 - width / 2)
      const y = Math.floor(parentBounds.y + parentBounds.height / 2 - height / 2)
      window.setPosition(x, y)
    }
    else {
      window.center()
    }
  }

  /**
   * 检查是否可以创建窗口
   * @param windowName - 窗口名称
   * @param config - 窗口配置
   * @returns 是否可以创建窗口
   */
  private canCreateWindow(windowName: WindowName, config: WindowConfig): boolean {
    if (config.lazy && this.lazyWindowCache.has(windowName)) {
      const cachedWindow = this.lazyWindowCache.get(windowName)!
      if (!cachedWindow.isDestroyed())
        return true
    }

    const existingWindows = this.getWindowsByName(windowName)
    if (config.singleton && existingWindows.length > 0)
      return false
    if (config.maxInstances && existingWindows.length >= config.maxInstances)
      return false
    return true
  }

  /**
   * 设置窗口事件
   * @param window - 窗口实例
   * @param windowName - 窗口名称
   * @param config - 窗口配置
   */
  private setupWindowEvents(
    window: BrowserWindow,
    windowName: WindowName,
    config: WindowConfig,
  ): void {
    window.on('close', (event) => {
      if (config.lazy && windowName !== WindowName.MAIN) {
        event.preventDefault()
        // 移除 ready-to-show 监听器，防止关闭后自动显示
        window.removeAllListeners('ready-to-show')
        window.hide()
      }
      else if (windowName === WindowName.MAIN) {
        // 主窗口关闭时，强制关闭除主窗口外的所有窗口并触发应用退出
        // 阻止主窗口的默认关闭行为，先处理所有子窗口
        event.preventDefault()

        const allWindows = BrowserWindow.getAllWindows()
        console.log(`[WindowManager] 主窗口关闭，发现 ${allWindows.length} 个窗口`)

        // 先处理所有子窗口
        allWindows.forEach((win) => {
          // 跳过主窗口自己
          if (win.id !== window.id && !win.isDestroyed()) {
            // 移除所有 close 事件监听器，防止 preventDefault 阻止关闭
            // 对所有窗口都移除，确保懒加载窗口的 preventDefault 不会生效
            win.removeAllListeners('close')

            // 直接销毁窗口，destroy() 不会触发 close 事件，可以绕过 preventDefault
            win.destroy()
          }
        })

        // 清理缓存
        this.lazyWindowCache.clear()

        // 移除主窗口的 close 监听器，避免递归调用
        window.removeAllListeners('close')

        // 销毁主窗口自己（使用 destroy 而不是 close，避免再次触发 close 事件）
        // 注意：这会在 closed 事件中清理 windowInstances
        window.destroy()

        app.quit()
      }
    })

    window.on('closed', () => {
      this.windowInstances.delete(window.id)
      this.lazyWindowCache.delete(windowName)
    })

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })
  }

  /**
   * 加载窗口内容
   * @param window - 窗口实例
   * @param config - 窗口配置
   */
  private loadWindowContent(
    window: BrowserWindow,
    config: WindowConfig,
  ): void {
    if (config.url) {
      config.url.startsWith('http')
        ? window.loadURL(config.url)
        : window.loadFile(config.url)
      return
    }

    const routePath = this.getRoutePathForWindow(config)
    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${routePath}`)
    }
    else {
      window.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: routePath,
      })
    }
  }

  /**
   * 获取窗口路由路径
   * @param config - 窗口配置
   * @returns 窗口路由路径
   */
  private getRoutePathForWindow(config: WindowConfig): string {
    if (config.route)
      return config.route
    const windowName = config.windowName.toLowerCase()
    return (windowName === 'main' || windowName === 'home') ? '/' : `/${windowName}`
  }

  /**
   * 关闭窗口
   * @param windowId - 窗口ID
   * @param force - 是否强制关闭
   * @param result - 关闭结果
   */
  public closeWindow(windowId: number, force = false, result?: unknown): void {
    const instance = this.windowInstances.get(windowId)
    if (instance && !instance.window.isDestroyed()) {
      // 如果有 resolver，先 resolve Promise
      if (instance.resolver) {
        instance.resolver(result)
        instance.resolver = undefined
        instance.rejecter = undefined
      }

      const config = getWindowConfig(instance.windowName)
      force || !config?.lazy ? instance.window.destroy() : instance.window.hide()
    }
  }

  /**
   * 关闭所有窗口
   * @param force - 是否强制关闭
   */
  public closeAllWindows(force = false): void {
    // 使用 BrowserWindow.getAllWindows() 确保获取所有窗口，不遗漏任何窗口
    const allWindows = BrowserWindow.getAllWindows()
    console.log(`[WindowManager] closeAllWindows(${force ? 'force' : 'normal'})，发现 ${allWindows.length} 个窗口`)

    allWindows.forEach((win) => {
      if (!win.isDestroyed()) {
        if (force) {
          // 强制关闭：移除所有 close 监听器，然后直接销毁窗口，绕过 close 事件的 preventDefault
          win.removeAllListeners('close')
          win.destroy()
          console.log(`[WindowManager] 已强制销毁窗口 ID: ${win.id}`)
        }
        else {
          // 非强制关闭：通过 closeWindow 方法，会处理懒加载窗口的隐藏逻辑
          const instance = Array.from(this.windowInstances.values()).find(
            inst => inst.window.id === win.id,
          )
          if (instance) {
            this.closeWindow(win.id, force)
          }
          else {
            // 如果窗口不在 windowInstances 中，直接销毁
            win.destroy()
          }
        }
      }
    })
  }

  /**
   * 获取窗口实例
   * @param windowName - 窗口名称
   * @returns 窗口实例
   */
  public getWindowByName(windowName: WindowName): BrowserWindow | null {
    const instances = this.getWindowsByName(windowName)
    return instances.length > 0 ? instances[0].window : null
  }

  /**
   * 获取窗口实例列表
   * @param windowName - 窗口名称
   * @returns 窗口实例列表
   */
  public getWindowsByName(windowName: WindowName): WindowInstance[] {
    return Array.from(this.windowInstances.values()).filter(
      instance => instance.windowName === windowName,
    )
  }

  /**
   * 获取窗口实例
   * @param windowId - 窗口ID
   * @returns 窗口实例
   */
  public getWindowById(windowId: number): WindowInstance | undefined {
    return this.windowInstances.get(windowId)
  }

  /**
   * 获取所有窗口实例
   * @returns 所有窗口实例
   */
  public getAllWindows(): WindowInstance[] {
    return Array.from(this.windowInstances.values())
  }

  /**
   * 获取窗口实例数量
   * @returns 窗口实例数量
   */
  public getWindowCount(): number {
    return this.windowInstances.size
  }

  /**
   * 获取窗口实例数量
   * @param windowName - 窗口名称
   * @returns 窗口实例数量
   */
  public getWindowCountByName(windowName: WindowName): number {
    return this.getWindowsByName(windowName).length
  }

  /**
   * 聚焦窗口
   * @param windowId - 窗口ID
   */
  public focusWindow(windowId: number): void {
    const instance = this.windowInstances.get(windowId)
    if (instance) {
      this.showAndFocusWindow(instance.window)
    }
  }

  /**
   * 最小化窗口
   * @param windowId - 窗口ID
   */
  public minimizeWindow(windowId: number): void {
    const instance = this.windowInstances.get(windowId)
    if (instance && !instance.window.isDestroyed())
      instance.window.minimize()
  }

  /**
   * 切换窗口最大化
   * @param windowId - 窗口ID
   */
  public toggleMaximizeWindow(windowId: number): void {
    const instance = this.windowInstances.get(windowId)
    if (instance && !instance.window.isDestroyed()) {
      instance.window.isMaximized() ? instance.window.unmaximize() : instance.window.maximize()
    }
  }

  /**
   * 获取窗口数据
   * @param windowId - 窗口ID
   * @returns 窗口数据
   */
  public getWindowData<T = unknown>(windowId: number): T | undefined {
    return this.windowInstances.get(windowId)?.data as T | undefined
  }

  /**
   * 更新窗口数据
   * @param windowId - 窗口ID
   * @param data - 窗口数据
   */
  public updateWindowData<T = unknown>(windowId: number, data: T): void {
    const instance = this.windowInstances.get(windowId)
    if (instance) {
      instance.data = data
      if (!instance.window.isDestroyed()) {
        instance.window.webContents.send('window:data', data)
      }
    }
  }

  /**
   * 销毁懒加载窗口
   * @param windowName - 窗口名称
   */
  public destroyLazyWindow(windowName: WindowName): void {
    const cachedWindow = this.lazyWindowCache.get(windowName)
    if (cachedWindow && !cachedWindow.isDestroyed())
      cachedWindow.destroy()
    this.lazyWindowCache.delete(windowName)
  }

  /**
   * 清除懒加载窗口缓存
   */
  public clearLazyWindowCache(): void {
    this.lazyWindowCache.forEach((window) => {
      if (!window.isDestroyed())
        window.destroy()
    })
    this.lazyWindowCache.clear()
  }

  /**
   * 销毁窗口管理器
   */
  public destroy(): void {
    this.closeAllWindows(true)
    this.clearLazyWindowCache()
    this.windowInstances.clear()
    WindowManager.instance = null
  }

  /**
   * 初始化窗口管理器
   */
  public init(): void {
    this.initIPCHandlers()
    this.initAppHandlers()
    const mainWindow = this.createWindow(WindowName.MAIN)

    if (mainWindow) {
      if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
        mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
      }
      else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
      }
    }

    console.warn('[INFO] 窗口管理器初始化成功')
  }

  /**
   * 设置默认父窗口
   * @param event - IPC 事件
   * @param options - 窗口选项
   * @returns 更新后的窗口选项
   */
  private setDefaultParent<T>(
    event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent,
    options?: CreateWindowOptions<T>,
  ): CreateWindowOptions<T> | undefined {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    if (senderWindow && !options?.parent && !options?.parentId) {
      return {
        ...options,
        parent: senderWindow,
      }
    }
    return options
  }

  /**
   * 初始化 IPC 处理器
   */
  private initIPCHandlers(): void {
    ipcMain.on('window:create', (event, windowName: WindowName, options?: CreateWindowOptions) => {
      this.createWindow(windowName, this.setDefaultParent(event, options))
    })

    ipcMain.handle('window:create-async', async (event, windowName: WindowName, options?: CreateWindowOptions) => {
      return new Promise((resolve, reject) => {
        const window = this.createWindow(windowName, this.setDefaultParent(event, options))
        if (!window) {
          reject(new Error(`无法创建窗口: ${windowName}`))
          return
        }

        const instance = this.windowInstances.get(window.id)
        if (instance) {
          instance.resolver = resolve
          instance.rejecter = reject
        }
      })
    })

    ipcMain.handle('window:get-data', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      return window ? this.getWindowData(window.id) : null
    })

    ipcMain.on('window:update-data', (event, data: unknown) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window)
        this.updateWindowData(window.id, data)
    })

    // IPC: 关闭窗口
    // 如果提供了 windowId，关闭指定窗口；否则关闭当前窗口
    ipcMain.on('window:close', (event, result?: unknown, windowId?: number, windowName?: WindowName) => {
      if (windowId) {
        // 通过 windowId 关闭指定窗口
        this.closeWindow(windowId, false, result)
      }
      else if (windowName) {
        // 通过窗口名称关闭所有同名窗口
        const windows = this.getWindowsByName(windowName)
        windows.forEach((instance, index) => {
          if (!instance.window.isDestroyed()) {
            // 只给第一个窗口传递 result（通常异步窗口只有一个实例）
            const closeResult = index === 0 ? result : undefined
            this.closeWindow(instance.window.id, false, closeResult)
          }
        })
      }
      else {
        // 关闭当前窗口
        const window = BrowserWindow.fromWebContents(event.sender)
        if (window)
          this.closeWindow(window.id, false, result)
      }
    })

    ipcMain.on('window:minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window)
        this.minimizeWindow(window.id)
    })

    ipcMain.on('window:toggle-maximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window)
        this.toggleMaximizeWindow(window.id)
    })

    ipcMain.handle('window:count', () => this.getWindowCount())

    ipcMain.handle('window:count-by-type', (_, windowName: WindowName) =>
      this.getWindowCountByName(windowName))

    // IPC: 获取当前窗口配置信息
    ipcMain.handle('window:get-config', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        return null
      }
      const instance = this.windowInstances.get(window.id)
      if (!instance) {
        return null
      }
      const config = getWindowConfig(instance.windowName)
      if (!config) {
        return null
      }
      // 只返回必要的配置信息，避免暴露过多细节
      return {
        windowName: config.windowName,
        noLayout: config.noLayout ?? false,
        title: config.title,
      }
    })

    // IPC: 获取所有同名窗口实例列表
    ipcMain.handle('window:get-all', (_, windowName: WindowName) => {
      const instances = this.getWindowsByName(windowName)
      return instances.map((instance) => {
        const win = instance.window
        return {
          id: win.id,
          windowName: instance.windowName,
          title: win.getTitle(),
          isDestroyed: win.isDestroyed(),
          isVisible: win.isVisible(),
          isFocused: win.isFocused(),
          data: instance.data,
        }
      })
    })

    ipcMain.handle('window:get-by-id', (_, windowName: WindowName, windowId: number) => {
      const instance = this.getWindowById(windowId)
      if (!instance || instance.windowName !== windowName) {
        return null
      }
      const win = instance.window
      return {
        id: win.id,
        windowName: instance.windowName,
        title: win.getTitle(),
        isDestroyed: win.isDestroyed(),
        isVisible: win.isVisible(),
        isFocused: win.isFocused(),
        data: instance.data,
      }
    })
  }

  /**
   * 初始化应用事件处理器
   */
  private initAppHandlers(): void {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow(WindowName.MAIN)
      }
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin')
        app.quit()
    })
  }
}

export default WindowManager.getInstance
