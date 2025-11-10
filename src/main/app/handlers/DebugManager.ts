import type { MemoryUsage } from '../types'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

export class DebugManager {
  registerHandlers(): void {
    ipcMain.on('debug:reload', this.reload.bind(this))
    ipcMain.on('debug:force-reload', this.forceReload.bind(this))
    ipcMain.handle('debug:memory-usage', this.getMemoryUsage.bind(this))
    ipcMain.on('debug:performance-monitor', this.performanceMonitor.bind(this))
    ipcMain.handle('debug:clear-cache', this.clearCache.bind(this))
    ipcMain.handle('debug:export-logs', this.exportLogs.bind(this))
    ipcMain.handle('debug:open-log-directory', this.openLogDirectory.bind(this))
  }

  /**
   * 重新加载窗口
   * @param event IPC 事件对象
   */
  private reload(event: Electron.IpcMainEvent): void {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.webContents.reload()
    }
  }

  /**
   * 强制重新加载窗口（忽略缓存）
   * @param event IPC 事件对象
   */
  private forceReload(event: Electron.IpcMainEvent): void {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.webContents.reloadIgnoringCache()
    }
  }

  /**
   * 获取内存使用情况
   * @returns 内存使用信息
   */
  private async getMemoryUsage(): Promise<MemoryUsage> {
    const processMemory = process.memoryUsage()

    // 获取系统内存信息
    let systemTotal = 0
    let systemFree = 0

    try {
      const { totalmem, freemem } = await import('node:os')
      systemTotal = totalmem()
      systemFree = freemem()
    }
    catch (error) {
      console.error('获取系统内存信息失败:', error)
    }

    return {
      total: systemTotal,
      used: processMemory.heapUsed,
      available: systemFree,
      rss: processMemory.rss,
      heapTotal: processMemory.heapTotal,
      heapUsed: processMemory.heapUsed,
      external: processMemory.external,
    }
  }

  /**
   * 性能监控
   * @param event IPC 事件对象
   * @param enabled 是否启用
   */
  private performanceMonitor(event: Electron.IpcMainEvent, enabled: boolean): void {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      if (enabled) {
        // 启用性能监控
        // 可以在这里添加性能监控逻辑
      }
      else {
        // 禁用性能监控
      }
    }
  }

  /**
   * 清除缓存
   * @param event IPC 事件对象
   */
  private async clearCache(event: Electron.IpcMainInvokeEvent): Promise<void> {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      const session = window.webContents.session
      await session.clearCache()
      await session.clearStorageData()
    }
  }

  /**
   * 导出日志
   * @returns 导出的日志文件路径，取消则返回 null
   */
  private async exportLogs(): Promise<string | null> {
    const logDir = join(app.getPath('userData'), 'logs')

    try {
      const files = await readdir(logDir)
      const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse()

      if (logFiles.length === 0) {
        return null
      }

      // 选择保存位置
      const result = await dialog.showSaveDialog({
        title: '导出日志',
        defaultPath: `tianjin-app-logs-${new Date().toISOString().split('T')[0]}.log`,
        filters: [
          { name: '日志文件', extensions: ['log'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      // 合并最近的日志文件
      const latestLogs = logFiles.slice(0, 3) // 最近 3 天
      let combinedLogs = ''

      for (const file of latestLogs) {
        const content = await readFile(join(logDir, file), 'utf-8')
        combinedLogs += `\n========== ${file} ==========\n${content}\n`
      }

      await writeFile(result.filePath, combinedLogs, 'utf-8')

      return result.filePath
    }
    catch (error) {
      throw new Error(`导出日志失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 打开日志目录
   */
  private async openLogDirectory(): Promise<void> {
    const logDir = join(app.getPath('userData'), 'logs')
    try {
      // 在文件管理器中显示日志目录
      await shell.openPath(logDir)
    }
    catch (error) {
      throw new Error(`打开日志目录失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
