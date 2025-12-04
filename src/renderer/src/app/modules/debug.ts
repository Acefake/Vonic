import type { DebugAPI, DevToolsOptions, MemoryUsage, PerformanceInfo } from '../types'

/**
 * 获取 FPS（帧率）
 */
function getFPS(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const startTime = performance.now()

    function countFrame(): void {
      frames++
      const elapsed = performance.now() - startTime

      if (elapsed < 1000) {
        requestAnimationFrame(countFrame)
      }
      else {
        resolve(Math.round(frames / (elapsed / 1000)))
      }
    }

    requestAnimationFrame(countFrame)
  })
}

/**
 * Debug API 实现
 */
export const debugAPI: DebugAPI = {
  /**
   * 打开开发者工具
   */
  openDevTools(options?: DevToolsOptions): void {
    window.electron.ipcRenderer.send('debug:open-devtools', options)
  },

  /**
   * 关闭开发者工具
   */
  closeDevTools(): void {
    window.electron.ipcRenderer.send('debug:close-devtools')
  },

  /**
   * 重新加载窗口
   */
  reload(): void {
    window.electron.ipcRenderer.send('debug:reload')
  },

  /**
   * 强制重新加载（清除缓存）
   */
  forceReload(): void {
    window.electron.ipcRenderer.send('debug:force-reload')
  },

  /**
   * 获取性能信息
   */
  async getPerformance(): Promise<PerformanceInfo> {
    // 使用浏览器 Performance API
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    // 获取 FPS
    const fps = await getFPS()

    return {
      fps,
      cpuUsage: 0,
      renderTime: perfData?.domContentLoadedEventEnd - perfData?.domContentLoadedEventStart || 0,
      scriptTime: perfData?.domInteractive - perfData?.fetchStart || 0,
      layoutTime: perfData?.domComplete - perfData?.domInteractive || 0,
    }
  },

  /**
   * 获取内存使用情况
   */
  async getMemoryUsage(): Promise<MemoryUsage> {
    const processMemory = await window.electron.ipcRenderer.invoke('debug:memory-usage')

    // 浏览器内存信息
    const perf = window.performance as Performance & {
      memory?: {
        usedJSHeapSize: number
        jsHeapSizeLimit: number
      }
    }
    const memory = perf.memory || { usedJSHeapSize: 0, jsHeapSizeLimit: 0 }

    return {
      total: processMemory.total,
      used: processMemory.used,
      jsHeapSize: memory.usedJSHeapSize || 0,
      jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
      availableMemory: processMemory.available,
    }
  },

  /**
   * 开启/关闭性能监控
   */
  togglePerformanceMonitor(enabled: boolean): void {
    window.electron.ipcRenderer.send('debug:performance-monitor', enabled)
  },

  /**
   * 清除应用缓存
   */
  async clearCache(): Promise<void> {
    await window.electron.ipcRenderer.invoke('debug:clear-cache')
  },

  /**
   * 清除本地存储
   */
  async clearStorage(): Promise<void> {
    localStorage.clear()
    sessionStorage.clear()
  },

  /**
   * 导出日志
   */
  async exportLogs(): Promise<string | null> {
    return window.electron.ipcRenderer.invoke('debug:export-logs')
  },

  /**
   * 打开日志目录
   */
  async openLogDirectory(): Promise<void> {
    await window.electron.ipcRenderer.invoke('debug:open-log-directory')
  },

  /**
   * 显示应用信息
   */
  async showAppInfo(): Promise<void> {
    const appInfo = await window.electron.ipcRenderer.invoke('system:app-info')
    const memoryUsage = await this.getMemoryUsage()
    const performance = await this.getPerformance()

    console.group('[App Debug Info]')
    console.log('应用版本:', appInfo.version)
    console.log('Electron 版本:', appInfo.electronVersion)
    console.log('Chrome 版本:', appInfo.chromeVersion)
    console.log('Node 版本:', appInfo.nodeVersion)
    console.log('平台:', appInfo.platform)
    console.log('架构:', appInfo.arch)
    console.log('内存使用:', `${(memoryUsage.used / 1024 / 1024).toFixed(2)} MB`)
    console.log('JS 堆使用:', `${(memoryUsage.jsHeapSize / 1024 / 1024).toFixed(2)} MB`)
    console.log('FPS:', performance.fps)
    console.groupEnd()
  },
}
