import { exec } from 'node:child_process'
import os from 'node:os'

/**
 * 系统资源监控工具
 */
export class SystemMonitor {
  /**
   * 获取 CPU 核心数
   */
  static getCPUCores(): number {
    return os.cpus().length
  }

  /**
   * 获取系统总内存（MB）
   */
  static getTotalMemoryMB(): number {
    return Math.floor(os.totalmem() / 1024 / 1024)
  }

  /**
   * 获取空闲内存（MB）
   */
  static getFreeMemoryMB(): number {
    return Math.floor(os.freemem() / 1024 / 1024)
  }

  /**
   * 获取内存使用率（百分比）
   */
  static getMemoryUsagePercent(): number {
    const total = os.totalmem()
    const free = os.freemem()
    return ((total - free) / total) * 100
  }

  /**
   * 获取详细的 Windows 内存信息（仅 Windows）
   */
  static async getWindowsMemoryInfo(): Promise<{
    freePhysicalMemoryMB: number
    totalVisibleMemoryMB: number
    usagePercent: number
  }> {
    if (process.platform !== 'win32') {
      return {
        freePhysicalMemoryMB: SystemMonitor.getFreeMemoryMB(),
        totalVisibleMemoryMB: SystemMonitor.getTotalMemoryMB(),
        usagePercent: SystemMonitor.getMemoryUsagePercent(),
      }
    }

    return new Promise((resolve) => {
      exec('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /value', (error, stdout) => {
        if (error) {
          resolve({
            freePhysicalMemoryMB: SystemMonitor.getFreeMemoryMB(),
            totalVisibleMemoryMB: SystemMonitor.getTotalMemoryMB(),
            usagePercent: SystemMonitor.getMemoryUsagePercent(),
          })
          return
        }

        const lines = stdout.trim().split('\n')
        let freeMemoryKB = 0
        let totalMemoryKB = 0

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('FreePhysicalMemory=')) {
            freeMemoryKB = Number.parseInt(trimmedLine.split('=')[1])
          }
          else if (trimmedLine.startsWith('TotalVisibleMemorySize=')) {
            totalMemoryKB = Number.parseInt(trimmedLine.split('=')[1])
          }
        }

        const freeMemoryMB = Math.floor(freeMemoryKB / 1024)
        const totalMemoryMB = Math.floor(totalMemoryKB / 1024)
        const usagePercent = ((totalMemoryMB - freeMemoryMB) / totalMemoryMB) * 100

        resolve({
          freePhysicalMemoryMB: freeMemoryMB,
          totalVisibleMemoryMB: totalMemoryMB,
          usagePercent,
        })
      })
    })
  }

  /**
   * 检查系统资源是否充足
   * @param minFreeMemoryMB 最小空闲内存（MB）
   * @param maxMemoryUsagePercent 最大内存使用率（百分比）
   */
  static async isResourceSufficient(
    minFreeMemoryMB: number = 1000,
    maxMemoryUsagePercent: number = 90,
  ): Promise<{ sufficient: boolean, freeMemoryMB: number, usagePercent: number }> {
    const memInfo = await SystemMonitor.getWindowsMemoryInfo()

    const sufficient
      = memInfo.freePhysicalMemoryMB >= minFreeMemoryMB
        && memInfo.usagePercent <= maxMemoryUsagePercent

    return {
      sufficient,
      freeMemoryMB: memInfo.freePhysicalMemoryMB,
      usagePercent: memInfo.usagePercent,
    }
  }

  /**
   * 获取建议的最优并发数
   * @param baseConcurrency 基础并发数（通常基于 CPU 核心数）
   * @param memoryThreshold 内存阈值检查
   */
  static async getOptimalConcurrency(
    baseConcurrency?: number,
    memoryThreshold: number = 1000,
  ): Promise<number> {
    const cpuCores = SystemMonitor.getCPUCores()
    const base = baseConcurrency || Math.max(2, Math.floor(cpuCores * 0.6))

    const resourceCheck = await SystemMonitor.isResourceSufficient(memoryThreshold, 85)

    if (!resourceCheck.sufficient) {
      // 内存不足，减少并发数
      return Math.max(1, Math.floor(base * 0.5))
    }

    return base
  }
}
