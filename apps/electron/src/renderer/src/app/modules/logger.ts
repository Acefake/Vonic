import type { LoggerAPI } from '../types'
import { getIPCRenderer, isElectron } from '../platform'

const ipc = getIPCRenderer()

export const loggerAPI: LoggerAPI = {
  /**
   * 普通日志
   * @param message 日志消息
   * @param args 额外参数
   */
  log(message: string, ...args: unknown[]): void {
    console.log(`[LOG] ${message}`, ...args)
    // 发送到主进程持久化
    if (isElectron) {
      ipc.send('logger:log', {
        level: 'log',
        message,
        args,
        timestamp: new Date().toISOString(),
      })
    }
  },

  /**
   * 调试日志（仅开发环境）
   * @param message 日志消息
   * @param args 额外参数
   */
  debug(message: string, ...args: unknown[]): void {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  },

  /**
   * 信息日志
   * @param message 日志消息
   * @param args 额外参数
   */
  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args)
    if (isElectron) {
      ipc.send('logger:log', {
        level: 'info',
        message,
        args,
        timestamp: new Date().toISOString(),
      })
    }
  },

  /**
   * 警告日志
   * @param message 日志消息
   * @param args 额外参数
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args)
    if (isElectron) {
      ipc.send('logger:log', {
        level: 'warn',
        message,
        args,
        timestamp: new Date().toISOString(),
      })
    }
  },

  /**
   * 错误日志
   * @param message 错误消息
   * @param error 错误对象
   * @param args 额外参数
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, error, ...args)
    if (isElectron) {
      ipc.send('logger:log', {
        level: 'error',
        message,
        error: error instanceof Error ? error.stack : String(error),
        args,
        timestamp: new Date().toISOString(),
      })
    }
  },

  /**
   * 性能监控
   * @param label 监控标签
   * @param fn 要监控的函数
   */
  async performance(label: string, fn: () => void | Promise<void>): Promise<void> {
    const start = performance.now()
    try {
      await fn()
    }
    finally {
      const duration = performance.now() - start
      console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`)
      if (isElectron) {
        ipc.send('logger:log', {
          level: 'performance',
          message: `${label}: ${duration.toFixed(2)}ms`,
          args: [{ label, duration }],
          timestamp: new Date().toISOString(),
        })
      }
    }
  },
}
