/**
 * 性能监控工具（渲染进程端）
 */

/**
 * 执行时间统计
 */
export class ExecutionTimeTracker {
  private executionTimes: number[] = []
  private readonly maxHistorySize: number = 100

  /**
   * 记录执行时间
   */
  addTime(timeMs: number): void {
    this.executionTimes.push(timeMs)
    if (this.executionTimes.length > this.maxHistorySize) {
      this.executionTimes.shift()
    }
  }

  /**
   * 获取平均执行时间
   */
  getAverageTime(): number {
    if (this.executionTimes.length === 0)
      return 0
    return this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
  }

  /**
   * 获取最小执行时间
   */
  getMinTime(): number {
    if (this.executionTimes.length === 0)
      return 0
    return Math.min(...this.executionTimes)
  }

  /**
   * 获取最大执行时间
   */
  getMaxTime(): number {
    if (this.executionTimes.length === 0)
      return 0
    return Math.max(...this.executionTimes)
  }

  /**
   * 获取中位数执行时间
   */
  getMedianTime(): number {
    if (this.executionTimes.length === 0)
      return 0

    const sorted = [...this.executionTimes].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  /**
   * 获取自适应超时时间
   * @param multiplier 超时倍数（默认为平均时间的2倍）
   * @param minTimeout 最小超时时间（毫秒）
   * @param maxTimeout 最大超时时间（毫秒）
   */
  getAdaptiveTimeout(
    multiplier: number = 2,
    minTimeout: number = 60000,
    maxTimeout: number = 180000,
  ): number {
    const avgTime = this.getAverageTime()
    if (avgTime === 0)
      return maxTimeout

    const timeout = avgTime * multiplier
    return Math.min(maxTimeout, Math.max(minTimeout, timeout))
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    count: number
    average: number
    min: number
    max: number
    median: number
  } {
    return {
      count: this.executionTimes.length,
      average: this.getAverageTime(),
      min: this.getMinTime(),
      max: this.getMaxTime(),
      median: this.getMedianTime(),
    }
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.executionTimes = []
  }
}

/**
 * 获取 CPU 核心数
 */
export function getCPUCores(): number {
  return navigator.hardwareConcurrency || 4
}

/**
 * 获取最优批处理大小
 * @param ratio CPU 核心使用率（0-1之间，默认0.6）
 * @param min 最小批处理大小
 * @param max 最大批处理大小
 */
export function getOptimalBatchSize(
  ratio: number = 0.6,
  min: number = 2,
  max: number = 16,
): number {
  const cores = getCPUCores()
  const calculated = Math.floor(cores * ratio)
  return Math.max(min, Math.min(max, calculated))
}

/**
 * 格式化时间（毫秒转可读格式）
 */
export function formatDuration(ms: number): string {
  if (ms < 1000)
    return `${ms.toFixed(0)}ms`
  if (ms < 60000)
    return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000)
    return `${(ms / 60000).toFixed(1)}min`
  return `${(ms / 3600000).toFixed(1)}h`
}
