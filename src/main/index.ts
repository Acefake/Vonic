import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app } from 'electron'
import { WindowName } from '@/shared/constants'
import { DebugManager } from './core/debug'
import { DialogManager } from './core/dialog'
import { FileManager } from './core/file'
import { logger, setupLogger } from './core/logger'
import { setupStore } from './core/store'
import { SystemManager } from './core/system'
import WindowManager from './core/window'

let isQuitting = false

// 单实例锁
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}
else {
  app.on('second-instance', () => {
    const mainWindow = WindowManager.getWindowByName(WindowName.MAIN)
    if (mainWindow) {
      if (mainWindow.isMinimized())
        mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  setupLogger()
  setupStore()

  new FileManager().registerHandlers()
  new DialogManager().registerHandlers()
  new SystemManager().registerHandlers()
  new DebugManager().registerHandlers()

  const PluginManager = (await import('./core/plugin')).default
  PluginManager.initHandlers()

  WindowManager.init()

  const mainWindow = WindowManager.getWindowByName(WindowName.MAIN)
  if (mainWindow) {
    mainWindow.webContents.once('did-finish-load', async () => {
      await PluginManager.activateEnabledPlugins()
    })
  }

  logger.info('App initialized')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    if (app.isPackaged) {
      window.webContents.on('before-input-event', (event, input) => {
        if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
      })
    }
  })
})

app.on('before-quit', async (event) => {
  if (isQuitting)
    return
  event.preventDefault()
  isQuitting = true

  try {
    WindowManager.closeAllWindows(true)
    app.exit(0)
  }
  catch (error) {
    console.error('退出时发生错误:', error)
    app.exit(1)
  }
})
