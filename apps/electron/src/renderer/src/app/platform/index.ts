/**
 * 平台适配层
 * 根据运行环境自动选择 Electron 或 Web 实现
 */

/** 是否在 Electron 环境中运行 */
export const isElectron = typeof window !== 'undefined' && 'electron' in window && !!(window as any).electron

/** 平台类型 */
export type Platform = 'electron' | 'web'

/** 当前平台 */
export const platform: Platform = isElectron ? 'electron' : 'web'

/** IPC 渲染进程接口 */
export interface IPCRenderer {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  send: (channel: string, ...args: unknown[]) => void
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
  off: (channel: string, listener: (...args: unknown[]) => void) => void
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
}

/** Web 端 IPC 模拟实现 */
class WebIPCRenderer implements IPCRenderer {
  private handlers = new Map<string, Set<(...args: unknown[]) => void>>()

  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    console.warn(`[Web] IPC invoke not available: ${channel}`, args)
    return null
  }

  send(channel: string, ...args: unknown[]): void {
    console.warn(`[Web] IPC send not available: ${channel}`, args)
  }

  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
    }
    this.handlers.get(channel)!.add(listener)
  }

  off(channel: string, listener: (...args: unknown[]) => void): void {
    this.handlers.get(channel)?.delete(listener)
  }

  removeListener(channel: string, listener: (...args: unknown[]) => void): void {
    this.off(channel, listener)
  }

  emit(channel: string, ...args: unknown[]): void {
    this.handlers.get(channel)?.forEach(listener => listener({}, ...args))
  }
}

/** Web 端 IPC 实例（单例） */
const webIPCRenderer = new WebIPCRenderer()

/** 获取 IPC 渲染进程实例 */
export function getIPCRenderer(): IPCRenderer {
  if (isElectron) {
    return (window as any).electron.ipcRenderer as IPCRenderer
  }
  return webIPCRenderer
}

/** 导出 Web IPC 实例供外部触发事件 */
export { webIPCRenderer }
