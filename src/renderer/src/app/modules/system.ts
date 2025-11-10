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

  /**
   * 获取 CPU 核心数
   * @returns CPU 核心数
   */
  async getCPUCores(): Promise<number> {
    return window.electron.ipcRenderer.invoke('system:get-cpu-cores')
  },

  /**
   * 获取内存信息
   * @returns 内存信息对象
   */
  async getMemoryInfo(): Promise<{ freePhysicalMemoryMB: number, totalVisibleMemoryMB: number, usagePercent: number }> {
    return window.electron.ipcRenderer.invoke('system:get-memory-info')
  },

  /**
   * 获取最优并发数
   * @param baseConcurrency 基础并发数
   * @param memoryThreshold 内存阈值
   * @returns 最优并发数
   */
  async getOptimalConcurrency(baseConcurrency?: number, memoryThreshold?: number): Promise<number> {
    return window.electron.ipcRenderer.invoke('system:get-optimal-concurrency', baseConcurrency, memoryThreshold)
  },

  /**
   * 检查资源是否充足
   * @param minFreeMemoryMB 最小可用内存
   * @param maxMemoryUsagePercent 最大内存使用率
   * @returns 资源是否充足
   */
  async checkResource(minFreeMemoryMB?: number, maxMemoryUsagePercent?: number): Promise<{ sufficient: boolean, freeMemoryMB: number, usagePercent: number }> {
    return window.electron.ipcRenderer.invoke('system:check-resource', minFreeMemoryMB, maxMemoryUsagePercent)
  },
}
