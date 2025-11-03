/**
 * 系统信息 API
 * 获取应用和系统相关信息
 */

import type { AppInfo, SystemAPI, SystemInfo } from '../types'

/**
 * 系统信息 API 实现
 */
export const systemAPI: SystemAPI = {
  /**
   * 获取应用信息
   * @returns 应用信息对象
   */
  async getAppInfo(): Promise<AppInfo> {
    return window.electron.ipcRenderer.invoke('system:app-info')
  },

  /**
   * 获取系统信息
   * @returns 系统信息对象
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return window.electron.ipcRenderer.invoke('system:system-info')
  },

  /**
   * 获取应用程序目录（exe 同级目录）
   * @returns 应用程序目录路径
   */
  async getAppDirectory(): Promise<string> {
    return window.electron.ipcRenderer.invoke('system:app-directory')
  },

  /**
   * 重启应用
   */
  restart(): void {
    window.electron.ipcRenderer.send('app:restart')
  },

  /**
   * 退出应用
   */
  quit(): void {
    window.electron.ipcRenderer.send('app:quit')
  },
}
