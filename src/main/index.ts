import type { DoeServiceManager } from './services/runService'
import path from 'node:path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { getProductConfig } from '../config/product.config'
import { AppManager } from './app'
import { Logger } from './app/handlers/LogerManager'
import { StoreManage } from './app/handlers/storeManage'
import getWindowManager, { WindowName } from './app/handlers/window'
import { createDoeServiceManager } from './services/runService'
import { deleteOutFolder } from './utils/cleanup'
import { runExe } from './utils/exeRunner'
import { killProcessesOnPorts } from './utils/portCleanup'

const storeManage = new StoreManage()
const appManager = new AppManager()

let logger: Logger
let serviceManager: DoeServiceManager
let isQuitting = false

// 单实例锁：只允许启动一个应用实例
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  // 如果无法获取锁，说明已有实例在运行，直接退出当前进程
  app.quit()
}
else {
  // 当用户尝试启动第二个实例时，聚焦现有窗口
  app.on('second-instance', () => {
    const windowManager = getWindowManager()
    const mainWindow = windowManager.getWindowByName(WindowName.MAIN)
    if (mainWindow) {
      if (mainWindow.isMinimized())
        mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

const vueDevToolsPath = path.resolve(__dirname, '../../extension/nhdogjmejiglipccpnnnanhbledajbpd/7.7.7_0')

ipcMain.handle('call-exe', async (_, exeName, workingDir) => {
  console.log('主进程接收到调用请求，exe名称：', exeName, '工作目录：', workingDir)
  const result = await runExe(exeName, workingDir) // 调用exe并等待结果
  return result
})

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')
  const productConfig = getProductConfig()
  logger = new Logger()

  // 加载 Vue DevTools 扩展（仅在开发环境或非打包环境）
  if (!app.isPackaged) {
    try {
      await session.defaultSession.loadExtension(vueDevToolsPath)
      await logger.log('info', 'Vue DevTools 扩展加载成功')
    }
    catch (error) {
      await logger.log('warn', `Vue DevTools 扩展加载失败: ${error}`)
      console.warn('Failed to load Vue DevTools extension:', error)
    }
  }

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

  const mainWindow = windowManager.getWindowByName(WindowName.MAIN)

  if (!mainWindow) {
    await logger.log('error', '主窗口获取失败')
    return
  }

  // 创建服务管理器
  serviceManager = createDoeServiceManager({
    port: productConfig.doe?.port || 25504,
    startupTimeout: productConfig.doe?.startupTimeout || 30000,
    enabled: productConfig.doe?.enabled !== false, // 默认启用
    autoCleanupPort: true, // 启用自动端口清理
    forceKillProcesses: false, // 不强制终止进程
  }, logger)

  try {
    await serviceManager.start()
    await logger.log('info', 'DOE 服务启动成功')
  }
  catch (error) {
    await logger.log('error', `DOE 服务启动失败: ${error}`)
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

    await logger.log('info', '应用退出中，停止 DOE 服务...')
    await serviceManager.stop()
    await logger.log('info', 'DOE 服务已停止')

    // 清理所有占用的端口（Java 和前端）
    if (logger) {
      await logger.log('info', '应用退出中，清理所有占用的端口...')
    }
    const productConfig = getProductConfig()
    const portsToClean: number[] = []

    // 添加 Java DOE 服务端口
    if (productConfig.doe?.port) {
      portsToClean.push(productConfig.doe.port)
    }

    // 添加前端 API 端口
    if (productConfig.api?.port) {
      portsToClean.push(productConfig.api.port)
    }

    // 清理端口
    if (portsToClean.length > 0) {
      await killProcessesOnPorts(portsToClean, logger)
    }
    else if (logger) {
      await logger.log('info', '没有需要清理的端口')
    }

    // 删除 out 输出目录
    await logger.log('info', '应用退出中，删除输出目录 out...')
    await deleteOutFolder(logger)
  }
  catch (error) {
    console.error('退出时停止 DOE 服务失败:', error)
  }

  app.exit(0)
})
