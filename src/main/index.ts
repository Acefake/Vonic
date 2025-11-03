import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { getProductConfig } from '../config/product.config'
import { AppManager } from './app'
import { Logger } from './app/handlers/LogerManager'
import { StoreManage } from './app/handlers/storeManage'
import getWindowManager, { WindowName } from './app/handlers/window'
import { createJavaProcessManager } from './services/java-process'

const storeManage = new StoreManage()
const appManager = new AppManager()

let logger: Logger
let javaManager: ReturnType<typeof createJavaProcessManager>
let isQuitting = false

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')
  const productConfig = getProductConfig()
  logger = new Logger()

  storeManage.init()
  await logger.log('info', 'Store 初始化成功')

  // 注册所有 App 管理器的 IPC 处理器
  appManager.registerHandlers()
  await logger.log('info', 'App 管理器初始化成功，所有 IPC 处理器已注册')

  // 等待一个 tick，确保所有 IPC handlers 都注册完成
  await new Promise(resolve => setImmediate(resolve))

  // 监听窗口创建事件，添加快捷键支持
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)

    // 打包后也启用 DevTools
    if (app.isPackaged) {
      window.webContents.on('before-input-event', (event, input) => {
        if (
          (input.control && input.shift && input.key.toLowerCase() === 'i')
          || input.key === 'F12'
        ) {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
      })
    }
  })

  const windowManager = getWindowManager()
  windowManager.init()
  await logger.log('info', '窗口管理器初始化成功')

  const mainWindow = windowManager.getWindowByName(WindowName.MAIN)

  if (!mainWindow) {
    await logger.log('error', '主窗口获取失败')
    return
  }

  // 创建 Java 进程管理器
  javaManager = createJavaProcessManager({
    port: productConfig.api.port,
    jvmArgs: productConfig.java?.jvmArgs || ['-Xmx512m', '-Xms256m'],
    startupTimeout: productConfig.java?.startupTimeout,
  }, logger)

  try {
    await javaManager.start()
    await logger.log('info', 'Java 后端服务启动成功')
  }
  catch (error) {
    await logger.log('error', `Java 后端服务启动失败: ${error}`)
  }

  // 监听加载完成事件，发送启动日志
  mainWindow.webContents.on('did-finish-load', () => {
    logger.sendStartupLogsToWindow(mainWindow)
  })
})

app.on('before-quit', async (event) => {
  // 防止重复处理
  if (isQuitting)
    return

  event.preventDefault()
  isQuitting = true

  try {
    await logger.log('info', '应用退出中，关闭所有窗口...')
    const windowManager = getWindowManager()

    // 强制关闭所有窗口（包括懒加载窗口）
    windowManager.closeAllWindows(true)
    windowManager.clearLazyWindowCache()

    // 双重检查：确保所有窗口都已关闭
    const remainingWindows = BrowserWindow.getAllWindows().filter(win => !win.isDestroyed())
    if (remainingWindows.length > 0) {
      console.log(`[before-quit] 发现 ${remainingWindows.length} 个未关闭的窗口，强制关闭...`)
      remainingWindows.forEach((win) => {
        win.removeAllListeners('close')
        win.destroy()
      })
    }

    await logger.log('info', '应用退出中，停止 Java 后端服务...')
    await javaManager.stop()
    await logger.log('info', 'Java 后端服务已停止')
  }
  catch (error) {
    console.error('退出时停止 Java 服务失败:', error)
  }

  app.exit(0)
})
