/**
 * 插件模块 - 使用 @vonic/plugin-electron 包
 */
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, clipboard, dialog, ipcMain, Notification, shell } from 'electron'
import { PluginManager } from '@vonic/plugin-electron'
import { logger } from '../logger'
import store from '../store'

// 创建 Electron 依赖适配器
const electronDeps = {
  app: {
    getPath: (name: string) => app.getPath(name as Parameters<typeof app.getPath>[0]),
  },
  ipcMain: {
    handle: ipcMain.handle.bind(ipcMain),
    removeHandler: ipcMain.removeHandler.bind(ipcMain),
    handleOnce: ipcMain.handleOnce.bind(ipcMain),
    removeAllListeners: ipcMain.removeAllListeners.bind(ipcMain),
  },
  dialog: {
    showOpenDialog: dialog.showOpenDialog.bind(dialog),
  },
  BrowserWindow: {
    getAllWindows: BrowserWindow.getAllWindows.bind(BrowserWindow),
    create: (options: Electron.BrowserWindowConstructorOptions) => new BrowserWindow(options),
  },
  shell: {
    openExternal: shell.openExternal.bind(shell),
  },
  clipboard: {
    readText: clipboard.readText.bind(clipboard),
    writeText: clipboard.writeText.bind(clipboard),
  },
  Notification,
}

// 创建日志适配器
const loggerAdapter = {
  info: (...args: unknown[]) => logger.info(...args),
  warn: (...args: unknown[]) => logger.warn(...args),
  error: (...args: unknown[]) => logger.error(...args),
}

// 创建存储适配器
const storageAdapter = {
  get: <T>(key: string, defaultValue?: T): T => store.get(key, defaultValue) as T,
  set: (key: string, value: unknown) => store.set(key, value),
  delete: (key: string) => store.delete(key as Parameters<typeof store.delete>[0]),
}

// 创建插件管理器实例
const pluginManager = new PluginManager({
  electron: electronDeps as any,
  logger: loggerAdapter,
  storage: storageAdapter,
  isDev: is.dev,
  rendererUrl: process.env.ELECTRON_RENDERER_URL,
  preloadPath: join(__dirname, '../preload/index.js'),
  rendererHtmlPath: join(__dirname, '../renderer/index.html'),
  devPluginsDir: is.dev ? join(__dirname, '../../../../plugins') : undefined,
})

export { pluginManager as PluginManager }
export default pluginManager

// 重新导出类型
export type {
  Plugin,
  PluginInfo,
  PluginManifest,
  PluginState,
  PluginType,
} from '@vonic/plugin-electron'
