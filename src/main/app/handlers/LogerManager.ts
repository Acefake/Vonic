import { existsSync } from 'node:fs'
import { appendFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, ipcMain } from 'electron'

export interface LogEntry {
  level: string
  message: string
  args?: unknown[]
  error?: string
  timestamp: string
}

/**
 * 日志管理器
 */
export class Logger {
  private logDir: string
  private logFile: string
  private startupLogs: LogEntry[] = [] // 缓存启动日志

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
    this.logFile = join(this.logDir, `app-${this.getDateString()}.log`)
    this.init()
  }

  /**
   * 初始化日志系统
   */
  private async init(): Promise<void> {
    try {
      // 创建日志目录（如果不存在）
      const dirExists = existsSync(this.logDir)
      if (!dirExists) {
        await mkdir(this.logDir, { recursive: true })
        console.log(`[INFO] 日志目录已创建: ${this.logDir}`)
      }

      // 清理旧日志（保留最近 7 天）
      await this.clearOldLogs(7)

      // 注册 IPC 监听器
      this.registerIPCHandlers()
    }
    catch (error) {
      console.error('[ERROR] 初始化日志系统失败:', error)
    }
  }

  /**
   * 注册 IPC 处理器
   */
  private registerIPCHandlers(): void {
    ipcMain.on('logger:log', async (_, logEntry: LogEntry) => {
      await this.writeLog(logEntry)
    })
  }

  /**
   * 写入日志
   * @param logEntry 日志条目
   */
  private async writeLog(logEntry: LogEntry): Promise<void> {
    try {
      const { level, message, args, error, timestamp } = logEntry
      const argsStr = args && args.length > 0 ? ` ${JSON.stringify(args)}` : ''
      const errorStr = error ? ` ${error}` : ''
      const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}${errorStr}\n`

      // 检查日期是否变化，如果变化则创建新日志文件
      const currentLogFile = join(this.logDir, `app-${this.getDateString()}.log`)
      if (currentLogFile !== this.logFile) {
        this.logFile = currentLogFile
      }

      await appendFile(this.logFile, logLine, 'utf-8')
    }
    catch (error) {
      console.error('[ERROR] 写入日志失败:', error)
    }
  }

  /**
   * 主进程日志记录（公共方法）
   * @param level 日志级别
   * @param message 日志消息
   */
  public async log(level: 'info' | 'warn' | 'error', message: any): Promise<void> {
    // 同时输出到控制台
    const consoleMessage = `[${level.toUpperCase()}] ${message}`
    switch (level) {
      case 'error':
        console.error(consoleMessage)
        break
      case 'warn':
        console.warn(consoleMessage)
        break
      case 'info':
        console.log(consoleMessage)
        break
    }

    // 写入日志文件
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }
    await this.writeLog(logEntry)

    // 广播到所有渲染进程窗口
    this.broadcastToRenderers(logEntry)
  }

  /**
   * 广播日志到所有渲染进程
   * @param logEntry 日志条目
   */
  private broadcastToRenderers(logEntry: LogEntry): void {
    const windows = BrowserWindow.getAllWindows()

    if (windows.length === 0) {
      // 如果还没有窗口，缓存日志
      this.startupLogs.push(logEntry)
    }
    else {
      for (const window of windows) {
        if (!window.isDestroyed() && window.webContents) {
          window.webContents.send('main-process-log', logEntry)
        }
      }
    }
  }

  /**
   * 发送缓存的启动日志到指定窗口
   * @param window 窗口实例
   */
  public sendStartupLogsToWindow(window: BrowserWindow): void {
    if (this.startupLogs.length > 0) {
      for (const logEntry of this.startupLogs) {
        window.webContents.send('main-process-log', logEntry)
      }
      // 清空缓存（只发送一次）
      this.startupLogs = []
    }
  }

  /**
   * 清理旧日志
   * @param daysToKeep 保留的天数
   */
  public async clearOldLogs(daysToKeep = 7): Promise<void> {
    try {
      const files = await readdir(this.logDir)
      const now = Date.now()
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000 // 转换为毫秒

      for (const file of files) {
        if (!file.startsWith('app-') || !file.endsWith('.log')) {
          continue
        }

        const filePath = join(this.logDir, file)
        const stats = await stat(filePath)
        const age = now - stats.mtime.getTime()

        if (age > maxAge) {
          await unlink(filePath)
          console.log(`[INFO] 已删除旧日志: ${file}`)
        }
      }
    }
    catch (error) {
      console.error('[ERROR] 清理旧日志失败:', error)
    }
  }

  /**
   * 获取日期字符串（YYYY-MM-DD）
   */
  private getDateString(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 获取日志目录路径
   */
  public getLogDir(): string {
    return this.logDir
  }

  /**
   * 获取当前日志文件路径
   */
  public getCurrentLogFile(): string {
    return this.logFile
  }
}
