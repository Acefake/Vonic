/**
 * 系统信息 API
 * 获取应用和系统相关信息
 */

import type { AppInfo, SystemAPI, SystemInfo } from '../types'
import { getIPCRenderer } from '../platform'

const ipc = getIPCRenderer()

/**
 * 系统信息 API 实现
 */
export const systemAPI: SystemAPI = {
  /**
   * 获取应用信息
   * @returns 应用信息对象
   */
  async getAppInfo(): Promise<AppInfo> {
    return ipc.invoke('system:app-info') as Promise<AppInfo>
  },

  /**
   * 获取系统信息
   * @returns 系统信息对象
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return ipc.invoke('system:system-info') as Promise<SystemInfo>
  },

  /**
   * 获取应用程序目录（exe 同级目录）
   * @returns 应用程序目录路径
   */
  async getAppDirectory(): Promise<string> {
    return ipc.invoke('system:app-directory') as Promise<string>
  },

  /**
   * 重启应用
   */
  restart(): void {
    ipc.send('app:restart')
  },

  /**
   * 退出应用
   */
  quit(): void {
    ipc.send('app:quit')
  },
}
